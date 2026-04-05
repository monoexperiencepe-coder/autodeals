import { percentBelowMarket, marketConfidenceLevel, type DealMarketConfidence } from "@/lib/deal-utils";
import {
  adjustedFairValueFromListingPeers,
  bargainTierFromScoreWithMileage,
  comparableConfidenceFromMarket,
  computeBargainScore,
  computeResaleValues,
  fairValueListingToTransactionMultiplierPe,
  type BargainScoreBreakdown,
  type BargainTier,
  type ComparableConfidence,
  type LiquidityTier,
  type TrimTier,
} from "@/lib/bargain-score";
import { computeNegotiableToGanga, type NegotiableToGanga } from "@/lib/negotiable-ganga";
import { sortDealsForFeed } from "@/lib/feed-ranking";
import {
  classifyValuationFamily,
  economySmallStrictMileageFamily,
  type ValuationFamily,
} from "@/lib/vehicle-comparable-rules";
import { classifyVehicleLiquidityPeru } from "@/lib/vehicle-liquidity-peru";
import { computePeerMarketMeta, type MarketReferenceTier, type PeerListingInput } from "@/lib/peer-market-price";
import dealsJson from "../scraper/deals.json";

export type CarListing = {
  id: string;
  title: string;
  year?: number;
  mileageKm?: number | null;
  askingPrice?: number;
  /** Valor de mercado conservador (peer median). */
  fairValue?: number;
  marketPrice?: number;
  currency?: string;
  listingUrl: string;
  /** Atributos estructurados NeoAuto (scraper); opcionales para compatibilidad con JSON antiguo. */
  fuelType?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  trim?: string | null;
  engineDescription?: string | null;
  engineDisplacementCc?: number | null;
  engineCylinders?: number | null;
  engineClass?: string | null;
  bodyType?: string | null;
  isHybrid?: boolean | null;
  isElectric?: boolean | null;
  isDiesel?: boolean | null;
  doors?: number | null;
  cabType?: string | null;
  seats?: number | null;
  /** Pestaña NeoAuto de listado (todos | seminuevo | usado | nuevo_0km). */
  listingCategory?: string | null;
};

type DealsJsonRow = Record<string, unknown>;

function readString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  return s.length ? s : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function readNullableString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const s = value.trim();
  return s.length ? s : null;
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  const n = readNumber(value);
  return n !== undefined ? n : null;
}

function readNullableBoolean(value: unknown): boolean | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value === true) return true;
  if (value === false) return false;
  return undefined;
}

export type CarDeal = CarListing & {
  /**
   * Valor justo mostrado y usado en score: referencia de avisos comparables × `fairValueListingToTransactionMult` (cierre Perú).
   */
  fairValue: number;
  /** Referencia previa a la corrección (solo comparables por precio de aviso); no se muestra en UI. */
  fairValueListingBased: number;
  /** Multiplicador aviso→cierre aplicado a la referencia (típ. 0,93; híbrido Corolla Cross reciente ver `bargain-score`). */
  fairValueListingToTransactionMult: number;
  /** Valor típico de reventa ≈ fairValue × 0,92 (base). */
  resaleValue: number;
  /** resaleValue − precio pedido (orientativo). */
  potentialMargin: number;
  dealScore: number;
  bargainTier: BargainTier;
  comparableConfidence: ComparableConfidence;
  liquidityTier: LiquidityTier;
  trimTier: TrimTier;
  scoreBreakdown: BargainScoreBreakdown;
  percentBelow: number;
  marketComparableCount: number;
  marketReferenceTier: MarketReferenceTier;
  marketMinPeersPass: 1 | 2 | 3 | null;
  marketConfidence: DealMarketConfidence;
  marketHighPriceSpread: boolean;
  marketSkippedUpperPriceTailTrim: boolean;
  /** Familia de valoración (comparables / reglas de segmento). */
  valuationFamily: ValuationFamily;
  /** Si se relajó el filtro por atributos estructurados por pocos comparables. */
  marketStructuredComparableRelaxed: boolean;
  /** Pick-up estructurado: tamaño del pool de comparables estrictos en la pasada ganadora (ver `peer-market-price`). */
  strictComparablesCount: number;
  /** Pick-up estructurado: muestra estricta menor a 3 o sin peers (valor justo = precio del aviso). */
  usedConservativePickupFallback: boolean;
  /** Rebaja realista (3–8%) que llevaría a "Ganga real" al mismo modelo de score; ver reglas en `negotiable-ganga`. */
  negotiableToGanga?: NegotiableToGanga;
};

type ParsedRow = {
  id: string;
  title: string;
  year?: number;
  mileageKm: number | null;
  askingPrice?: number;
  currency?: string;
  listingUrl: string;
  brand?: string;
  model?: string;
  fuelType?: string | null;
  transmission?: string | null;
  drivetrain?: string | null;
  trim?: string | null;
  engineDescription?: string | null;
  engineDisplacementCc?: number | null;
  engineCylinders?: number | null;
  engineClass?: string | null;
  bodyType?: string | null;
  isHybrid?: boolean | null;
  isElectric?: boolean | null;
  isDiesel?: boolean | null;
  doors?: number | null;
  cabType?: string | null;
  seats?: number | null;
  listingCategory?: string | null;
};

export function getMockDeals(): CarDeal[] {
  const rows = Array.isArray(dealsJson) ? (dealsJson as unknown[]) : [];

  const parsed: ParsedRow[] = [];
  const peerInputs: PeerListingInput[] = [];

  rows.forEach((maybeRow, idx) => {
    if (!maybeRow || typeof maybeRow !== "object") return;
    const row = maybeRow as DealsJsonRow;

    const listingUrl = readString(row.link) ?? "about:blank";
    const brand = readString(row.brand);
    const model = readString(row.model);
    const title =
      readString(row.title) ??
      [brand, model].filter((x): x is string => Boolean(x)).join(" ").trim() ??
      "Aviso sin título";
    const currency = readString(row.currency);
    const year = readNumber(row.year);
    const mileageKm = readNumber(row.km);
    const askingPrice = readNumber(row.price);
    const id = readString(row.id) ?? String(idx);

    const structured = {
      fuelType: readNullableString(row.fuelType),
      transmission: readNullableString(row.transmission),
      drivetrain: readNullableString(row.drivetrain),
      trim: readNullableString(row.trim),
      engineDescription: readNullableString(row.engineDescription),
      engineDisplacementCc: readNullableNumber(row.engineDisplacementCc),
      engineCylinders: readNullableNumber(row.engineCylinders),
      engineClass: readNullableString(row.engineClass),
      bodyType: readNullableString(row.bodyType),
      isHybrid: readNullableBoolean(row.isHybrid),
      isElectric: readNullableBoolean(row.isElectric),
      isDiesel: readNullableBoolean(row.isDiesel),
      doors: readNullableNumber(row.doors),
      cabType: readNullableString(row.cabType),
      seats: readNullableNumber(row.seats),
      listingCategory: readNullableString(row.listingCategory),
    };

    parsed.push({
      id,
      title,
      year,
      mileageKm: mileageKm ?? null,
      askingPrice,
      currency,
      listingUrl,
      brand,
      model,
      ...structured,
    });

    const peerRow: PeerListingInput = {
      id,
      brand,
      model,
      year,
      askingPrice,
      title,
      currency,
      ...structured,
    };
    peerInputs.push(peerRow);
  });

  const metaById = computePeerMarketMeta(peerInputs);

  const enriched: CarDeal[] = parsed.map((p) => {
    const peerMeta = metaById.get(p.id);
    const fairValueListingBased = peerMeta?.marketPrice ?? 0;
    const fvCtx = {
      brand: p.brand,
      model: p.model,
      title: p.title,
      year: p.year,
      mileageKm: p.mileageKm,
      bodyType: p.bodyType,
      isHybrid: p.isHybrid,
    };
    const fairValueListingToTransactionMult = fairValueListingToTransactionMultiplierPe(fvCtx);
    const fairValue = adjustedFairValueFromListingPeers(fairValueListingBased, fvCtx);
    const marketComparableCount = peerMeta?.comparableCount ?? 0;
    const marketReferenceTier = peerMeta?.tier ?? "fallback_self";
    const marketMinPeersPass = peerMeta?.minPeersPass ?? null;
    const marketHighPriceSpread = peerMeta?.highPriceSpread ?? false;
    const marketSkippedUpperPriceTailTrim = peerMeta?.skippedUpperPriceTailTrim ?? false;
    const strictComparablesCount = peerMeta?.strictComparablesCount ?? marketComparableCount;
    const usedConservativePickupFallback = peerMeta?.usedConservativePickupFallback ?? false;

    const valuationFamily = classifyValuationFamily({
      id: p.id,
      brand: p.brand,
      model: p.model,
      title: p.title,
      year: p.year,
      askingPrice: p.askingPrice,
      currency: p.currency,
      fuelType: p.fuelType,
      transmission: p.transmission,
      drivetrain: p.drivetrain,
      trim: p.trim,
      engineDescription: p.engineDescription,
      engineDisplacementCc: p.engineDisplacementCc,
      engineCylinders: p.engineCylinders,
      engineClass: p.engineClass,
      bodyType: p.bodyType,
      isHybrid: p.isHybrid,
      isElectric: p.isElectric,
      isDiesel: p.isDiesel,
      doors: p.doors,
      cabType: p.cabType,
      seats: p.seats,
    });

    const marketConfidence = marketConfidenceLevel({
      comparableCount: marketComparableCount,
      tier: marketReferenceTier,
      highPriceSpread: marketHighPriceSpread,
      skippedUpperPriceTailTrim: marketSkippedUpperPriceTailTrim,
      structuredComparableRelaxed: peerMeta?.structuredComparableRelaxed ?? false,
      pickupSparseStrictComparable:
        valuationFamily === "pickup" && usedConservativePickupFallback && marketComparableCount === 2,
    });

    const comparableConfidence = comparableConfidenceFromMarket(marketConfidence, {
      tier: marketReferenceTier,
      comparableCount: marketComparableCount,
    });

    const liquidityTier = classifyVehicleLiquidityPeru(p.brand, p.model);

    const { resaleValue, potentialMargin } = computeResaleValues(fairValue, p.askingPrice ?? 0);

    const { score: dealScore, breakdown: scoreBreakdown, trimTier } = computeBargainScore({
      fairValue,
      askingPrice: p.askingPrice ?? 0,
      year: p.year,
      mileageKm: p.mileageKm,
      title: p.title,
      comparableConfidence,
      liquidityTier,
      strictEconomySmallMileage: economySmallStrictMileageFamily(valuationFamily),
    });

    const percentBelow = percentBelowMarket(p.askingPrice ?? 0, fairValue);
    let bargainTier = bargainTierFromScoreWithMileage(
      dealScore,
      scoreBreakdown.mileageVsAge,
      percentBelow,
    );

    const pickupInsufficientStrict =
      valuationFamily === "pickup" && usedConservativePickupFallback;
    if (
      pickupInsufficientStrict &&
      (bargainTier === "ganga_real" || bargainTier === "buena_compra")
    ) {
      bargainTier = "precio_justo";
    }

    const negotiableToGanga = pickupInsufficientStrict
      ? undefined
      : computeNegotiableToGanga({
          askingPrice: p.askingPrice ?? 0,
          fairValue,
          year: p.year,
          mileageKm: p.mileageKm,
          title: p.title,
          comparableConfidence,
          liquidityTier,
          marketConfidence,
          currentTier: bargainTier,
        }) ?? undefined;

    return {
      id: p.id,
      title: p.title,
      year: p.year,
      mileageKm: p.mileageKm,
      askingPrice: p.askingPrice,
      fairValue,
      fairValueListingBased,
      fairValueListingToTransactionMult,
      currency: p.currency,
      listingUrl: p.listingUrl,
      fuelType: p.fuelType,
      transmission: p.transmission,
      drivetrain: p.drivetrain,
      trim: p.trim,
      engineDescription: p.engineDescription,
      engineDisplacementCc: p.engineDisplacementCc,
      engineCylinders: p.engineCylinders,
      engineClass: p.engineClass,
      bodyType: p.bodyType,
      isHybrid: p.isHybrid,
      isElectric: p.isElectric,
      isDiesel: p.isDiesel,
      doors: p.doors,
      cabType: p.cabType,
      seats: p.seats,
      listingCategory: p.listingCategory,
      resaleValue,
      potentialMargin,
      dealScore,
      bargainTier,
      comparableConfidence,
      liquidityTier,
      trimTier,
      scoreBreakdown,
      percentBelow,
      marketComparableCount,
      marketReferenceTier,
      marketMinPeersPass,
      marketConfidence,
      marketHighPriceSpread,
      marketSkippedUpperPriceTailTrim,
      valuationFamily,
      marketStructuredComparableRelaxed: peerMeta?.structuredComparableRelaxed ?? false,
      strictComparablesCount,
      usedConservativePickupFallback,
      negotiableToGanga,
    };
  });

  return sortDealsForFeed(enriched);
}
