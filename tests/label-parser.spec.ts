import { expect, describe, it } from 'vitest';
import fixtures from './fixtures/shopping-scout-cases.json';
import { calculateUnitMetrics, parseLabelText } from '../src/features/product/labelParser';

interface FixtureEntry {
  id: string;
  label: string;
  rawLines: string[];
  expected: {
    [key: string]: unknown;
    forbiddenPriceCandidates?: number[];
  };
}

const typedFixtures = fixtures as FixtureEntry[];

describe('label parser foundation fixtures', () => {
  typedFixtures.forEach((fixture) => {
    it(`fixture ${fixture.id}: ${fixture.label}`, () => {
      const rawText = fixture.rawLines.join('\n');
      const parsed = parseLabelText(rawText);
      const metrics = calculateUnitMetrics(parsed);
      const expected = fixture.expected;

      if (expected.currentPrice !== undefined) {
        expect(parsed.currentPrice).toBe(expected.currentPrice as number);
      }
      if (expected.regularPrice !== undefined) {
        expect(parsed.regularPrice).toBe(expected.regularPrice as number);
      }
      if (expected.discountAmount !== undefined) {
        expect(parsed.discountAmount).toBe(expected.discountAmount as number);
      }
      if (expected.itemCount !== undefined) {
        expect(metrics.itemCount).toBeCloseTo(expected.itemCount as number, 2);
      }
      if (expected.rollCount !== undefined) {
        expect(metrics.rollCount).toBeCloseTo(expected.rollCount as number, 2);
      }
      if (expected.servingCount !== undefined) {
        expect(metrics.servingCount).toBeCloseTo(expected.servingCount as number, 2);
      }
      if (expected.totalLengthM !== undefined) {
        expect(metrics.totalLengthM).toBeCloseTo(expected.totalLengthM as number, 2);
      }
      if (expected.totalVolumeMl !== undefined) {
        expect(metrics.totalVolumeMl).toBeCloseTo(expected.totalVolumeMl as number, 2);
      }
      if (expected.totalVolumeL !== undefined) {
        expect(metrics.totalVolumeL).toBeCloseTo(expected.totalVolumeL as number, 2);
      }
      if (expected.totalWeightG !== undefined) {
        expect(metrics.totalWeightG).toBeCloseTo(expected.totalWeightG as number, 2);
      }
      if (expected.totalDaySupply !== undefined) {
        expect(metrics.totalDaySupply).toBeCloseTo(expected.totalDaySupply as number, 2);
      }
      if (expected.dailyDose !== undefined) {
        expect(metrics.dailyDose).toBeCloseTo(expected.dailyDose as number, 2);
      }
      if (expected.pricePerItem !== undefined) {
        expect(metrics.pricePerItem).toBeCloseTo(expected.pricePerItem as number, 2);
      }
      if (expected.pricePerRoll !== undefined) {
        expect(metrics.pricePerRoll).toBeCloseTo(expected.pricePerRoll as number, 2);
      }
      if (expected.pricePerMeter !== undefined) {
        expect(metrics.pricePerMeter).toBeCloseTo(expected.pricePerMeter as number, 2);
      }
      if (expected.pricePerLiter !== undefined) {
        expect(metrics.pricePerLiter).toBeCloseTo(expected.pricePerLiter as number, 2);
      }
      if (expected.pricePerServing !== undefined) {
        expect(metrics.pricePerServing).toBeCloseTo(expected.pricePerServing as number, 2);
      }
      if (expected.pricePer100g !== undefined) {
        expect(metrics.pricePer100g).toBeCloseTo(expected.pricePer100g as number, 2);
      }
      if (expected.pricePerDay !== undefined) {
        expect(metrics.pricePerDay).toBeCloseTo(expected.pricePerDay as number, 2);
      }
      if (expected.discountRate !== undefined) {
        expect(metrics.discountRate).toBeCloseTo(expected.discountRate as number, 1);
      }
      if (fixture.expected.forbiddenPriceCandidates) {
        fixture.expected.forbiddenPriceCandidates.forEach((value) => {
          expect(parsed.priceCandidates.some((candidate) => candidate.amount === value)).toBe(false);
        });
      }
    });
  });
});
