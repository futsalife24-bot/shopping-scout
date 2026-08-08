# CLAUDE.md

## まず読むファイル
1. `docs/SHOPPING_SCOUT_SPEC.md`（正式仕様）
2. `AGENTS.md`（エージェント共通ルール）
3. `docs/HANDOFF.md`（次担当向け引き継ぎ）

## プロジェクト目的
- Phase 1 は「値札文字列の構造化解析基盤」を整備し、本実装前の土台を作る。
- 本実装者が `parseLabelText` と `calculateUnitMetrics` を安全に拡張できる状態にする。

## 技術構成
- Vite
- React
- TypeScript
- PWA（`vite-plugin-pwa`）
- Vitest

## 主要コマンド
- `npm install`
- `npm run typecheck`
- `npm run test`
- `npm run test:run`
- `npm run build`

## Phase 1 の制約
- Tesseract.js / OpenCV.js / IndexedDB / 外部価格API / 有料API / スクレイピングを実装しない。
- 画像は外部送信しない。
- OCR結果は検証前提で取り扱う（即時確定しない）。

## 既存進捗
- 12件fixtureをテストとして追加済み（`tests/fixtures/shopping-scout-cases.json`）。
- 純粋ロジックの境界（`parseLabelText`, `calculateUnitMetrics`）を実装済み。
- 最小PWA基盤とデスクトップ/モバイル起動可能なshellを用意済み。
- TypeScript strict + Vitest + build が通過。

## 禁止事項
- 価格候補・数量候補を商品名ベースでハードコードして固定返しすること。
- `git push` のみを実装完了とみなすこと（テスト/build未確認は不可）。
- 既存ユーザー変更を巻き戻す/破壊する変更。

## 次に実装する Milestone
1. Capture/Crop/OCR/確認UI
2. 解析ロジックの拡張（単位分解能、誤認排除）
3. IndexedDB + History + Score/Chart/Favorite
4. シェア/バックアップ/離線磨き
5. Android実機QAと本番リリース準備

## テスト方針
- 仕様テーブルとfixtureは保持し、ロジックのみを単体テストで先行する。
- 回帰は `tests/label-parser.spec.ts` を基点に拡張し、fixture追加時は期待値の粒度を揃える。

## 仕様変更の扱い
- 仕様変更があった場合、先に `docs/SHOPPING_SCOUT_SPEC.md` を更新し、その後 `docs/DECISIONS.md` と関連ロジック/fixtureを調整する。
- 変更理由・未対応項目を `docs/HANDOFF.md` に追記。
