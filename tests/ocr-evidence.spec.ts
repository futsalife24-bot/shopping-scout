import { describe, expect, it } from 'vitest';
import { applyOcrEvidence, parseLabelText } from '../src/features/product';

describe('OCR price evidence', () => {
  it('prefers a confident lower label price over a product code', () => {
    const parsed = parseLabelText('商品番号 79054\n価格 4,980円');
    const result = applyOcrEvidence(parsed, [
      { text: '商品番号 79054', confidence: 96, bbox: { x0: 0, y0: 10, x1: 200, y1: 50 } },
      { text: '価格 4,980円', confidence: 88, bbox: { x0: 0, y0: 500, x1: 200, y1: 560 } }
    ]);
    expect(result.currentPrice).toBe(4980);
  });

  it('uses regular price minus discount when the values reconcile', () => {
    const parsed = parseLabelText('通常価格 2,998円\nレジにて割引 -600円\n2,398円');
    const result = applyOcrEvidence(parsed, []);
    expect(result.currentPrice).toBe(2398);
  });
});
