# HANDOFF

## 現在の状況
- branch: `master`
- latest commit: `29170ed`（`chore: bootstrap shopping scout pwa`）

## 今回の実装内容（本実装は未着手）
- `docs/SHOPPING_SCOUT_SPEC.md`（統合仕様を保存）
- `AGENTS.md` / `CLAUDE.md`（エージェント共通ルール・引き継ぎ指針）
- PWA最小基盤（manifest / service worker /  `vite-plugin-pwa` 設定）
- 純粋ロジック分離:
  - `parseLabelText`
  - `calculateUnitMetrics`
- 型定義（`ProductCandidate`, `PriceCandidate`, `PackageSpec`, `PackageComponent`, `ParsedLabel`, `UnitMetric`, `ParseConfidence`）
- fixture 12件:
  - `tests/fixtures/shopping-scout-cases.json`
- テスト:
  - `tests/label-parser.spec.ts`

## 意図的に実装しなかった内容（Phase 1除外）
- Tesseract.js/OCR本体
- カメラ
- 画像切り抜き
- 画像前処理
- IndexedDB
- 価格履歴UI
- グラフ
- チャット共有
- 有料API / 外部価格API
- スクレイピング

## 重要ファイル
- `src/features/product/labelParser.ts`
- `src/features/product/index.ts`
- `src/types/commerce.ts`
- `src/main.tsx`, `src/app/App.tsx`, `src/styles.css`
- `vite.config.ts`, `vitest.config.ts`, `tsconfig*.json`
- `public/manifest.webmanifest`
- `.github/workflows/gh-pages.yml`
- `package.json`

## 主要コマンド
- `npm install`（Windowsでは `npm.cmd install`）
- `npm run typecheck`
- `npm run test`
- `npm run test:run`
- `npm run build`

## test/build 結果
- typecheck: success
- test: success（12件 fixture）
- build: success（`dist/` 生成）

## 既知の問題
- `npm audit` は依存の脆弱性を報告（本PoCの範囲では未対応）
- 実行環境PowerShellは実行ポリシー制約あり、`npm` は `npm.cmd` で実行

## 次に進む Milestone
1. Capture → Crop → OCR → Confirm
2. Parse → Unit Calculation → IndexedDB
3. History → Score → Chart → Favorites
4. ChatGPT Share → Backup → Offline polish
5. Android実機QA → OCR精度改善 → Release

## 絶対に破ってはいけない制約
- `SHOPPING_SCOUT_SPEC.md`をSingle Source of Truthとして固定
- 無料制約（有料API禁止）
- 外部送信前提のスクレイピングや価格API禁止
- OCR誤認のハードコード回避
- テストを削除・スキップして進捗を成立扱いしない
- 既存ユーザー変更を破壊しない
