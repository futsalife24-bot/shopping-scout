# SHOPPING SCOUT アーキテクチャ（導入版）

## 方針
Phase 1では `OCR` を除外し、OCR結果文字列を前提にした純粋ロジックを土台化する。  
UI と解析エンジンは責務分離し、将来の置換を容易にする。

## 主要ディレクトリ
- `src/app/`: アプリのエントリ画面
- `src/features/product/`: 商品ラベル解析ロジック（OCR非依存）
- `src/types/`: 型定義（`ProductCandidate` / `PriceCandidate` / `PackageSpec` / `ParsedLabel` / `UnitMetric` / `ParseConfidence`）
- `tests/fixtures/`: OCR後想定文字列の固定データ
- `tests/`: 純粋ロジックの単体テスト
- `docs/`: 仕様・工程・引き継ぎ資料
- `public/`: PWA manifest / icons

## データフロー
1. OCR結果の生文字列（外部実装未実装）を `parseLabelText(rawText)` へ渡す  
2. `ParsedLabel` に正規化結果、価格候補、パッケージ情報を格納  
3. `calculateUnitMetrics(parsed)` で単価系指標を算出  
4. 将来: UI で確認・編集→保存→履歴に展開

## 重要分離点
- `parseLabelText` は副作用を持たない
- `calculateUnitMetrics` は I/O 非依存でテストしやすい
- UI 側は `ParsedLabel` と `UnitMetric` を受けるのみ

## PWA基盤
- `vite.config.ts` で `VitePWA` を有効化
- `public/manifest.webmanifest` と `icons/` を用意
- GitHub Pages を想定した `base` 設定に配慮
