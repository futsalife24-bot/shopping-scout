import { useEffect, useMemo, useRef, useState } from 'react';
import { applyOcrEvidence, calculateUnitMetrics, parseLabelText } from '@/features/product';
import { cropAndRotate, inspectImageQuality, loadImage, prepareImageForEditing, type CropRect, type ImageQuality } from '@/features/ocr/imageTools';
import { recognizeLabel, terminateOcrWorker } from '@/features/ocr/tesseractClient';
import { findExactProductMatches, saveNewRecord } from '@/features/storage';
import type { ParsedLabel, PriceObservation, Product } from '@/types/commerce';

type Step = 'home' | 'capture' | 'crop' | 'ocr' | 'confirm' | 'saved';

interface ConfirmForm {
  name: string;
  manufacturer: string;
  storeName: string;
  storeProductCode: string;
  janCode: string;
  currentPrice: string;
  regularPrice: string;
  discountAmount: string;
  rawText: string;
}

const emptyForm: ConfirmForm = {
  name: '', manufacturer: '', storeName: '', storeProductCode: '', janCode: '',
  currentPrice: '', regularPrice: '', discountAmount: '', rawText: ''
};

function createId(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toOptionalYen(value: string): number | undefined {
  const parsed = Number(value.replace(/[￥¥,\s]/g, ''));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function toForm(parsed: ParsedLabel, rawText: string): ConfirmForm {
  return {
    ...emptyForm,
    name: parsed.productName ?? '',
    currentPrice: parsed.currentPrice?.toString() ?? '',
    regularPrice: parsed.regularPrice?.toString() ?? '',
    discountAmount: parsed.discountAmount?.toString() ?? '',
    rawText
  };
}

function applyForm(parsed: ParsedLabel, form: ConfirmForm): ParsedLabel {
  return {
    ...parsed,
    rawText: form.rawText,
    productName: form.name.trim() || undefined,
    currentPrice: toOptionalYen(form.currentPrice),
    regularPrice: toOptionalYen(form.regularPrice),
    discountAmount: toOptionalYen(form.discountAmount)
  };
}

function formatYen(value: number | undefined, digits = 2): string | undefined {
  if (value === undefined) return undefined;
  return `${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: digits }).format(value)}円`;
}

export function App() {
  const [step, setStep] = useState<Step>('home');
  const [sourceImage, setSourceImage] = useState<string>();
  const [croppedImage, setCroppedImage] = useState<string>();
  const [quality, setQuality] = useState<ImageQuality>();
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, width: 1, height: 1 });
  const [rotation, setRotation] = useState(0);
  const [progress, setProgress] = useState({ value: 0, label: '準備中' });
  const [parsed, setParsed] = useState<ParsedLabel>();
  const [form, setForm] = useState<ConfirmForm>(emptyForm);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [savedAt, setSavedAt] = useState<string>();
  const [exactMatchCount, setExactMatchCount] = useState<number>();
  const [timing, setTiming] = useState<{ preprocessingMs: number; workerWarmupMs: number; ocrMs: number; parsingMs: number }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const streamRef = useRef<MediaStream>();
  const cameraRequestRef = useRef(0);

  const confirmed = useMemo(() => parsed ? applyForm(parsed, form) : undefined, [parsed, form]);
  const metrics = useMemo(() => confirmed ? calculateUnitMetrics(confirmed) : undefined, [confirmed]);

  const stopCamera = () => {
    cameraRequestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = undefined;
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => () => {
    stopCamera();
    void terminateOcrWorker();
  }, []);

  const startCamera = async () => {
    setError(undefined);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('この端末ではカメラを使えません。画像を選んで続けてください。');
      return;
    }
    setStep('capture');
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920, max: 2560 }, height: { ideal: 1080, max: 1440 } },
        audio: false
      });
      if (cameraRequestRef.current !== requestId || !videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    } catch {
      if (cameraRequestRef.current === requestId) {
        stopCamera();
        setError('カメラを開始できませんでした。許可を確認するか、画像を選んでください。');
        setStep('home');
      }
    }
  };

  const setImageForCrop = async (dataUrl: string) => {
    try {
      const image = await loadImage(dataUrl);
      setSourceImage(dataUrl);
      setCroppedImage(undefined);
      setQuality(inspectImageQuality(image));
      setRotation(0);
      setStep('crop');
    } catch {
      setError('画像を読み込めませんでした。別の画像を選んでください。');
      setStep('home');
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) {
      setError('カメラ映像の準備中です。少し待ってから撮影してください。');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    stopCamera();
    await setImageForCrop(canvas.toDataURL('image/jpeg', 0.92));
  };

  const selectImage = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('画像ファイルを選んでください。');
      return;
    }
    try {
      await setImageForCrop(await prepareImageForEditing(file));
    } catch {
      setError('画像を読み込めませんでした。20MB以下の別の画像を選んでください。');
    }
  };

  const initialiseCrop = () => {
    const image = imageRef.current;
    if (!image) return;
    const width = image.width;
    const height = image.height;
    setCrop({ x: width * 0.06, y: height * 0.12, width: width * 0.88, height: height * 0.76 });
  };

  const runOcr = async () => {
    if (!sourceImage) return;
    setError(undefined);
    setStep('ocr');
    setProgress({ value: 0.03, label: '切り抜きを準備中' });
    try {
      const cropSource = await cropAndRotate(sourceImage, crop, rotation);
      setCroppedImage(cropSource);
      const result = await recognizeLabel(cropSource, (value, label) => setProgress({ value, label }));
      const parseStartedAt = performance.now();
      const nextParsed = applyOcrEvidence(parseLabelText(result.text), result.lines);
      const parsingMs = Math.round(performance.now() - parseStartedAt);
      setParsed(nextParsed);
      setForm(toForm(nextParsed, result.text));
      setTiming({ ...result.timing, parsingMs });
      setStep('confirm');
    } catch {
      setError('文字を読み取れませんでした。画像を撮り直すか、内容を手入力してください。初回は通信できる場所でOCRモデルを取得してください。');
      setStep('crop');
    }
  };

  const reanalyze = () => {
    const parseStartedAt = performance.now();
    const nextParsed = parseLabelText(form.rawText);
    setParsed(nextParsed);
    setForm((current) => ({ ...toForm(nextParsed, current.rawText), ...current, name: current.name || nextParsed.productName || '' }));
    setTiming((current) => current ? { ...current, parsingMs: Math.round(performance.now() - parseStartedAt) } : current);
  };

  const startManualEntry = () => {
    const nextParsed = parseLabelText('');
    setParsed(nextParsed);
    setForm(toForm(nextParsed, ''));
    setStep('confirm');
  };

  const checkExactMatch = async () => {
    const matches = await findExactProductMatches({ janCode: form.janCode || undefined, storeName: form.storeName || undefined, storeProductCode: form.storeProductCode || undefined });
    setExactMatchCount(matches.length);
  };

  const save = async () => {
    if (!confirmed || !metrics || !confirmed.currentPrice) {
      setError('現在価格を整数の円で入力してください。ほかの候補も確認してから保存できます。');
      return;
    }
    if (
      confirmed.regularPrice !== undefined
      && confirmed.discountAmount !== undefined
      && confirmed.regularPrice - confirmed.discountAmount !== confirmed.currentPrice
    ) {
      setError('通常価格・割引額・現在価格が一致していません。値札を確認して修正してください。');
      return;
    }
    setError(undefined);
    const now = new Date().toISOString();
    const product: Product = {
      id: createId(),
      canonicalName: confirmed.productName || '名称未確認の商品',
      manufacturer: form.manufacturer.trim() || undefined,
      janCode: form.janCode.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };
    const observation: PriceObservation = {
      id: createId(),
      productId: product.id,
      storeName: form.storeName.trim() || undefined,
      storeProductCode: form.storeProductCode.trim() || undefined,
      capturedAt: now,
      currentPrice: confirmed.currentPrice,
      regularPrice: confirmed.regularPrice,
      discountAmount: confirmed.discountAmount,
      packageSnapshot: { rawText: form.rawText, parsed: confirmed.packageSpec },
      derivedMetrics: metrics,
      ocrRawText: form.rawText,
      ocrConfidence: parsed?.confidence.score,
      userConfirmed: true
    };
    try {
      await saveNewRecord({ product, observation });
      setSavedAt(now);
      setStep('saved');
    } catch {
      setError('端末への保存に失敗しました。ブラウザのサイトデータ設定を確認して、もう一度試してください。');
    }
  };

  const reset = () => {
    stopCamera();
    setStep('home'); setSourceImage(undefined); setCroppedImage(undefined); setParsed(undefined);
    setForm(emptyForm); setError(undefined); setNotice(undefined); setExactMatchCount(undefined); setTiming(undefined);
  };

  const update = (key: keyof ConfirmForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <main className="page">
      <header className="app-header"><span className="eyebrow">LOCAL PRICE HISTORY</span><h1>買い物スカウター</h1><p>値札を記録して、自分だけの価格履歴を育てよう。</p></header>
      {error && <div className="notice error" role="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      {step === 'home' && <section className="card home-card">
        <h2>値札を記録する</h2><p>OCRの結果は自動保存しません。価格・容量・個数を確認してから端末に保存します。</p>
        <div className="home-actions"><button className="button primary" onClick={() => void startCamera()}>値札を撮る</button><label className="button secondary">画像を選ぶ<input type="file" accept="image/*" capture="environment" onChange={(event) => void selectImage(event.target.files?.[0])} /></label></div>
        <p className="muted">画像は原則として端末の外へ送信しません。初回OCRモデル取得時だけ通信が必要な場合があります。</p>
      </section>}

      {step === 'capture' && <section className="capture-view"><video ref={videoRef} className="camera" playsInline muted /><div className="guide-frame" aria-hidden="true" /><p>値札全体が枠に入るように合わせてください。</p><div className="bottom-actions"><button className="button secondary" onClick={reset}>やめる</button><button className="button primary" onClick={() => void capture()}>撮影する</button></div></section>}

      {step === 'crop' && sourceImage && <section className="card crop-card"><h2>値札だけを囲む</h2><p>文字が読みやすい範囲に調整してください。保存する画像はこの範囲だけです。</p><div className="image-stage"><img ref={imageRef} src={sourceImage} onLoad={initialiseCrop} alt="選択した値札" /><div className="crop-frame" style={{ left: crop.x, top: crop.y, width: crop.width, height: crop.height }} /></div>{quality?.message && <div className="notice">{quality.message}</div>}<div className="crop-controls"><label>左右 <input type="range" min="0" max={Math.max(0, (imageRef.current?.width ?? 1) - crop.width)} value={crop.x} onChange={(event) => setCrop((current) => ({ ...current, x: Number(event.target.value) }))} /></label><label>上下 <input type="range" min="0" max={Math.max(0, (imageRef.current?.height ?? 1) - crop.height)} value={crop.y} onChange={(event) => setCrop((current) => ({ ...current, y: Number(event.target.value) }))} /></label><label>横幅 <input type="range" min="80" max={imageRef.current?.width ?? 1} value={crop.width} onChange={(event) => setCrop((current) => ({ ...current, width: Number(event.target.value) }))} /></label><label>縦幅 <input type="range" min="80" max={imageRef.current?.height ?? 1} value={crop.height} onChange={(event) => setCrop((current) => ({ ...current, height: Number(event.target.value) }))} /></label></div><div className="bottom-actions"><button className="button secondary" onClick={() => setRotation((value) => (value + 90) % 360)}>90°回転</button><button className="button primary" onClick={() => void runOcr()}>文字を読み取る</button></div><div className="recovery-actions"><button className="text-button" onClick={startManualEntry}>手入力で続ける</button><button className="text-button" onClick={reset}>中止する</button></div></section>}

      {step === 'ocr' && <section className="card processing"><h2>文字を読み取っています</h2>{croppedImage && <img src={croppedImage} alt="OCR対象の値札" />}<progress value={progress.value} max="1" /><p>{progress.label}</p><p className="muted">画面を閉じずにお待ちください。初回はモデル取得を含むため時間がかかることがあります。</p></section>}

      {step === 'confirm' && confirmed && metrics && <section className="card confirm"><h2>内容を確認する</h2><p>候補をそのまま確定せず、値札と照らし合わせて直してください。</p><div className="form-grid"><label>商品名<input value={form.name} onChange={(event) => update('name', event.target.value)} placeholder="商品名を入力" /></label><label>メーカー<input value={form.manufacturer} onChange={(event) => update('manufacturer', event.target.value)} /></label><label>現在価格（円）<input inputMode="numeric" value={form.currentPrice} onChange={(event) => update('currentPrice', event.target.value)} /></label><label>通常価格（円）<input inputMode="numeric" value={form.regularPrice} onChange={(event) => update('regularPrice', event.target.value)} /></label><label>割引額（円）<input inputMode="numeric" value={form.discountAmount} onChange={(event) => update('discountAmount', event.target.value)} /></label><label>店舗名<input value={form.storeName} onChange={(event) => update('storeName', event.target.value)} /></label><label>店舗の商品番号<input value={form.storeProductCode} onChange={(event) => update('storeProductCode', event.target.value)} /></label><label>JANコード<input inputMode="numeric" value={form.janCode} onChange={(event) => update('janCode', event.target.value)} /></label></div><label className="wide-label">読み取り結果・容量表記（ここを直して再解析できます）<textarea rows={7} value={form.rawText} onChange={(event) => update('rawText', event.target.value)} /></label><button className="text-button" onClick={reanalyze}>この内容で容量・個数を再解析</button><button className="text-button" onClick={() => void checkExactMatch()}>同じ商品を確認</button>{exactMatchCount !== undefined && <p className="muted">完全一致の履歴: {exactMatchCount}件。曖昧な商品名では自動統合しません。</p>}<section className="metrics"><h3>計算結果</h3><dl>{metrics.itemCount && <><dt>個数</dt><dd>{metrics.itemCount}個</dd></>}{metrics.rollCount && <><dt>ロール数</dt><dd>{metrics.rollCount}ロール</dd></>}{metrics.servingCount && <><dt>食数</dt><dd>{metrics.servingCount}食</dd></>}{metrics.ply && <><dt>紙の重ね</dt><dd>{metrics.ply}PLY</dd></>}{metrics.totalWeightG && <><dt>総量</dt><dd>{metrics.totalWeightG}g</dd></>}{metrics.totalVolumeL && <><dt>総量</dt><dd>{metrics.totalVolumeL}L</dd></>}{metrics.totalLengthM && <><dt>総長</dt><dd>{metrics.totalLengthM}m</dd></>}{metrics.pricePerServing && <><dt>1食あたり</dt><dd>{formatYen(metrics.pricePerServing)}</dd></>}{metrics.pricePerItem && <><dt>1個あたり</dt><dd>{formatYen(metrics.pricePerItem)}</dd></>}{metrics.pricePerLiter && <><dt>1Lあたり</dt><dd>{formatYen(metrics.pricePerLiter)}</dd></>}{metrics.pricePer100g && <><dt>100gあたり</dt><dd>{formatYen(metrics.pricePer100g)}</dd></>}{metrics.pricePerMeter && <><dt>1mあたり</dt><dd>{formatYen(metrics.pricePerMeter)}</dd></>}{metrics.pricePerDay && <><dt>1日あたり</dt><dd>{formatYen(metrics.pricePerDay)}</dd></>}</dl>{!metrics.itemCount && !metrics.totalWeightG && !metrics.totalVolumeL && <p className="muted">容量や個数が見つかりません。読み取り結果を値札どおりに直してください。</p>}</section>{timing && <p className="muted timing">今回の処理: 前処理 {timing.preprocessingMs}ms / 初回Worker準備 {timing.workerWarmupMs}ms / OCR {timing.ocrMs}ms / 解析 {timing.parsingMs}ms</p>}<div className="bottom-actions"><button className="button secondary" onClick={() => setStep('crop')}>撮り直す</button><button className="button primary" onClick={() => void save()}>確認して端末へ保存</button></div></section>}

      {step === 'saved' && <section className="card saved"><h2>端末に保存しました</h2><p>{form.name || 'この商品'}の価格履歴を追加したで。</p><p>初回記録のため、価格お得度はまだ判定しません。今回の価格を基準に、次回から自分の履歴と比較できます。</p><p className="muted">保存日時: {savedAt ? new Date(savedAt).toLocaleString('ja-JP') : ''}</p><button className="button primary" onClick={reset}>次の値札を撮る</button></section>}
    </main>
  );
}
