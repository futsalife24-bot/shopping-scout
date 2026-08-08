# CLAUDE.md

このリポジトリを引き継ぐ際は、まず以下を読む。

## 先に読むファイル
1. `docs/SHOPPING_SCOUT_SPEC.md`（仕様正本）
2. `AGENTS.md`（運用上の恒久ルール）
3. `docs/HANDOFF.md`（前提と引き継ぎ）

## プロジェクト目的
買い物スカウター Phase 1 は、OCR文字列を前提とした商品情報抽出ロジックの土台を作り、将来のOCR/撮影/履歴機能に安全に拡張できる最小基盤を作ること。

## 技術構成
- Vite
- React
- TypeScript
- Vitest
- vite-plugin-pwa

## 主要コマンド
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run test:run`
- `npm run build`

## Phase 1の制約
- OCR本体、カメラ、IndexedDB、外部価格API、外部スクレイピングは実装しない。
- 無料で完結する構成を崩さない。

## 現在の進捗
- PWA最小構成追加
- `parseLabelText` / `calculateUnitMetrics` 純粋ロジック追加
- fixture 12件と単体テスト追加
- 仕様書/引き継ぎドキュメント追加

## 禁止事項
- 既存テストの削除、または不正なスキップで合格扱い
- 有料API、外部価格検索API
- 規約違反スクレイピング
- 仕様外の機能先取り実装

## 次に実装する Milestone
- Milestone 1: Capture/Crop/OCR確認フローのUI設計
- Milestone 2: parse精度改善と単位標準化、IndexedDB準備
- テストを増やして fixture で誤認防止を拡張

## テスト方針
- `parseLabelText` と `calculateUnitMetrics` は純粋関数として維持し、fixture由来の文字列で回帰テストを追加。
- 商品名やコードに依存した分岐を避ける。
- 価格候補、通常価格、割引、個数、容量、総量、単価計算を個別にテスト。

## 仕様変更時
- `docs/SHOPPING_SCOUT_SPEC.md`を更新し、変更理由を `docs/DECISIONS.md` に1〜3行で追記する。
