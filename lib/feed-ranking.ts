import { businessDisplayLabelFeedRank, type BusinessDisplayLabel } from "@/lib/business-opportunity-layer";
import type { ComparableConfidence, LiquidityTier } from "@/lib/bargain-score";
import type { DealMarketConfidence } from "@/lib/deal-utils";

/**
 * Orden del feed: capa de negocio primero, luego márgenes modelados, confianza y liquidez.
 */

export type FeedRankableDeal = {
  id: string;
  businessDisplayLabel: BusinessDisplayLabel;
  businessNegotiatedMargin: number;
  businessGrossMargin: number;
  /** Para ordenar «Negociable» por fuerza del escenario simulado. */
  businessPotentialMargin: number;
  comparableConfidence: ComparableConfidence;
  marketConfidence: DealMarketConfidence;
  liquidityTier: LiquidityTier;
  dealScore: number;
};

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

function marketConfidenceRank(m: DealMarketConfidence): number {
  switch (m) {
    case "high":
      return 3;
    case "medium":
      return 2;
    case "low":
      return 1;
    default:
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

/** Comparador: mejor primero (return negativo si a va antes que b). */
export function compareDealsForFeed(a: FeedRankableDeal, b: FeedRankableDeal): number {
  const lr = businessDisplayLabelFeedRank(a.businessDisplayLabel) - businessDisplayLabelFeedRank(b.businessDisplayLabel);
  if (lr !== 0) return lr;

  if (a.businessDisplayLabel === "negociable" && b.businessDisplayLabel === "negociable") {
    if (b.businessPotentialMargin !== a.businessPotentialMargin) {
      return b.businessPotentialMargin - a.businessPotentialMargin;
    }
  }

  if (b.businessNegotiatedMargin !== a.businessNegotiatedMargin) {
    return b.businessNegotiatedMargin - a.businessNegotiatedMargin;
  }

  if (b.businessGrossMargin !== a.businessGrossMargin) {
    return b.businessGrossMargin - a.businessGrossMargin;
  }

  const cr =
    comparableConfidenceRank(b.comparableConfidence) - comparableConfidenceRank(a.comparableConfidence);
  if (cr !== 0) return cr;

  const mr = marketConfidenceRank(b.marketConfidence) - marketConfidenceRank(a.marketConfidence);
  if (mr !== 0) return mr;

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
