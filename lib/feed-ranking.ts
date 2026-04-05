import type { BargainTier, ComparableConfidence, LiquidityTier } from "@/lib/bargain-score";

/**
 * Orden del feed: mejores oportunidades de reventa primero.
 * 1) Etiqueta (ganga → buena → justo → sobreprecio leve → sobreprecio alto)
 * 2) Mayor margen potencial
 * 3) Mayor confianza en comparables
 * 4) Mayor liquidez
 */

export type FeedRankableDeal = {
  id: string;
  bargainTier: BargainTier;
  dealScore: number;
  potentialMargin: number;
  comparableConfidence: ComparableConfidence;
  liquidityTier: LiquidityTier;
};

/** Menor = mejor posición en el feed. Sobreprecio se parte en leve / alto por score dentro del tramo. */
export function feedLabelPriorityRank(d: FeedRankableDeal): number {
  switch (d.bargainTier) {
    case "ganga_real":
      return 0;
    case "buena_compra":
      return 1;
    case "precio_justo":
      return 2;
    case "sobreprecio":
      return d.dealScore >= 12 ? 3 : 4;
    default:
      return 99;
  }
}

function comparableConfidenceRank(c: ComparableConfidence): number {
  switch (c) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    case "very_low":
      return 0;
  }
}

function liquidityTierRank(t: LiquidityTier): number {
  switch (t) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    case "unknown":
      return 0;
  }
}

/** Comparador para Array.sort: orden ascendente de “prioridad” (mejor primero → return negativo si a va antes). */
export function compareDealsForFeed(a: FeedRankableDeal, b: FeedRankableDeal): number {
  const lr = feedLabelPriorityRank(a) - feedLabelPriorityRank(b);
  if (lr !== 0) return lr;

  if (b.potentialMargin !== a.potentialMargin) {
    return b.potentialMargin - a.potentialMargin;
  }

  const cr =
    comparableConfidenceRank(b.comparableConfidence) - comparableConfidenceRank(a.comparableConfidence);
  if (cr !== 0) return cr;

  const lq = liquidityTierRank(b.liquidityTier) - liquidityTierRank(a.liquidityTier);
  if (lq !== 0) return lq;

  if (b.dealScore !== a.dealScore) {
    return b.dealScore - a.dealScore;
  }

  return a.id.localeCompare(b.id);
}

export function sortDealsForFeed<T extends FeedRankableDeal>(deals: T[]): T[] {
  return [...deals].sort(compareDealsForFeed);
}
