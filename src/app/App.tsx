import { parseLabelText } from '../features/product/labelParser';

const sampleText = `ANKER
充電器＆ケーブルセット
USB-C & USB-C 1.8M
4,980`;

export function App() {
  const parsed = parseLabelText(sampleText);

  return (
    <main className="page">
      <h1>買い物スカウター</h1>
      <p>値札を撮って、自分の価格履歴と比較するアプリ（開発準備中）</p>
      <section className="card">
        <h2>開発準備土台</h2>
        <p>
          商品名候補: {parsed.productName ?? '未確定'}
        </p>
        <p>
          予備計算価格: {parsed.currentPrice ?? '未検出'}
        </p>
      </section>
    </main>
  );
}
