# HANDOFF

更新日: 2026-08-09

## 実装済み

- Vite/React/strict TypeScript/PWA/Vitestの基盤とGitHub Pages対応。
- 12件fixtureを通す純粋なラベル解析・単価計算。
- Android向けの値札撮影、画像選択、ガイド枠、stream停止、手動切抜き、回転、品質注意。
- ブラウザ内Tesseract.js `jpn+eng` Worker、進捗表示、最小前処理、Worker再利用。
- OCR候補の手修正、再解析、単価表示、エラー案内。
- Dexie version 1でのProduct/PriceObservation分離、完全一致照合、transaction保存。
- 初回記録時にお得度を判定しない保存完了表示。

## 主要ファイル

- `src/app/App.tsx`: 画面フロー。
- `src/features/ocr/imageTools.ts`: 切抜き、品質確認、前処理。
- `src/features/ocr/tesseractClient.ts`: Workerの再利用とOCR計測。
- `src/features/product/labelParser.ts`: 純粋な解析・単価計算。
- `src/features/storage/shoppingScoutDb.ts`: Dexie schemaと保存。
- `src/types/commerce.ts`: Product/Observation/OCRを含む共有型。
- `tests/label-parser.spec.ts`: 12 fixture。
- `tests/shopping-scout-db.spec.ts`: IndexedDBモデル。

## 検証結果

2026-08-09に以下を通過。

- `npm run typecheck`: success
- `npm run test:run`: 3 files / 16 tests passed
- `npm run build`: success（PWA service worker生成を確認）
- ローカルPWAを393x852で確認。画像選択→切抜き→OCR→手修正→保存完了まで操作済み。

OCRの実測（1200x900のSVG値札スモーク画像、ブラウザ内）:

- 1回目: 前処理12ms / Worker準備186ms / OCR86ms / 解析2ms
- 同じWorkerの2回目: 前処理4ms / Worker準備0ms / OCR48ms / 解析0ms

これは開発環境・モデルがキャッシュ済みの計測であり、Android実機や初回言語モデルダウンロードを含む時間ではない。

## 意図的に未実装

- 価格履歴一覧、推移グラフ、価格お得度、目標価格、お気に入り。
- 名称類似度による同一商品候補と統合確認UI。
- ChatGPT共有、JSONバックアップ、ネット価格検索、監視、同期、共有、広告、課金。
- 毎フレームOCR、効能・品質評価。

## 既知の問題・注意

- 実Android端末のカメラ権限、PWA install、低速回線での初回OCRモデル取得は未QA。
- 実店舗の値札画像によるOCR精度評価は未実施。12 fixtureはOCR後文字列の解析テストである。
- OCR bbox/confidenceを使う候補順位付けは実装済みだが、実店舗値札での重み検証は未実施。
- `npm audit`は依存ツリーに5件の脆弱性を報告。`audit fix --force`は破壊的になり得るため未実行。

## 次Milestone

Milestone 3として、保存済み履歴の閲覧、同一商品の明示確認、容量同一条件でのみ比較する「価格お得度（保留表示あり）」を実装する。その前にAndroid Chrome実機でカメラ・OCR・PWA installをQAする。
