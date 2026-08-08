# Milestone計画（5工程）

## Milestone 0: セットアップ
- 本番実装なし
- 仕様保存（`docs/SHOPPING_SCOUT_SPEC.md`）
- AGENTS / CLAUDE / PWA基盤
- fixture + テストハーネス作成
- TypeScript strict + Vitest 導線

## Milestone 1: Capture → Crop → OCR → Confirm
- カメラ・画像取得は実装しないが、画面遷移と確定前確認画面の契約を確立する。
- OCR結果の不確実性を扱う UI フローを先行定義。

## Milestone 2: Parse → Unit Calculation → IndexedDB
- 本格のOCR入力を受け入れるモデルを完成
- 製品候補・価格候補・容量/数量の解釈を拡張
- localOnly前提で IndexedDB に保存（Phase 1後半）

## Milestone 3: History → Score → Chart → Favorites
- 価格履歴と比較評価を追加
- 単価指標を時系列可視化
- お気に入り/除外ルール追加

## Milestone 4: ChatGPT Share → Backup → Offline polish
- 共有先を外部送信不要設計を維持しつつ、エクスポート方式を提供
- バックアップ（JSON/ローカル保存）
- オフライン耐性の最終調整

## Milestone 5: Android実機QA → OCR精度改善 → Release
- Android Chrome 実機で Install / Offline / 起動体験確認
- OCR誤認ケースを fixture拡張で回収
- 段階的リリース
