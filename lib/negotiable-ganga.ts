/**
 * Listados que no son "Ganga real" al precio publicado pero podrían serlo con una rebaja realista (3–8%).
 */

import { percentBelowMarket, type DealMarketConfidence } from "@/lib/deal-utils";
import {
  bargainTierFromScoreWithMileage,
  computeBargainScore,
  type BargainScoreInput,
  type BargainTier,
  type ComparableConfidence,
  type LiquidityTier,
} from "@/lib/bargain-score";

/** Rebaja sobre el precio del aviso que consideramos negociación realista (inclusive). */
export const NEGOTIABLE_REBATE_MIN_FRAC = 0.03;
export const NEGOTIABLE_REBATE_MAX_FRAC = 0.08;

export type NegotiableToGanga = {
  targetBargainPrice: number;
  negotiationGap: number;
  rebatePercent: number;
};

function bargainTierAtAskingPrice(input: BargainScoreInput): BargainTier {
  const { score, breakdown } = computeBargainScore(input);
  const pct = percentBelowMarket(input.askingPrice, input.fairValue);
  return bargainTierFromScoreWithMileage(score, breakdown.mileageVsAge, pct);
}

/**
 * Mayor precio entero (USD) estrictamente menor que el aviso donde la etiqueta sería "Ganga real",
 * buscado en [lo, hi]. Si no existe, devuelve null.
 */
function findMaxPriceForGangaReal(
  base: Omit<BargainScoreInput, "askingPrice">,
  lo: number,
  hi: number,
): number | null {
  if (hi < lo) return null;
  let best: number | null = null;
  let l = lo;
  let r = hi;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    const tier = bargainTierAtAskingPrice({ ...base, askingPrice: mid });
    if (tier === "ganga_real") {
      best = mid;
      l = mid + 1;
    } else {
      r = mid - 1;
    }
  }
  return best;
}

export type NegotiableGangaArgs = {
  askingPrice: number;
  fairValue: number;
  year?: number;
  mileageKm?: number | null;
  title?: string;
  comparableConfidence: ComparableConfidence;
  liquidityTier: LiquidityTier;
  marketConfidence: DealMarketConfidence;
  currentTier: BargainTier;
};

/**
 * Solo si: tier actual buena/justo; liquidez media o alta; confianza en datos y en mercado ambas media o alta;
 * y una rebaja del ~3% al ~8% sobre el aviso llevaría el mismo listado a «Ganga real» (mismo modelo de score).
 */
export function computeNegotiableToGanga(args: NegotiableGangaArgs): NegotiableToGanga | null {
  const ask = args.askingPrice;
  if (!Number.isFinite(ask) || ask <= 0) return null;
  if (!Number.isFinite(args.fairValue) || args.fairValue <= 0) return null;

  if (args.currentTier !== "precio_justo" && args.currentTier !== "buena_compra") return null;
  if (args.liquidityTier !== "high" && args.liquidityTier !== "medium") return null;
  if (args.comparableConfidence !== "high" && args.comparableConfidence !== "medium") return null;
  if (args.marketConfidence !== "high" && args.marketConfidence !== "medium") return null;

  const base: Omit<BargainScoreInput, "askingPrice"> = {
    fairValue: args.fairValue,
    year: args.year,
    mileageKm: args.mileageKm,
    title: args.title,
    comparableConfidence: args.comparableConfidence,
    liquidityTier: args.liquidityTier,
  };

  const askInt = Math.floor(ask);
  const hi = askInt - 1;
  const lo = Math.max(1, Math.floor(args.fairValue * 0.15));

  const target = findMaxPriceForGangaReal(base, lo, hi);
  if (target == null || target >= ask) return null;

  const negotiationGap = ask - target;
  const rebateFrac = negotiationGap / ask;

  if (rebateFrac < NEGOTIABLE_REBATE_MIN_FRAC - 1e-9 || rebateFrac > NEGOTIABLE_REBATE_MAX_FRAC + 1e-9) {
    return null;
  }

  return {
    targetBargainPrice: target,
    negotiationGap: Math.round(negotiationGap),
    rebatePercent: Math.round(rebateFrac * 1000) / 10,
  };
}
