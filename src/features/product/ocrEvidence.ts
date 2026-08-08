import type { OcrLine, ParsedLabel, PriceCandidate } from '@/types/commerce';

function scoreCandidate(candidate: PriceCandidate, line: OcrLine | undefined, imageHeight: number, parsed: ParsedLabel): number {
  const source = parsed.lines[candidate.sourceLine] ?? '';
  let score = (line?.confidence ?? 0) / 100;
  if (/税込|価格|円/u.test(source)) score += 2;
  if (imageHeight > 0 && line) score += Math.max(0, line.bbox.y0 / imageHeight);
  if (/商品番号|品番|jan|\bno\.?/iu.test(source)) score -= 4;
  if (/\b\d+(?:\.\d+)?\s*(?:g|kg|ml|l|m|mg)|個あたり|1個|1本|1m/u.test(source)) score -= 3;
  if (/通常価格/u.test(source)) score -= 2;
  if (/[−－-]\s*\d/u.test(source)) score -= 3;
  if (parsed.regularPrice && parsed.discountAmount && candidate.amount === parsed.regularPrice - parsed.discountAmount) score += 5;
  return score;
}

/**
 * Uses OCR line confidence and label position only to rank price candidates.
 * It never bypasses the confirmation form, and does not invent a price.
 */
export function applyOcrEvidence(parsed: ParsedLabel, lines: OcrLine[]): ParsedLabel {
  if (parsed.regularPrice && parsed.discountAmount && parsed.regularPrice > parsed.discountAmount) {
    return { ...parsed, currentPrice: parsed.regularPrice - parsed.discountAmount };
  }
  const imageHeight = Math.max(0, ...lines.map((line) => line.bbox.y1));
  const ranked = parsed.priceCandidates
    .filter((candidate) => candidate.kind === 'candidate')
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(candidate, lines.find((line) => line.text.includes(candidate.rawText)), imageHeight, parsed)
    }))
    .sort((left, right) => right.score - left.score);
  return ranked[0] ? { ...parsed, currentPrice: ranked[0].candidate.amount } : parsed;
}
