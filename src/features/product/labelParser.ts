import type {
  CanonicalUnit,
  PackageComponent,
  PackageMultiplier,
  PackageSpec,
  ParseConfidence,
  ParsedLabel,
  PriceCandidate,
  ProductCandidate,
  UnitMetric
} from '@/types/commerce';

interface PriceLineCandidate extends PriceCandidate {
  kind: 'current' | 'regular' | 'discount' | 'candidate';
}

const UNIT_TOKEN =
  '(?:ml|mL|l|L|kg|g|mg|m|ロール|roll|本|個|枚|袋|パック|pack|食|日|P|p|粒|錠|pcs?|本入り)';

const MULTIPLICATION_RE = new RegExp(
  String.raw`(\d+(?:\.\d+)?)\s*(${UNIT_TOKEN})?\s*[xX×]\s*(\d+(?:\.\d+)?)\s*(${UNIT_TOKEN})?`,
  'giu'
);
const SINGLE_QUANTITY_RE = new RegExp(
  String.raw`(\d+(?:\.\d+)?)(\s*(${UNIT_TOKEN}))?(?=[^0-9,]|$)`,
  'giu'
);
const PRICE_TOKEN_RE = /(?:\d{1,3}(?:,\d{3})+|\b\d{4}\b|\b\d{3}\b)/g;

function toHalfWidth(input: string): string {
  return input.replace(/[！-～]/gu, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0));
}

function normalizeRawText(rawText: string): string {
  return toHalfWidth(rawText)
    .replace(/[−―–]/g, '-')
    .replace(/[，]/g, ',')
    .replace(/[×✕✖]/g, 'x')
    .replace(/[—−]/g, '-')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}

function normalizeLine(line: string): string {
  return toHalfWidth(line).trim();
}

function classifyUnit(rawUnit: string): CanonicalUnit {
  const unit = toHalfWidth(rawUnit).replace(/\s+/g, '').toLowerCase();
  if (unit === 'roll' || unit === 'ロール') return 'roll';
  if (unit === '食') return 'serving';
  if (unit === '本' || unit === '個' || unit === '枚' || unit === '袋' || unit === 'pcs' || unit === 'pc' || unit === 'p' || unit === '粒' || unit === '錠' || unit === 'pack' || unit === 'パック') return 'piece';
  if (unit === '日') return 'day';
  if (unit === 'm') return 'length';
  if (unit === 'ml' || unit === 'l') return 'volume';
  if (unit === 'kg' || unit === 'g' || unit === 'mg') return 'weight';
  return 'other';
}

function numberFromToken(raw: string): number {
  return Number(raw.replace(/,/g, ''));
}

function isCountUnit(unit: CanonicalUnit): boolean {
  return ['piece', 'roll', 'serving', 'tablet'].includes(unit);
}

function normalizeQuantityByUnit(quantity: number, unitText: string): number {
  const unit = toHalfWidth(unitText).replace(/\s+/g, '').toLowerCase();
  if (unit === 'l' || unit === 'll' || unit === 'ℓ') return quantity * 1000;
  if (unit === 'kg') return quantity * 1000;
  return quantity;
}

function createPackageComponent(
  quantityText: string,
  unitText: string | undefined,
  sourceLine: number,
  originalLine: string,
  allowUnitless = false
): PackageComponent | null {
  const quantity = Number(quantityText);
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  const unit = unitText ? classifyUnit(unitText) : allowUnitless ? 'piece' : 'other';
  if (unit === 'other') return null;
  const normalizedQuantity = unitText ? normalizeQuantityByUnit(quantity, unitText) : quantity;
  return { quantity: normalizedQuantity, unit, rawText: unitText ? `${quantityText} ${unitText}`.trim() : quantityText, sourceLine, originalLine };
}

function parseLinePriceCandidates(line: string, sourceLine: number): PriceLineCandidate[] {
  const candidates: PriceLineCandidate[] = [];
  const normalizedLine = normalizeLine(line);

  const regularMatch = normalizedLine.match(/通常価格\s*([0-9][0-9,]*)/);
  if (regularMatch) {
    candidates.push({
      amount: numberFromToken(regularMatch[1]),
      sourceLine,
      rawText: regularMatch[1],
      kind: 'regular'
    });
  }

  const discountMatch = normalizedLine.match(/割引\s*-?\s*([0-9][0-9,]*)/);
  if (discountMatch) {
    candidates.push({
      amount: numberFromToken(discountMatch[1]),
      sourceLine,
      rawText: discountMatch[1],
      kind: 'discount'
    });
  }

  const matches = normalizedLine.matchAll(PRICE_TOKEN_RE);
  for (const match of matches) {
    const raw = match[0];
    const amount = numberFromToken(raw);
    if (amount <= 0) continue;
    const start = match.index ?? 0;
    const prev = normalizedLine[start - 1] ?? '';
    const next = normalizedLine[start + raw.length] ?? '';
    const hasPriceContext = /(?:円|税込|価格|値札)/u.test(normalizedLine);

    if (/[a-zA-ZＡ-ｚぁ-んァ-ヶ一-龯]/u.test(prev) && !hasPriceContext) continue;
    if (/[a-zA-ZＡ-ｚぁ-んァ-ヶ一-龯]/u.test(next) && !hasPriceContext) continue;
    if (prev === ',') continue;
    if (!candidates.some((entry) => entry.amount === amount && entry.sourceLine === sourceLine)) {
      candidates.push({ amount, sourceLine, rawText: raw, kind: 'candidate' });
    }
  }

  return candidates;
}

function pushComponent(spec: PackageSpec, component: PackageComponent | null): void {
  if (!component) return;
  if (component.unit === 'length') {
    spec.lengths.push(component);
    return;
  }
  if (component.unit === 'volume') {
    spec.volumes.push(component);
    return;
  }
  if (component.unit === 'weight' || component.unit === 'mg') {
    spec.weights.push(component);
    return;
  }
  if (component.unit === 'day') {
    spec.days.push(component);
    return;
  }
  spec.counts.push(component);
}

function normalizeQuantityMatchUnit(unitText: string | undefined): string | undefined {
  if (!unitText) return undefined;
  return unitText.replace(/[\s]+/g, '').replace(/,$/g, '').trim();
}

function parsePackageSpec(lines: string[]): PackageSpec {
  const spec: PackageSpec = {
    counts: [],
    lengths: [],
    volumes: [],
    weights: [],
    days: [],
    multipliers: [],
    notes: []
  };

  lines.forEach((line, sourceLine) => {
    const normalizedLine = normalizeLine(line);
    if (!normalizedLine) return;

    const servingMatch = normalizedLine.match(/(\d+)\s*日分/);
    if (servingMatch) {
      const value = Number(servingMatch[1]);
      if (value > 0) spec.supplyDays = value;
    }
    const dailyDoseMatch = normalizedLine.match(/1日[^0-9]*?(\d+)/);
    if (dailyDoseMatch) {
      const value = Number(dailyDoseMatch[1]);
      if (value > 0) spec.dailyDose = value;
    }
    const discountLine = /レジにて割引|割引/.test(normalizedLine);
    const dailyDoseRange = (() => {
      const match = normalizedLine.match(/1日[^0-9]*?(\d+)\s*(?:粒|回|錠|caps?|capsule|本|個|P|pcs?|本体)?/);
      if (!match || match.index === undefined) return undefined;
      return [match.index, match.index + match[0].length];
    })();

    const usedRanges: Array<[number, number]> = [];

    const multMatches = normalizedLine.matchAll(MULTIPLICATION_RE);
    for (const multMatch of multMatches) {
      const full = multMatch[0];
      const fullStart = multMatch.index ?? 0;
      usedRanges.push([fullStart, fullStart + full.length]);

      const left = createPackageComponent(multMatch[1], normalizeQuantityMatchUnit(multMatch[2]), sourceLine, line, true);
      const right = createPackageComponent(multMatch[3], normalizeQuantityMatchUnit(multMatch[4]), sourceLine, line, !Boolean(multMatch[2]));
      const parsedLeft = left ? left : createPackageComponent(multMatch[1], normalizeQuantityMatchUnit(multMatch[2]), sourceLine, line);
      const parsedRight = right ? right : createPackageComponent(multMatch[3], normalizeQuantityMatchUnit(multMatch[4]), sourceLine, line);
      if (parsedLeft && parsedRight) {
        spec.multipliers.push({ left: parsedLeft, right: parsedRight, sourceLine, rawText: full });
      }
      pushComponent(spec, parsedLeft);
      pushComponent(spec, parsedRight);
    }

    const singleMatches = normalizedLine.matchAll(SINGLE_QUANTITY_RE);
    for (const match of singleMatches) {
      const start = match.index ?? 0;
      const end = start + match[0].length;
      const overlaps = usedRanges.some(([from, to]) => start >= from && end <= to);
      if (overlaps) continue;
      if (dailyDoseRange && start >= dailyDoseRange[0] && start < dailyDoseRange[1]) {
        continue;
      }

      const quantityText = match[1];
      const unitText = normalizeQuantityMatchUnit(match[3]);
      const prevChar = normalizedLine[start - 1] ?? '';
      const nextChar = normalizedLine[end] ?? '';
      const allowUnitless = !unitText && /[^0-9,]/.test(prevChar) && (nextChar === '' || /[\s×xX-]/.test(nextChar)) && prevChar !== ',';
      if (!unitText && discountLine) {
        continue;
      }
      const component = createPackageComponent(quantityText, unitText, sourceLine, line, allowUnitless);
      if (!component) continue;
      if (!unitText) {
        if (prevChar === ',') continue;
        if (match[0].length > 1 && Number(quantityText) >= 1000) continue;
      }
      pushComponent(spec, component);
    }
  });

  return spec;
}

function totalCountByUnit(spec: PackageSpec): { piece: number; roll: number; serving: number } {
  const counts = { piece: 0, roll: 0, serving: 0 };
  for (const item of spec.counts) {
    if (item.unit === 'roll') counts.roll += item.quantity;
    else if (item.unit === 'serving') counts.serving += item.quantity;
    else counts.piece += item.quantity;
  }
  return counts;
}

function countFromMultipliers(spec: PackageSpec, target: 'piece' | 'roll' | 'serving'): number | undefined {
  let total: number | undefined;
  for (const pair of spec.multipliers) {
    const leftUnit = pair.left.unit;
    const rightUnit = pair.right.unit;
    const leftQty = pair.left.quantity;
    const rightQty = pair.right.quantity;

    const leftMatch = leftUnit === target;
    const rightMatch = rightUnit === target;
    const leftCount = isCountUnit(leftUnit);
    const rightCount = isCountUnit(rightUnit);
    const multiplier = leftQty * rightQty;

    if (leftMatch && rightCount) {
      total = Math.max(total ?? 0, multiplier);
    } else if (rightMatch && leftCount) {
      total = Math.max(total ?? 0, multiplier);
    }
  }
  return total;
}

function resolveCurrentPrice(candidates: PriceLineCandidate[]): number | undefined {
  const regular = candidates.find((candidate) => candidate.kind === 'regular');
  const discount = candidates.find((candidate) => candidate.kind === 'discount');
  if (regular && discount && regular.amount > discount.amount) {
    return regular.amount - discount.amount;
  }
  const priced = candidates.filter((candidate) => candidate.kind === 'candidate').sort((a, b) => b.sourceLine - a.sourceLine);
  return priced[0]?.amount ?? regular?.amount;
}

function createConfidence(parsedLines: PriceLineCandidate[], spec: PackageSpec, productCandidates: ProductCandidate[]): ParseConfidence {
  const reasons: string[] = [];
  let score = 0.2;
  if (parsedLines.length > 0) {
    reasons.push('価格候補を検出');
    score += 0.2;
  }
  if (spec.counts.length + spec.lengths.length + spec.volumes.length + spec.weights.length > 0) {
    reasons.push('数量/単位候補を検出');
    score += 0.3;
  }
  if (productCandidates.length > 0) {
    reasons.push('商品候補テキストを検出');
    score += 0.3;
  }
  return { score: Number(Math.min(score, 1).toFixed(2)), reasons };
}

function getLength(spec: PackageSpec): number | undefined {
  const { roll } = totalCountByUnit(spec);
  const rollFromMultiplier = countFromMultipliers(spec, 'roll');
  const count = Math.max(roll, rollFromMultiplier || 0);
  const length = spec.lengths[0];
  if (!length) return undefined;
  return count > 0 ? length.quantity * count : length.quantity;
}

function getVolume(spec: PackageSpec): number | undefined {
  const { piece } = totalCountByUnit(spec);
  const pieceFromMultiplier = countFromMultipliers(spec, 'piece');
  const count = Math.max(piece, pieceFromMultiplier || 0);
  const volume = spec.volumes[0];
  if (!volume) return undefined;
  return count > 0 ? volume.quantity * count : volume.quantity;
}

function getWeight(spec: PackageSpec): number | undefined {
  const { piece } = totalCountByUnit(spec);
  const pieceFromMultiplier = countFromMultipliers(spec, 'piece');
  const count = Math.max(piece, pieceFromMultiplier || 0);
  const weight = spec.weights[0];
  if (!weight) return undefined;
  return count > 0 ? weight.quantity * count : weight.quantity;
}

export function parseLabelText(rawText: string): ParsedLabel {
  const normalizedText = normalizeRawText(rawText);
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => normalizeLine(line))
    .filter((line) => line.length > 0);

  const priceCandidates = lines.flatMap((line, sourceLine) => parseLinePriceCandidates(line, sourceLine));
  const currentPrice = resolveCurrentPrice(priceCandidates);
  const regularPrice = priceCandidates.find((candidate) => candidate.kind === 'regular')?.amount;
  const discountAmount = priceCandidates.find((candidate) => candidate.kind === 'discount')?.amount;

  const packageSpec = parsePackageSpec(lines);
  const productCandidates = lines
    .map((line, sourceLine) => ({ name: line, confidence: 0.6, sourceLine }))
    .filter((candidate) => candidate.name.match(/[A-Za-z0-9\u4E00-\u9FFF]/));

  const productName = productCandidates[0]?.name;

  return {
    rawText,
    normalizedText,
    lines,
    productName,
    productCandidates: productCandidates as ProductCandidate[],
    priceCandidates: priceCandidates.map((candidate) => ({
      amount: candidate.amount,
      rawText: candidate.rawText,
      sourceLine: candidate.sourceLine,
      kind: candidate.kind
    })),
    currentPrice,
    regularPrice,
    discountAmount,
    packageSpec,
    confidence: createConfidence(priceCandidates, packageSpec, productCandidates as ProductCandidate[])
  };
}

export function calculateUnitMetrics(parsed: ParsedLabel): UnitMetric {
  const { piece, roll, serving } = totalCountByUnit(parsed.packageSpec);
  const pieceFromMultiplier = countFromMultipliers(parsed.packageSpec, 'piece');
  const rollFromMultiplier = countFromMultipliers(parsed.packageSpec, 'roll');
  const servingFromMultiplier = countFromMultipliers(parsed.packageSpec, 'serving');
  const resolvedPiece = Math.max(piece, pieceFromMultiplier || 0);
  const resolvedRoll = Math.max(roll, rollFromMultiplier || 0);
  const resolvedServing = Math.max(serving, servingFromMultiplier || 0);
  const itemCount = resolvedPiece + resolvedRoll;
  const servingOrItemCount = resolvedServing > 0 ? resolvedServing : itemCount;

  const totalLengthM = getLength(parsed.packageSpec);
  const totalVolumeMl = getVolume(parsed.packageSpec);
  const totalWeightG = getWeight(parsed.packageSpec);
  const discountRate =
    parsed.regularPrice && parsed.discountAmount
      ? Number(((parsed.discountAmount / parsed.regularPrice) * 100).toFixed(1))
      : parsed.regularPrice && parsed.currentPrice
        ? Number((((parsed.regularPrice - parsed.currentPrice) / parsed.regularPrice) * 100).toFixed(1))
        : undefined;

  return {
    currentPrice: parsed.currentPrice,
    regularPrice: parsed.regularPrice,
    discountAmount: parsed.discountAmount,
    discountRate,
    itemCount: itemCount || undefined,
    rollCount: resolvedRoll || undefined,
    servingCount: resolvedServing || undefined,
    totalLengthM,
    totalVolumeMl,
    totalVolumeL: totalVolumeMl ? Number((totalVolumeMl / 1000).toFixed(4)) : undefined,
    totalWeightG,
    totalDaySupply: parsed.packageSpec.supplyDays ?? undefined,
    dailyDose: parsed.packageSpec.dailyDose ?? undefined,
    pricePerRoll: resolvedRoll > 0 && parsed.currentPrice ? Number((parsed.currentPrice / resolvedRoll).toFixed(4)) : undefined,
    pricePerMeter: totalLengthM && parsed.currentPrice ? Number((parsed.currentPrice / totalLengthM).toFixed(4)) : undefined,
    pricePerItem: itemCount > 0 && parsed.currentPrice ? Number((parsed.currentPrice / itemCount).toFixed(4)) : undefined,
    pricePerServing: servingOrItemCount > 0 && parsed.currentPrice ? Number((parsed.currentPrice / servingOrItemCount).toFixed(4)) : undefined,
    pricePerLiter: totalVolumeMl && parsed.currentPrice ? Number((parsed.currentPrice / (totalVolumeMl / 1000)).toFixed(4)) : undefined,
    pricePer100g: totalWeightG && parsed.currentPrice ? Number(((parsed.currentPrice / totalWeightG) * 100).toFixed(4)) : undefined,
    pricePerDay: parsed.packageSpec.supplyDays && parsed.currentPrice ? Number((parsed.currentPrice / parsed.packageSpec.supplyDays).toFixed(4)) : undefined
  };
}
