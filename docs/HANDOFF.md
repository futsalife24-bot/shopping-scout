# HANDOFF

## 現在のbranch
- 取得時のbranch: `main` を想定（未設定時は作業開始時に確認）

## 最新commit
- 作成中: 後続手順で要更新

## 今回実装した内容
- `Vite + React + TypeScript` の最小構成を追加
- `vite-plugin-pwa` による最小PWA基盤を追加
- `parseLabelText` / `calculateUnitMetrics` の純粋ロジック土台を追加
- 12件fixtureとテストを追加
- 仕様・運用・エージェント向けドキュメントを追加

## 意図的に実装しなかった内容
- OCR本体
- カメラ・画像UI
- IndexedDB
- 価格履歴UI/グラフ
- 外部API
- 外部スクレイピング

## 重要ファイル
- `docs/SHOPPING_SCOUT_SPEC.md`
- `AGENTS.md`
- `CLAUDE.md`
- `src/features/product/labelParser.ts`
- `src/features/product/index.ts`
- `src/types/commerce.ts`
- `tests/fixtures/shopping-scout-cases.json`
- `tests/label-parser.spec.ts`
- `vite.config.ts`
- `public/manifest.webmanifest`

## 主要コマンド
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run test:run`
- `npm run build`

## test/build結果（最終確認時に追記）
- typecheck: 未実行
- test: 未実行
- build: 未実行

## 既知の問題
- parser は将来の誤認率向上を前提にした簡易版。  
- `g`/`kg` 系の内部単位換算は最小実装段階。
- 一部ケースは期待値の再計算精度を実際のOCRノイズに合わせて調整が必要。

## 次に行うMilestone
- Milestone 1 の画面遷移整理
- Milestone 2 の parse 精度拡張（容量・容器単位の明示）
- fixture 拡張と境界条件追加

## 絶対に破ってはいけない制約
- Phase 1は有料API/外部価格API/スクレイピング禁止
- テスト削除して通過扱いをしない
- 仕様の正本は `docs/SHOPPING_SCOUT_SPEC.md`
