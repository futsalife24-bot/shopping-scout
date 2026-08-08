export interface ProductCandidate {
  name: string;
  confidence: number;
  sourceLine: number;
}

export interface PriceCandidate {
  amount: number;
  rawText: string;
  sourceLine: number;
  kind: 'current' | 'regular' | 'discount' | 'candidate';
}

export interface ParseConfidence {
  score: number;
  reasons: string[];
}

export type CanonicalUnit =
  | 'piece'
  | 'roll'
  | 'serving'
  | 'pack'
  | 'tablet'
  | 'day'
  | 'm'
  | 'ml'
  | 'g'
  | 'mg'
  | 'length'
  | 'volume'
  | 'weight'
  | 'other';

export interface PackageComponent {
  rawText: string;
  quantity: number;
  unit: CanonicalUnit;
  sourceLine: number;
  originalLine: string;
}

export interface PackageMultiplier {
  left: PackageComponent;
  right: PackageComponent;
  sourceLine: number;
  rawText: string;
}

export interface PackageSpec {
  counts: PackageComponent[];
  lengths: PackageComponent[];
  volumes: PackageComponent[];
  weights: PackageComponent[];
  days: PackageComponent[];
  multipliers: PackageMultiplier[];
  dailyDose?: number;
  supplyDays?: number;
  notes: string[];
}

export interface ParsedLabel {
  rawText: string;
  normalizedText: string;
  lines: string[];
  productName?: string;
  productCandidates: ProductCandidate[];
  priceCandidates: PriceCandidate[];
  currentPrice?: number;
  regularPrice?: number;
  discountAmount?: number;
  packageSpec: PackageSpec;
  confidence: ParseConfidence;
}

export interface UnitMetric {
  currentPrice?: number;
  regularPrice?: number;
  discountAmount?: number;
  discountRate?: number;

  itemCount?: number;
  rollCount?: number;
  servingCount?: number;
  totalLengthM?: number;
  totalVolumeMl?: number;
  totalVolumeL?: number;
  totalWeightG?: number;
  totalDaySupply?: number;
  dailyDose?: number;
  pricePerRoll?: number;
  pricePerMeter?: number;
  pricePerItem?: number;
  pricePerServing?: number;
  pricePerLiter?: number;
  pricePer100g?: number;
  pricePerDay?: number;
}

/** A stable, user-owned product record. Do not infer market-wide facts from it. */
export interface Product {
  id: string;
  canonicalName: string;
  manufacturer?: string;
  janCode?: string;
  category?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PackageSnapshot {
  rawText: string;
  parsed: ParsedLabel['packageSpec'];
}

export interface PriceObservation {
  id: string;
  productId: string;
  storeName?: string;
  storeProductCode?: string;
  capturedAt: string;
  currentPrice: number;
  regularPrice?: number;
  discountAmount?: number;
  packageSnapshot: PackageSnapshot;
  derivedMetrics: UnitMetric;
  ocrRawText: string;
  ocrConfidence?: number;
  userConfirmed: boolean;
}

export interface OcrTiming {
  preprocessingMs: number;
  workerWarmupMs: number;
  ocrMs: number;
  parsingMs: number;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export interface OcrResult {
  text: string;
  confidence: number;
  lines: OcrLine[];
  timing: OcrTiming;
}
