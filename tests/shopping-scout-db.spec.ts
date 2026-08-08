import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { findExactProductMatches, saveNewRecord, ShoppingScoutDb } from '../src/features/storage';
import type { PriceObservation, Product } from '../src/types/commerce';

const db = new ShoppingScoutDb('shopping-scout-test');

afterEach(async () => {
  await db.delete();
  await db.open();
});

describe('local price history database', () => {
  it('keeps Product and PriceObservation separate and saves both atomically', async () => {
    const product: Product = {
      id: 'product-1', canonicalName: 'テストカレー', janCode: '4900000000012', createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z'
    };
    const observation: PriceObservation = {
      id: 'observation-1', productId: product.id, storeName: 'テスト店', storeProductCode: '574036', capturedAt: product.createdAt,
      currentPrice: 1898, packageSnapshot: { rawText: '200g × 10袋', parsed: { counts: [], lengths: [], volumes: [], weights: [], days: [], multipliers: [], notes: [] } },
      derivedMetrics: { currentPrice: 1898, servingCount: 10, pricePerServing: 189.8 }, ocrRawText: 'テスト', userConfirmed: true
    };
    await saveNewRecord({ product, observation }, db);
    expect(await db.products.get(product.id)).toMatchObject({ canonicalName: 'テストカレー', janCode: '4900000000012' });
    expect(await db.priceObservations.get(observation.id)).toMatchObject({ productId: product.id, currentPrice: 1898, userConfirmed: true });
  });

  it('matches only exact JAN or exact store plus product code', async () => {
    const product: Product = { id: 'product-2', canonicalName: '同名商品', janCode: '4900000000029', createdAt: '2026-08-09T00:00:00.000Z', updatedAt: '2026-08-09T00:00:00.000Z' };
    const observation: PriceObservation = {
      id: 'observation-2', productId: product.id, storeName: 'テスト店', storeProductCode: '79054', capturedAt: product.createdAt, currentPrice: 4980,
      packageSnapshot: { rawText: 'USB-C 1.8m', parsed: { counts: [], lengths: [], volumes: [], weights: [], days: [], multipliers: [], notes: [] } },
      derivedMetrics: { currentPrice: 4980 }, ocrRawText: 'ANKER', userConfirmed: true
    };
    await saveNewRecord({ product, observation }, db);
    expect(await findExactProductMatches({ janCode: '4900000000029' }, db)).toHaveLength(1);
    expect(await findExactProductMatches({ storeName: 'テスト店', storeProductCode: '79054' }, db)).toHaveLength(1);
    expect(await findExactProductMatches({ storeName: '別の店', storeProductCode: '79054' }, db)).toHaveLength(0);
    expect(await findExactProductMatches({}, db)).toHaveLength(0);
  });
});
