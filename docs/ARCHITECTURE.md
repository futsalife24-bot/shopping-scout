# Shopping Scout アーキテクチャ

## 方針

Android Chrome優先・ローカルファースト・完全無料。画像はブラウザ内で処理し、OCR結果は必ずユーザー確認を経てからIndexedDBへ保存する。

## データフロー

`Capture/File → Crop/Rotate → minimal preprocessing → Tesseract Worker → Parse → Confirm/Edit → Unit calculation → Dexie transaction`

- `src/app/App.tsx`: 画面遷移と入力状態。計算式やDB詳細を持たない。
- `src/features/ocr/`: 画像読込、品質注意、切抜き、前処理、Tesseract Worker再利用。
- `src/features/product/`: OCR非依存の文字正規化、価格・パッケージ解析、純粋な単価計算。
- `src/features/storage/`: Dexie schema、完全一致照合、保存transaction。
- `src/types/commerce.ts`: UI/解析/DBで共有する厳格な型。
- `tests/fixtures/`: 商品固有のハードコードを防ぐOCR文字列fixture。

## OCR

Tesseract.jsの`jpn+eng` Workerはモジュール内で1回だけ生成し、同じアプリ起動中に再利用する。初回の言語モデル取得失敗（オフラインを含む）はユーザー向けに再撮影・再試行を案内する。OCRから行、座標、confidenceを保持し、価格ラベル語・値札下部・商品番号/容量/通常価格/割引の減点へ使って候補を順位付けする。結果は常に確認画面で修正できる。

## 保存モデル

`Product` は正規化された商品のID情報、`PriceObservation` は特定の時刻・店舗・値札・単価計算結果を保存する。Dexie version 1には明示的なschemaを置き、以降のmigrationは新しい`version()`として追加する。

同一商品照合はJAN完全一致、または同一店舗＋商品番号の完全一致だけを返す。名称や容量が似ているだけでは自動統合しない。

## PWA

Vite PWA pluginがmanifestとservice workerを生成する。GitHub Pages用のbaseは`GITHUB_PAGES_BASE`で指定する。OCR言語モデルの初回取得はprecache対象にせず、ネットワーク不可時は失敗を説明する。
