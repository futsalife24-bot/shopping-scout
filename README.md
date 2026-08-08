# 買い物スカウター（準備フェーズ）

## 概要
本リポジトリは「買い物スカウター」の本実装前準備版です。  
OCR本体実装なしで、`仕様 → PWA基盤 → 純粋ロジック基盤 → fixture/test` を先に整備します。

## 参照
- 仕様（Single Source of Truth）: `docs/SHOPPING_SCOUT_SPEC.md`
- 開発運用ルール: `AGENTS.md`

## 実行
```bash
npm install
npm run typecheck
npm run test
npm run build
```

## 技術
- Vite
- React
- TypeScript
- vite-plugin-pwa
- Vitest
