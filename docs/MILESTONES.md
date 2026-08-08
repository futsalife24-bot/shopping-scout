# Milestone計画

## Milestone 0 — 完了

- Vite + React + TypeScript strict + PWA + Vitest
- 仕様書、恒久ルール、アーキテクチャ、引き継ぎ資料
- 12件fixtureと純粋な価格・容量・単価ロジック

## Milestone 1 — 完了（Android実機QAは次工程）

- 背面カメラ要求と画像ファイル選択
- 撮影後のstream停止
- 値札ガイド枠、手動切抜き、90度回転、画像品質注意
- 最小前処理とTesseract `jpn+eng` Worker
- OCR進捗と初回取得失敗時の案内
- 候補を編集できる確認画面

## Milestone 2 — 完了（基礎範囲）

- 文字正規化、価格候補、割引、容量、個数、セット構成、単価計算
- Dexie schema version 1のProduct / PriceObservation
- JAN・同一店舗＋商品番号の完全一致照合（曖昧一致は統合しない）
- ユーザー確認済みのtransaction保存と初回記録メッセージ

## Milestone 3 — 次

- 保存済み観測値の一覧と価格履歴
- 同一商品確認UI（メーカー＋名称＋容量の候補提示を含む）
- 根拠がある場合だけの価格お得度、グラフ、お気に入り、目標価格

## Milestone 4以降 — 未着手

- ChatGPT共有、JSONバックアップ、オフライン磨き込み
- ネット価格検索、同期、家族共有、広告、課金は別途の仕様承認後に検討
- Android実機でのカメラ・OCR精度・PWA install・オフラインQA
