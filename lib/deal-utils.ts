import type { MarketReferenceTier } from "@/lib/peer-market-price";

/**
 * Utilidades de referencia de mercado y confianza en comparables (peer listings).
 */

/**
 * Porcentaje que el precio pedido está por debajo del valor de referencia (positivo = por debajo).
 */
export function percentBelowMarket(askingPrice: number, marketPrice: number): number {
  if (marketPrice <= 0) return 0;
  const raw = ((marketPrice - askingPrice) / marketPrice) * 100;
  return Math.round(raw * 10) / 10;
}

export type MarketConfidenceInput = {
  comparableCount: number;
  tier: MarketReferenceTier;
  highPriceSpread?: boolean;
  skippedUpperPriceTailTrim?: boolean;
  /** Comparables tras relajar filtros estructurados (pickup/SUV/Toyota híbrido, etc.). */
  structuredComparableRelaxed?: boolean;
  /** Pick-up estructurado con muestra estricta de 2 avisos: bajar un escalón la confianza mercado. */
  pickupSparseStrictComparable?: boolean;
};

/** Nivel de fiabilidad de los comparables (3 niveles → mapeo a 4 en bargain-score). */
export type DealMarketConfidence = "high" | "medium" | "low";

export function isCloseComparableTier(tier: MarketReferenceTier): boolean {
  return tier === "bm_trim_pm1" || tier === "bm_trim_pm2" || tier === "premium_trim_pm1";
}

function downgradeConfidenceOneStep(level: DealMarketConfidence): DealMarketConfidence {
  if (level === "high") return "medium";
  if (level === "medium") return "low";
  return "low";
}

export function marketConfidenceLevel(meta: MarketConfidenceInput): DealMarketConfidence {
  const {
    comparableCount,
    tier,
    highPriceSpread,
    skippedUpperPriceTailTrim,
    structuredComparableRelaxed,
    pickupSparseStrictComparable,
  } = meta;
  let level: DealMarketConfidence;
  if (tier === "fallback_self" || comparableCount <= 0 || comparableCount === 1) {
    level = "low";
  } else if (highPriceSpread) {
    level = comparableCount <= 2 ? "low" : "medium";
  } else if (comparableCount === 2) {
    level = "medium";
  } else {
    level = isCloseComparableTier(tier) ? "high" : "medium";
  }
  if (skippedUpperPriceTailTrim && comparableCount > 0) {
    level = downgradeConfidenceOneStep(level);
  }
  if (structuredComparableRelaxed && comparableCount > 0 && comparableCount < 5) {
    level = downgradeConfidenceOneStep(level);
  }
  if (pickupSparseStrictComparable && comparableCount === 2) {
    level = downgradeConfidenceOneStep(level);
  }
  return level;
}

export function marketConfidenceShortLabelEs(level: DealMarketConfidence): string {
  switch (level) {
    case "high":
      return "Comparables: alta confianza";
    case "medium":
      return "Comparables: confianza media";
    case "low":
      return "Comparables: baja confianza";
  }
}
