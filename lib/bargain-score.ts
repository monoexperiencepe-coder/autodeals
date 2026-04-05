/**
 * Detector de ganga orientado a reventa (Perú): fairValue orientado a transacción (no solo avisos),
 * resaleValue típico de salida, margen potencial y puntuación explícita con componentes normalizados.
 */

import type { DealMarketConfidence } from "@/lib/deal-utils";
import { trimSignalsFromTitle, type MarketReferenceTier } from "@/lib/peer-market-price";

const REFERENCE_YEAR = 2026;
const DEFAULT_RESALE_FACTOR = 0.92;

/**
 * Uso anual de referencia en Perú (urbano / mixto). Rango típico 12.000–15.000 km/año; usamos el punto medio.
 */
export const EXPECTED_KM_PER_YEAR_PE = 13_500;
/** Mínimo de km “esperables” para un auto casi nuevo (evita dividir por casi cero). */
const EXPECTED_KM_FLOOR_NEW = 10_000;

export type MileageVsAgeSeverity =
  | "unknown"
  | "below_typical"
  | "typical"
  | "slightly_high"
  | "clearly_high"
  | "far_high"
  | "extreme";

export type MileageVsAgeAnalysis = {
  ageYears: number | null;
  expectedKm: number | null;
  actualKm: number | null;
  ratio: number | null;
  severity: MileageVsAgeSeverity;
};

/**
 * Compara km reales vs esperados por edad (km/año Perú). Sin año o sin km → severity unknown.
 */
export function analyzeMileageVsAge(
  year: number | undefined,
  km: number | null | undefined,
): MileageVsAgeAnalysis {
  if (km == null || km < 0 || !Number.isFinite(km)) {
    return { ageYears: null, expectedKm: null, actualKm: km ?? null, ratio: null, severity: "unknown" };
  }
  if (year == null || year < 1990 || year > REFERENCE_YEAR + 1) {
    return { ageYears: null, expectedKm: null, actualKm: km, ratio: null, severity: "unknown" };
  }

  const ageYears = Math.max(0, REFERENCE_YEAR - year);
  const expectedKm =
    ageYears === 0
      ? EXPECTED_KM_FLOOR_NEW
      : Math.max(EXPECTED_KM_FLOOR_NEW, ageYears * EXPECTED_KM_PER_YEAR_PE);
  const ratio = km / expectedKm;

  let severity: MileageVsAgeSeverity;
  if (ratio < 0.88) severity = "below_typical";
  else if (ratio <= 1.1) severity = "typical";
  else if (ratio <= 1.28) severity = "slightly_high";
  else if (ratio <= 1.45) severity = "clearly_high";
  else if (ratio <= 1.68) severity = "far_high";
  else severity = "extreme";

  return { ageYears, expectedKm, actualKm: km, ratio, severity };
}

function mileageVsAgeResalePoints(analysis: MileageVsAgeAnalysis): number {
  switch (analysis.severity) {
    case "unknown":
      return 0;
    case "below_typical":
      return 5;
    case "typical":
      return 4;
    case "slightly_high":
      return -4;
    case "clearly_high":
      return -12;
    case "far_high":
      return -22;
    case "extreme":
      return -32;
    default:
      return 0;
  }
}

/** Texto corto para UI / detalle del score (es-PE). */
export function mileageVsAgeNoteEs(analysis: MileageVsAgeAnalysis): string {
  if (analysis.severity === "unknown") {
    return "Kilometraje o año no disponible: no se aplica ajuste km vs edad (referencia ~12–15k km/año en Perú).";
  }
  const { ageYears, expectedKm, actualKm, ratio, severity } = analysis;
  const expR = Math.round(expectedKm!);
  const actR = Math.round(actualKm!);
  const rPct = ratio != null ? (ratio * 100).toFixed(0) : "—";
  const ageLabel = ageYears === 0 ? "0 años (muy reciente)" : `${ageYears} año${ageYears === 1 ? "" : "s"}`;
  const sevEs: Record<MileageVsAgeSeverity, string> = {
    unknown: "",
    below_typical: "por debajo del uso típico para la edad",
    typical: "alineado con uso típico",
    slightly_high: "algo por encima del uso típico",
    clearly_high: "claramente por encima del uso típico",
    far_high: "muy por encima del uso típico (penaliza fuerte la puntuación)",
    extreme: "extremadamente alto para la edad (tope de etiqueta y umbral de “buena compra” más exigente)",
  };
  let capNote = "";
  if (ratio != null && ratio > MILEAGE_RATIO_CAP_PRECIOS_JUSTO) {
    capNote = ` Si el km supera ${(MILEAGE_RATIO_CAP_PRECIOS_JUSTO * 100).toFixed(0)}% de lo esperado, la etiqueta queda como máximo «Precio justo» salvo un descuento muy fuerte (≈≥${MILEAGE_CAP_EXCEPTION_MIN_PERCENT_BELOW}% bajo el valor justo).`;
  }
  return (
    `Km ${actR.toLocaleString("es-PE")} vs ~${expR.toLocaleString("es-PE")} km esperados (${ageLabel}, base ~${EXPECTED_KM_PER_YEAR_PE.toLocaleString("es-PE")} km/año Perú). ` +
    `Ratio ≈ ${rPct}% del esperado — ${sevEs[severity]}.${capNote}`
  );
}

const MILEAGE_SEVERITY_ESCALATION_ORDER: MileageVsAgeSeverity[] = [
  "below_typical",
  "typical",
  "slightly_high",
  "clearly_high",
  "far_high",
  "extreme",
];

/** Sedán/hatch económico: sube un nivel la severidad km/edad si el uso es alto (más penalización). */
function escalateMileageSeverityForEconomySmall(
  analysis: MileageVsAgeAnalysis,
  enabled: boolean,
): MileageVsAgeAnalysis {
  if (!enabled || analysis.severity === "unknown" || analysis.ratio == null) return analysis;
  if (analysis.ratio <= 1.12) return analysis;
  const idx = MILEAGE_SEVERITY_ESCALATION_ORDER.indexOf(analysis.severity);
  if (idx < 0 || idx >= MILEAGE_SEVERITY_ESCALATION_ORDER.length - 1) return analysis;
  return { ...analysis, severity: MILEAGE_SEVERITY_ESCALATION_ORDER[idx + 1]! };
}

type BuenaFloor = { minScore: number; minPercentBelow: number };

const BUENA_FLOOR_BY_SEVERITY: Partial<Record<MileageVsAgeSeverity, BuenaFloor>> = {
  slightly_high: { minScore: 53, minPercentBelow: 4 },
  clearly_high: { minScore: 57, minPercentBelow: 6 },
  far_high: { minScore: 62, minPercentBelow: 9 },
  extreme: { minScore: 70, minPercentBelow: 12 },
};

/** Por encima de esto (km real / esperado), la etiqueta no pasa de «Precio justo» salvo descuento muy fuerte. */
export const MILEAGE_RATIO_CAP_PRECIOS_JUSTO = 1.8;
/** % mínimo por debajo del valor justo para permitir Ganga/Buena si el ratio de km supera el tope. */
export const MILEAGE_CAP_EXCEPTION_MIN_PERCENT_BELOW = 15;

/**
 * Ajusta la etiqueta según km vs edad: no “Ganga real” si el uso es muy alto;
 * “Buena compra” solo con score o descuento claro frente al valor justo.
 * Si km &gt; 1,8× lo esperado para la edad, tope «Precio justo» salvo descuento muy grande (% vs valor justo).
 */
export function bargainTierFromScoreWithMileage(
  score: number,
  analysis: MileageVsAgeAnalysis,
  percentBelow: number,
): BargainTier {
  let tier = bargainTierFromScore(score);

  if (analysis.severity === "unknown" || analysis.ratio == null) {
    return tier;
  }

  if (tier === "ganga_real" && (analysis.severity === "far_high" || analysis.severity === "extreme")) {
    tier = "buena_compra";
  }

  const floor = BUENA_FLOOR_BY_SEVERITY[analysis.severity];
  if (tier === "buena_compra" && floor != null) {
    const strongEnough = score >= floor.minScore || percentBelow >= floor.minPercentBelow;
    if (!strongEnough) {
      tier = "precio_justo";
    }
  }

  if (
    analysis.ratio > MILEAGE_RATIO_CAP_PRECIOS_JUSTO &&
    percentBelow < MILEAGE_CAP_EXCEPTION_MIN_PERCENT_BELOW
  ) {
    if (tier === "ganga_real" || tier === "buena_compra") {
      tier = "precio_justo";
    }
  }

  return tier;
}

/**
 * Precios de aviso en Perú suelen estar por encima del cierre real. Se aplica a la referencia
 * agregada de comparables antes de brecha, reventa y UI de “valor justo”.
 */
export const FAIR_VALUE_LISTING_TO_TRANSACTION_PE = 0.93;

/**
 * Híbridos Toyota Corolla Cross recientes con poco uso: en Perú el precio de aviso suele acercarse más al cierre
 * que el recorte global 7%; un corte menor evita valor justo demasiado bajo y falsas «gangas».
 */
export const FAIR_VALUE_LISTING_TO_TRANSACTION_COROLLA_CROSS_HYBRID_PE = 0.965;

const MIN_YEAR_COROLLA_CROSS_HYBRID_ADJ = 2024;
/** Ratio km vs esperado Perú: hasta ~12% por encima del típico sigue considerándose «bajo / normal» para este ajuste. */
const MAX_KM_RATIO_COROLLA_CROSS_HYBRID_ADJ = 1.12;

function normTokenFairValue(s: string | undefined): string {
  if (typeof s !== "string") return "";
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

function normModelFairValue(model: string | undefined): string {
  if (typeof model !== "string") return "";
  return model
    .trim()
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Toyota Corolla Cross (no sedán Corolla): marca + modelo y/o título contienen COROLLA y CROSS.
 */
export function isToyotaCorollaCrossListing(brand?: string, model?: string, title?: string): boolean {
  if (normTokenFairValue(brand) !== "TOYOTA") return false;
  const m = normModelFairValue(model);
  const t = normTokenFairValue(title).replace(/,/g, " ");
  const haystack = `${m} ${t}`;
  return /\bCOROLLA\b/.test(haystack) && /\bCROSS\b/.test(haystack);
}

export function isPeruCorollaCrossHybridLateModelLowKm(args: {
  brand?: string;
  model?: string;
  title?: string;
  year?: number;
  mileageKm?: number | null;
}): boolean {
  if (!isToyotaCorollaCrossListing(args.brand, args.model, args.title)) return false;
  /** Híbrido solo si consta en el título del aviso (criterio explícito Perú / reventa). */
  if (!trimSignalsFromTitle(args.title).hybrid) return false;
  const y = args.year;
  if (y == null || y < MIN_YEAR_COROLLA_CROSS_HYBRID_ADJ || y > REFERENCE_YEAR + 1) return false;

  const a = analyzeMileageVsAge(args.year, args.mileageKm);
  if (a.severity === "unknown" || a.ratio == null) return false;
  return a.ratio <= MAX_KM_RATIO_COROLLA_CROSS_HYBRID_ADJ;
}

/**
 * Toyota SUV/minivan híbrido reciente con poco km: factor aviso→cierre menos agresivo (datos estructurados y/o título).
 */
export function isPeruToyotaHybridSuvFairValueSoftMultiplier(args: AdjustedFairValueFromPeersContext): boolean {
  if (normTokenFairValue(args.brand) !== "TOYOTA") return false;
  const hybridStruct = args.isHybrid === true;
  const hybridTitle = trimSignalsFromTitle(args.title).hybrid;
  if (!hybridStruct && !hybridTitle) return false;
  const y = args.year;
  if (y == null || y < MIN_YEAR_COROLLA_CROSS_HYBRID_ADJ || y > REFERENCE_YEAR + 1) return false;
  const cross = isToyotaCorollaCrossListing(args.brand, args.model, args.title);
  const bt = args.bodyType;
  const suvLike = bt === "suv" || bt === "minivan" || cross;
  if (!suvLike) return false;
  const a = analyzeMileageVsAge(args.year, args.mileageKm);
  if (a.severity === "unknown" || a.ratio == null) return false;
  return a.ratio <= MAX_KM_RATIO_COROLLA_CROSS_HYBRID_ADJ;
}

export type AdjustedFairValueFromPeersContext = {
  brand?: string;
  model?: string;
  title?: string;
  year?: number;
  mileageKm?: number | null;
  bodyType?: string | null;
  isHybrid?: boolean | null;
};

export function fairValueListingToTransactionMultiplierPe(ctx?: AdjustedFairValueFromPeersContext): number {
  if (
    ctx &&
    (isPeruToyotaHybridSuvFairValueSoftMultiplier(ctx) || isPeruCorollaCrossHybridLateModelLowKm(ctx))
  ) {
    return FAIR_VALUE_LISTING_TO_TRANSACTION_COROLLA_CROSS_HYBRID_PE;
  }
  return FAIR_VALUE_LISTING_TO_TRANSACTION_PE;
}

export function adjustedFairValueFromListingPeers(
  fairValueFromListings: number,
  ctx?: AdjustedFairValueFromPeersContext,
): number {
  const x = fairValueFromListings;
  if (x <= 0 || !Number.isFinite(x)) return 0;
  const mult = fairValueListingToTransactionMultiplierPe(ctx);
  return Math.round(x * mult);
}

export type BargainTier = "ganga_real" | "buena_compra" | "precio_justo" | "sobreprecio";

export type ComparableConfidence = "high" | "medium" | "low" | "very_low";

export type LiquidityTier = "high" | "medium" | "low" | "unknown";

export type TrimTier = "full_top" | "mid" | "base" | "unknown";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Confianza en comparables (4 niveles) para el término 0–1 y el multiplicador. */
export function comparableConfidenceFromMarket(
  level: DealMarketConfidence,
  meta: { tier: MarketReferenceTier; comparableCount: number },
): ComparableConfidence {
  if (meta.tier === "fallback_self" || meta.comparableCount <= 0) return "very_low";
  if (meta.comparableCount === 1) return "very_low";
  if (level === "low") return "low";
  if (level === "medium") return "medium";
  return "high";
}

export function confidenceNormForFormula(c: ComparableConfidence): number {
  switch (c) {
    case "high":
      return 1;
    case "medium":
      return 0.78;
    case "low":
      return 0.48;
    case "very_low":
      return 0.22;
  }
}

export function confidenceMultiplier(c: ComparableConfidence): number {
  switch (c) {
    case "high":
      return 1;
    case "medium":
      return 0.8;
    case "low":
      return 0.55;
    case "very_low":
      return 0.3;
  }
}

export function liquidityNormForFormula(t: LiquidityTier): number {
  switch (t) {
    case "high":
      return 1;
    case "medium":
      return 0.62;
    case "low":
      return 0.28;
    case "unknown":
      return 0.1;
  }
}

export function liquidityPoints(t: LiquidityTier): number {
  switch (t) {
    case "high":
      return 6;
    case "medium":
      return 0;
    case "low":
      return -8;
    case "unknown":
      return -10;
  }
}

/**
 * Heurística por palabras del título del aviso (no pretende ser exacta).
 * Prioridad: full/top > base > (mid si hay señales o título largo) > unknown.
 */
const RE_TRIM_FULL_TOP = new RegExp(
  [
    "\\bFULL\\b",
    "\\bLIMITED\\b",
    "\\bHIGHLINE\\b",
    "\\bHIGH\\s*LINE\\b",
    "\\bEXCLUSIVE\\b",
    "\\bLUXURY\\b",
    "\\bPLATINUM\\b",
    "\\bGT[\\s-]?LINE\\b",
    "\\bAMG\\s*LINE\\b",
    "\\bAMG[\\s-]LINE\\b",
    "\\bLINEA\\s+R\\b",
    "\\bELITE\\b",
    "\\bPRESTIGE\\b",
    "\\bULTIMATE\\b",
    "\\bSIGNATURE\\b",
    "\\bTOURING\\b",
    "\\bBLACK\\s*EDITION\\b",
    "\\bEXECUTIVE\\b",
    "\\bM[\\s-]?SPORT\\b",
    "\\bMSPORT\\b",
  ].join("|"),
  "i",
);

const RE_TRIM_BASE = new RegExp(
  [
    "\\bTRENDLINE\\b",
    "\\bTREND\\s*LINE\\b",
    "\\bENTRY\\b",
    "\\bBASE\\b",
    "\\bBÁSICO\\b",
    "\\bBASICO\\b",
    "\\bSTD\\.?\\b",
    "\\bSTANDARD\\b",
  ].join("|"),
  "i",
);

/** Señales de versión intermedia o datos extra en el título → algo de confianza para “mid”. */
const RE_TRIM_MID_HINT = new RegExp(
  [
    "\\bTSI\\b",
    "\\bTDI\\b",
    "\\bGLI\\b",
    "\\bVTI\\b",
    "\\bXE[Ii]\\b",
    "\\bXLI\\b",
    "\\bGL[SX]\\b",
    "\\b4X4\\b",
    "\\b4WD\\b",
    "\\bAWD\\b",
    "\\bQUATTRO\\b",
    "\\b4MATIC\\b",
    "\\bDIESEL\\b",
    "\\bHYBRID\\b",
    "\\bTURBO\\b",
    "\\bCVT\\b",
    "\\bDSG\\b",
    "\\bAUT\\b",
    "\\bAUTOMATIC[OA]\\b",
    "\\bCOMFORT\\b",
    "\\bSTYLE\\b",
    "\\bSPORT\\b",
    "\\bR[\\s-]?LINE\\b",
    "\\bCOOPER\\s*S\\b",
    "\\bAMG\\b",
    "\\bRS\\s?\\d\\b",
    "\\bNISMO\\b",
    "\\bSEMINUEV[OA]\\b",
    "\\bUS\\$\\b",
    "\\bKM\\b",
    "\\d{4}\\s*\\bKM\\b",
  ].join("|"),
  "i",
);

const TITLE_SHORT_UNKNOWN_MAX = 18;
const TITLE_LONG_ASSUME_MID = 42;

export function trimTierFromTitle(title: string | undefined): TrimTier {
  const raw = title ?? "";
  const t = raw.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  const trimmedLen = raw.trim().length;

  if (RE_TRIM_FULL_TOP.test(t)) return "full_top";
  if (RE_TRIM_BASE.test(t)) return "base";

  if (trimmedLen < TITLE_SHORT_UNKNOWN_MAX) return "unknown";
  if (RE_TRIM_MID_HINT.test(t) || trimmedLen >= TITLE_LONG_ASSUME_MID) return "mid";
  return "unknown";
}

export function trimPoints(tier: TrimTier): number {
  switch (tier) {
    case "full_top":
      return 5;
    case "mid":
      return 0;
    case "base":
      return -4;
    case "unknown":
      return -8;
  }
}

export function ageResalePoints(year: number | undefined): number {
  if (year == null || year < 1990) return 0;
  const age = REFERENCE_YEAR - year;
  if (age <= 3) return 6;
  if (age <= 6) return 0;
  if (age <= 10) return -6;
  return -14;
}

export function normalizedDealGap(fairValue: number, askingPrice: number): number {
  if (fairValue <= 0 || !Number.isFinite(fairValue)) return 0.5;
  const ap = askingPrice > 0 ? askingPrice : 0;
  let dealGap = (fairValue - ap) / fairValue;
  dealGap = clamp(dealGap, -0.3, 0.4);
  return (dealGap + 0.3) / 0.7;
}

export function normalizedResaleMargin(resaleValue: number, askingPrice: number): number {
  if (askingPrice <= 0 || !Number.isFinite(askingPrice)) return 0;
  let rm = (resaleValue - askingPrice) / askingPrice;
  rm = clamp(rm, 0, 0.35);
  return rm / 0.35;
}

export type BargainScoreBreakdown = {
  dealGapNorm: number;
  resaleMarginNorm: number;
  confidenceNorm: number;
  liquidityNorm: number;
  weightedSum: number;
  baseScore: number;
  confidenceMultiplier: number;
  afterMultiplier: number;
  pointsMileage: number;
  pointsAge: number;
  pointsTrim: number;
  pointsLiquidity: number;
  mileageVsAge: MileageVsAgeAnalysis;
  mileageVsAgeNoteEs: string;
};

export type BargainScoreInput = {
  /** Valor justo ya corregido (p. ej. ×0,93 en Perú respecto a avisos). */
  fairValue: number;
  askingPrice: number;
  year?: number;
  mileageKm?: number | null;
  title?: string;
  comparableConfidence: ComparableConfidence;
  liquidityTier: LiquidityTier;
  /** Sedán/hatch económico: penalizar más km alto vs edad. */
  strictEconomySmallMileage?: boolean;
};

export function computeResaleValues(fairValue: number, askingPrice: number) {
  const fv = fairValue > 0 && Number.isFinite(fairValue) ? fairValue : 0;
  const resaleValue = fv > 0 ? Math.round(fv * DEFAULT_RESALE_FACTOR) : 0;
  const ap = askingPrice > 0 && Number.isFinite(askingPrice) ? askingPrice : 0;
  const potentialMargin = resaleValue > 0 && ap > 0 ? Math.round(resaleValue - ap) : 0;
  return { resaleValue, potentialMargin };
}

export function computeBargainScore(input: BargainScoreInput): {
  score: number;
  breakdown: BargainScoreBreakdown;
  trimTier: TrimTier;
} {
  const {
    fairValue,
    askingPrice,
    year,
    mileageKm,
    title,
    comparableConfidence,
    liquidityTier,
    strictEconomySmallMileage,
  } = input;

  const { resaleValue } = computeResaleValues(fairValue, askingPrice);

  const dealGapNorm = normalizedDealGap(fairValue, askingPrice);
  const resaleMarginNorm = normalizedResaleMargin(resaleValue, askingPrice);
  const confidenceNorm = confidenceNormForFormula(comparableConfidence);
  const liquidityNorm = liquidityNormForFormula(liquidityTier);

  const weightedSum =
    dealGapNorm * 0.4 + resaleMarginNorm * 0.3 + confidenceNorm * 0.2 + liquidityNorm * 0.1;

  const mult = confidenceMultiplier(comparableConfidence);
  const baseScore = weightedSum * 100;
  const afterMultiplier = baseScore * mult;

  const trimTier = trimTierFromTitle(title);
  let mileageVsAge = analyzeMileageVsAge(year, mileageKm);
  mileageVsAge = escalateMileageSeverityForEconomySmall(
    mileageVsAge,
    strictEconomySmallMileage === true,
  );
  const pointsMileage = mileageVsAgeResalePoints(mileageVsAge);
  const pointsAge = ageResalePoints(year);
  const pointsTrim = trimPoints(trimTier);
  const pointsLiquidity = liquidityPoints(liquidityTier);

  const raw =
    afterMultiplier + pointsMileage + pointsAge + pointsTrim + pointsLiquidity;
  const score = Math.round(clamp(raw, 0, 100));

  return {
    score,
    trimTier,
    breakdown: {
      dealGapNorm,
      resaleMarginNorm,
      confidenceNorm,
      liquidityNorm,
      weightedSum,
      baseScore,
      confidenceMultiplier: mult,
      afterMultiplier,
      pointsMileage,
      pointsAge,
      pointsTrim,
      pointsLiquidity,
      mileageVsAge,
      mileageVsAgeNoteEs: mileageVsAgeNoteEs(mileageVsAge),
    },
  };
}

export function bargainTierFromScore(score: number): BargainTier {
  if (score >= 75) return "ganga_real";
  if (score >= 50) return "buena_compra";
  if (score >= 25) return "precio_justo";
  return "sobreprecio";
}

export function bargainTierLabel(tier: BargainTier): string {
  switch (tier) {
    case "ganga_real":
      return "Ganga real";
    case "buena_compra":
      return "Buena compra";
    case "precio_justo":
      return "Precio justo";
    case "sobreprecio":
      return "Sobreprecio";
  }
}

export function comparableConfidenceLabelEs(c: ComparableConfidence): string {
  switch (c) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    case "very_low":
      return "Muy baja";
  }
}

export function liquidityTierLabelEs(t: LiquidityTier): string {
  switch (t) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja / nicho";
    case "unknown":
      return "Desconocida";
  }
}

export function trimTierLabelEs(t: TrimTier): string {
  switch (t) {
    case "full_top":
      return "Gama alta / full";
    case "mid":
      return "Intermedia";
    case "base":
      return "Base";
    case "unknown":
      return "Indeterminada (título)";
  }
}
