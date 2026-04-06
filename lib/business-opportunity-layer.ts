/**
 * Capa de evaluación de negocio / reventa (Perú), **solo** sobre el motor de valoración existente.
 * No modifica fairValue, comparables, familias ni extracción estructurada.
 */

import type { ComparableConfidence, LiquidityTier } from "@/lib/bargain-score";
import type { DealMarketConfidence } from "@/lib/deal-utils";

/** Fricción de mercado sobre la salida modelada (post fairValue). */
export const BUSINESS_MARKET_FRICTION = 0.97;

/** Ticket alto: fricción adicional sobre reventa estimada. */
export const BUSINESS_HIGH_TICKET_THRESHOLD_USD = 30_000;
export const BUSINESS_HIGH_TICKET_RESALE_MULT = 0.95;

/** Motor grande: fricción adicional. */
export const BUSINESS_LARGE_ENGINE_CC_THRESHOLD = 3000;
export const BUSINESS_LARGE_ENGINE_RESALE_MULT = 0.94;

/** Costos fijos modelo dealer (USD) — modular; ajustar en un solo lugar. */
export const BUSINESS_RECONDITIONING_COST_USD = 900;
export const BUSINESS_TRANSACTION_COST_USD = 500;

const NEGOTIATION_DISCOUNT_BASE = 0.04;
const NEGOTIATION_LANGUAGE_BONUS = 0.02;
const NEGOTIATION_DISCOUNT_CAP = 0.1;

/** Ganga real: margen neto mínimo tras compra negociada + recon + transacción. */
export const GANGA_NEGOTIATED_NET_MARGIN_MIN_USD = 2000;
/** Ganga real: liquidez efectiva mínima (tras penalización premium si aplica). */
export const GANGA_LIQUIDITY_FACTOR_MIN = 0.85;
/** Ganga real: riesgo acumulado debe ser estrictamente menor. */
export const GANGA_RISK_PENALTY_MAX = 20;
/** Ganga real: ROI neto mínimo sobre precio de compra negociado. */
export const GANGA_MIN_NEGOTIATED_ROI = 0.06;

/** Aprovechable: margen neto con negociación base del modelo (estricto). */
export const APROVECHABLE_NET_MARGIN_MIN_USD = 800;

/** Simulación legacy (precio × factor); ya no define compra potencial — conservado por compatibilidad de API. */
export const NEGOTIATION_SIM_DISCOUNT_MIN_USD = 300;
export const NEGOTIATION_SIM_DISCOUNT_MAX_USD = 1500;

/** Segunda mesa sobre precio ya negociado: mínimo / máximo (USD). */
export const EXTRA_NEGOTIATION_DISCOUNT_MIN_USD = 150;
export const EXTRA_NEGOTIATION_DISCOUNT_MAX_USD = 1000;
/** Descuento extra típico sin señales de flexibilidad en el texto. */
export const EXTRA_NEGOTIATION_DISCOUNT_BASE_USD = 300;
/** Descuento extra mayor si el aviso sugiere negociación (mismas frases que `negotiationSignalsDetected`). */
export const EXTRA_NEGOTIATION_DISCOUNT_WITH_SIGNALS_USD = 700;

/** Negociable: margen potencial mínimo tras descuento simulado adicional (Lima / mesa). */
export const NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD = 400;
/** Negociable: el potencial debe superar el neto ya modelado por al menos este delta (mejora mesa / Lima). */
export const NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD = 100;
/** Negociable: no aplica a avisos que ya son rentables por encima de este neto (van a «Aprovechable» o superior). */
export const NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD = 500;
/** @deprecated La etiqueta «Negociable» ya no usa tope de riesgo; solo referencia histórica. */
export const NEGOTIABLE_MAX_RISK_PENALTY_POINTS = 30;

const PREMIUM_HIGH_RISK_BRANDS = new Set(
  [
    "BMW",
    "MERCEDES-BENZ",
    "MERCEDES",
    "LAND ROVER",
    "RANGE ROVER",
    "JEEP",
    "DODGE",
  ].map((s) => s.toUpperCase()),
);

const PREMIUM_LIQUIDITY_MULT = 0.75;
const PREMIUM_RISK_PENALTY_BASELINE = 20;

const NEGOTIATION_PHRASE_RES = [
  /\bnegociable\b/i,
  /\bconversable\b/i,
  /\burge\s+vender\b/i,
  /\bviaje\b/i,
  /\bremato\b/i,
];

function normBrandKey(brand: string | undefined): string {
  return (brand ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

export function isPremiumHighRiskBrand(brand: string | undefined): boolean {
  const b = normBrandKey(brand);
  if (!b) return false;
  if (PREMIUM_HIGH_RISK_BRANDS.has(b)) return true;
  if (b.startsWith("MERCEDES")) return true;
  if (b.startsWith("LAND ROVER")) return true;
  if (b.startsWith("RANGE ROVER")) return true;
  return false;
}

export function liquidityFactorBaseForTier(tier: LiquidityTier): number {
  switch (tier) {
    case "high":
      return 1;
    case "medium":
      return 0.98;
    case "low":
      return 0.95;
    case "unknown":
      return 0.92;
    default:
      return 0.92;
  }
}

export function detectNegotiationSignalsInText(text: string | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return NEGOTIATION_PHRASE_RES.some((re) => re.test(t));
}

/**
 * Descuento en USD para escenario “más negociado”: `askingPrice * negotiationFactor`, entre mín y máx.
 * @deprecated No alimenta `potentialBuyPrice`; ver `computeExtraNegotiationDiscountUsd`.
 */
export function clampNegotiationSimulationDiscountUsd(askingPrice: number, negotiationFactor: number): number {
  const raw = askingPrice * negotiationFactor;
  return Math.round(
    Math.min(NEGOTIATION_SIM_DISCOUNT_MAX_USD, Math.max(NEGOTIATION_SIM_DISCOUNT_MIN_USD, raw)),
  );
}

/**
 * Segundo paso de negociación: USD bajo precio **ya negociado** del modelo, acotado y limitado al precio negociado.
 */
export function computeExtraNegotiationDiscountUsd(
  negotiationSignalsDetected: boolean,
  negotiatedPurchasePrice: number,
): number {
  const target = negotiationSignalsDetected
    ? EXTRA_NEGOTIATION_DISCOUNT_WITH_SIGNALS_USD
    : EXTRA_NEGOTIATION_DISCOUNT_BASE_USD;
  let d = Math.min(
    EXTRA_NEGOTIATION_DISCOUNT_MAX_USD,
    Math.max(EXTRA_NEGOTIATION_DISCOUNT_MIN_USD, target),
  );
  d = Math.min(d, Math.max(0, negotiatedPurchasePrice));
  return Math.round(d);
}

/** Base numérica «oportunidad tras más negociación» (auditoría): usa economía **compra potencial**, no la negociada base. */
function becameOpportunityAfterNegotiationNumeric(params: {
  potentialMargin: number;
  negotiatedNetMargin: number;
  hardRejectionAtPotentialBuyTriggered: boolean;
}): boolean {
  return (
    params.potentialMargin > NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD &&
    params.potentialMargin > params.negotiatedNetMargin + NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD &&
    !params.hardRejectionAtPotentialBuyTriggered
  );
}

/**
 * Predicado numérico etiqueta «Negociable»: sin confianza comparable.
 * El rechazo duro aquí es el del **escenario compra potencial** (no el de compra negociada base).
 */
function negociableLabelNumericEligible(params: {
  hardRejectionAtPotentialBuyTriggered: boolean;
  potentialMargin: number;
  negotiatedNetMargin: number;
}): boolean {
  if (params.hardRejectionAtPotentialBuyTriggered) return false;
  if (params.negotiatedNetMargin > NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD) return false;
  return (
    params.potentialMargin > NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD &&
    params.potentialMargin > params.negotiatedNetMargin + NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD
  );
}

export function isLargeEngineBusinessPenalty(
  engineDisplacementCc: number | null | undefined,
  engineClass: string | null | undefined,
): boolean {
  if (engineDisplacementCc != null && Number.isFinite(engineDisplacementCc) && engineDisplacementCc >= BUSINESS_LARGE_ENGINE_CC_THRESHOLD) {
    return true;
  }
  const ec = (engineClass ?? "").trim().toUpperCase();
  if (!ec) return false;
  if (/\bV[\s-]*([68]|10|12)\b/.test(ec) || /\bV6\b|\bV8\b|\bV10\b|\bV12\b/.test(ec)) return true;
  if (/\b(3\.[05]\d*|4\.[05]\d*|5\.[05]\d*|6\.[05]\d*)\s*[LT]\b/i.test(engineClass ?? "")) return true;
  if (/\bL6\b|\bI6\b|\bW12\b/i.test(ec)) return true;
  if (/\bCYL[_\s]*[68]\b|\b6\s*CIL\b|\b8\s*CIL\b/i.test(ec)) return true;
  return false;
}

export type BusinessOpportunityLayerInput = {
  fairValue: number;
  askingPrice: number;
  liquidityTier: LiquidityTier;
  title?: string;
  listingDescription?: string | null;
  brand?: string;
  engineDisplacementCc?: number | null;
  engineClass?: string | null;
};

export type BusinessOpportunityLayer = {
  /** Liquidez por tier (antes de penalización premium). */
  liquidityFactorBase: number;
  /** Liquidez aplicada al cálculo (base × 0,75 si marca premium/riesgo). */
  liquidityFactorEffective: number;
  marketFrictionMultiplier: number;
  marketFrictionApplied: boolean;
  premiumBrandPenaltyApplied: boolean;
  highTicketPenaltyApplied: boolean;
  largeEnginePenaltyApplied: boolean;
  /** Puntos de riesgo acumulados (p. ej. +20 baseline premium). */
  riskPenaltyPoints: number;
  negotiationFactor: number;
  negotiationSignalsDetected: boolean;
  negotiatedPurchasePrice: number;
  reconditioningCostUsd: number;
  transactionCostUsd: number;
  /** Precio publicado + recon + transacción. */
  totalCostAtAsk: number;
  /** Compra negociada modelada + recon + transacción. */
  totalCostNegotiated: number;
  /** Compra potencial (precio negociado − segunda mesa) + recon + transacción — escenario «Negociable». */
  totalCostAtPotentialBuy: number;
  /** Salida modelada tras todas las fricciones de negocio. */
  resaleEstimate: number;
  /** resaleEstimate − precio publicado (orientativo, sin costos operativos). */
  grossSpreadVsAsk: number;
  /** Beneficio neto modelado: resaleEstimate − totalCostNegotiated. */
  negotiatedNetMargin: number;
  /**
   * Rechazo duro operativo: reventa modelada no supera el costo con **compra negociada** + recon + transacción.
   */
  hardRejectionTriggered: boolean;
  /** Economía al precio publicado (ask + costos): p.ej. sin negociación aún o compra al ask. Solo auditoría. */
  hardRejectionAtAskTriggered: boolean;
  /**
   * Rechazo duro en escenario **compra potencial** (precio mesa fuerte simulado): solo para lógica «Negociable» / bandera mesa.
   * No sustituye a `hardRejectionTriggered` en Ganga, Aprovechable, Margen bajo ni Descartar.
   */
  hardRejectionAtPotentialBuyTriggered: boolean;
  /** Segundo descuento de mesa (USD) sobre `negotiatedPurchasePrice`, acotado 150–1000 (o menos si el precio negociado es bajo). */
  extraNegotiationDiscount: number;
  /** Precio compra tras segunda mesa: negociado − extraNegotiationDiscount. */
  potentialBuyPrice: number;
  /** resaleEstimate − potentialBuyPrice − recon − transacción. */
  potentialMargin: number;
  /** potentialMargin − negotiatedNetMargin (mejora atribuida al descuento simulado extra). */
  negociableNegotiationLiftUsd: number;
  /** Siempre: comparación neto base vs potencial para auditoría. */
  negociableMarginComparisonEs: string;
  /**
   * true si el margen potencial supera umbrales vs neto negociado y la reventa cubre el costo del
   * escenario **compra potencial** (!hardRejectionAtPotentialBuyTriggered).
   */
  becameOpportunityAfterNegotiation: boolean;
  /** Si cumple predicado Negociable: por qué pasó los filtros (solo esta etiqueta relaja riesgo vs Ganga). */
  negociableWhyEligibleEs: string;
  /** Narrativa del escenario de negociación adicional (si aplica predicado). */
  negociableExplanationEs: string;
  /** Texto fijo para auditoría: por qué quedó la clasificación de negocio. */
  businessClassificationDetailEs: string;
};

export function computeBusinessOpportunityLayer(
  input: BusinessOpportunityLayerInput,
): BusinessOpportunityLayer | null {
  const fv = input.fairValue;
  const ask = input.askingPrice;
  if (!Number.isFinite(fv) || fv <= 0 || !Number.isFinite(ask) || ask < 0) {
    return null;
  }

  const recon = BUSINESS_RECONDITIONING_COST_USD;
  const txn = BUSINESS_TRANSACTION_COST_USD;

  let liquidityFactorBase = liquidityFactorBaseForTier(input.liquidityTier);
  const premiumBrandPenaltyApplied = isPremiumHighRiskBrand(input.brand);
  let riskPenaltyPoints = 0;
  let liquidityFactorEffective = liquidityFactorBase;

  if (premiumBrandPenaltyApplied) {
    liquidityFactorEffective = liquidityFactorBase * PREMIUM_LIQUIDITY_MULT;
    riskPenaltyPoints += PREMIUM_RISK_PENALTY_BASELINE;
  }

  const marketFrictionMultiplier = BUSINESS_MARKET_FRICTION;
  let resaleEstimate = fv * liquidityFactorEffective * marketFrictionMultiplier;

  const highTicketPenaltyApplied = ask > BUSINESS_HIGH_TICKET_THRESHOLD_USD;
  if (highTicketPenaltyApplied) {
    resaleEstimate *= BUSINESS_HIGH_TICKET_RESALE_MULT;
  }

  const largeEnginePenaltyApplied = isLargeEngineBusinessPenalty(
    input.engineDisplacementCc,
    input.engineClass,
  );
  if (largeEnginePenaltyApplied) {
    resaleEstimate *= BUSINESS_LARGE_ENGINE_RESALE_MULT;
  }

  resaleEstimate = Math.round(resaleEstimate);

  const listingBlob = [input.title ?? "", input.listingDescription ?? ""].filter(Boolean).join(" ");
  const negotiationSignalsDetected = detectNegotiationSignalsInText(listingBlob);
  let negotiationFactor = NEGOTIATION_DISCOUNT_BASE;
  if (negotiationSignalsDetected) {
    negotiationFactor += NEGOTIATION_LANGUAGE_BONUS;
  }
  negotiationFactor = Math.min(negotiationFactor, NEGOTIATION_DISCOUNT_CAP);

  const negotiatedPurchasePrice = Math.round(ask * (1 - negotiationFactor));
  const totalCostAtAsk = Math.round(ask + recon + txn);
  const totalCostNegotiated = Math.round(negotiatedPurchasePrice + recon + txn);

  const grossSpreadVsAsk = Math.round(resaleEstimate - ask);
  const negotiatedNetMargin = Math.round(resaleEstimate - totalCostNegotiated);
  const hardRejectionAtAskTriggered = resaleEstimate <= totalCostAtAsk;
  const hardRejectionTriggered = resaleEstimate <= totalCostNegotiated;

  const extraNegotiationDiscount = computeExtraNegotiationDiscountUsd(
    negotiationSignalsDetected,
    negotiatedPurchasePrice,
  );
  const potentialBuyPrice = Math.max(0, Math.round(negotiatedPurchasePrice - extraNegotiationDiscount));
  const totalCostAtPotentialBuy = Math.round(potentialBuyPrice + recon + txn);
  const potentialMargin = Math.round(resaleEstimate - potentialBuyPrice - recon - txn);
  const hardRejectionAtPotentialBuyTriggered = resaleEstimate <= totalCostAtPotentialBuy;

  const negociableNegotiationLiftUsd = Math.round(potentialMargin - negotiatedNetMargin);
  const negociableMarginComparisonEs =
    `Neto (negociación ya modelada): ${negotiatedNetMargin.toLocaleString("es-PE")} USD. ` +
    `Neto (tras descuento adicional simulado): ${potentialMargin.toLocaleString("es-PE")} USD ` +
    `(Δ ${negociableNegotiationLiftUsd >= 0 ? "+" : ""}${negociableNegotiationLiftUsd.toLocaleString("es-PE")} USD).`;

  const becameOpportunityAfterNegotiation = becameOpportunityAfterNegotiationNumeric({
    potentialMargin,
    negotiatedNetMargin,
    hardRejectionAtPotentialBuyTriggered,
  });

  const negotiableShape = negociableLabelNumericEligible({
    hardRejectionAtPotentialBuyTriggered,
    potentialMargin,
    negotiatedNetMargin,
  });

  let negociableWhyEligibleEs = "";
  let negociableExplanationEs = "";
  if (negotiableShape) {
    negociableWhyEligibleEs =
      `Candidato «Negociable»: sin rechazo duro en escenario compra potencial (precio mesa fuerte simulado); ` +
      `neto actual ≤ ${NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD} USD; ` +
      `potencial > ${NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD} USD y al menos +${NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD} USD sobre el neto ya modelado; ` +
      `reventa modelada supera el costo compra potencial + recon + transacción.`;

    negociableExplanationEs =
      `Segunda mesa: −${extraNegotiationDiscount.toLocaleString("es-PE")} USD sobre precio negociado (${EXTRA_NEGOTIATION_DISCOUNT_MIN_USD}–${EXTRA_NEGOTIATION_DISCOUNT_MAX_USD} USD según reglas) → compra potencial ~${potentialBuyPrice.toLocaleString("es-PE")} USD. ` +
      `${negociableMarginComparisonEs}`;
  }

  let businessClassificationDetailEs =
    `Reventa modelada ${resaleEstimate.toLocaleString("es-PE")} USD (fairValue × liquidez efectiva ${liquidityFactorEffective.toFixed(2)} × ${marketFrictionMultiplier}` +
    `${highTicketPenaltyApplied ? " × ticket alto" : ""}${largeEnginePenaltyApplied ? " × motor grande" : ""}). ` +
    `Costo total al precio publicado ${totalCostAtAsk.toLocaleString("es-PE")} USD; neto tras compra negociada ${negotiatedNetMargin.toLocaleString("es-PE")} USD. ` +
    `Compra potencial (2.ª mesa): −${extraNegotiationDiscount.toLocaleString("es-PE")} USD vs precio negociado → compra ${potentialBuyPrice.toLocaleString("es-PE")} USD, margen potencial ${potentialMargin.toLocaleString("es-PE")} USD.`;

  if (hardRejectionAtAskTriggered && !hardRejectionTriggered) {
    businessClassificationDetailEs +=
      " Con el precio publicado la salida no cubre costo al ask; con la compra negociada modelada sí hay margen bruto operativo.";
  }
  if (hardRejectionTriggered) {
    businessClassificationDetailEs +=
      " Rechazo duro: la salida modelada no supera el costo total con compra negociada + recon + transacción.";
  }
  if (hardRejectionTriggered && !hardRejectionAtPotentialBuyTriggered) {
    businessClassificationDetailEs +=
      " A precio de compra potencial (descuento extra simulado) la salida sí supera el costo total de ese escenario.";
  }
  if (hardRejectionAtPotentialBuyTriggered) {
    businessClassificationDetailEs +=
      " Rechazo duro escenario compra potencial: la reventa modelada no supera costo compra potencial + recon + transacción.";
  }

  return {
    liquidityFactorBase,
    liquidityFactorEffective,
    marketFrictionMultiplier,
    marketFrictionApplied: true,
    premiumBrandPenaltyApplied,
    highTicketPenaltyApplied,
    largeEnginePenaltyApplied,
    riskPenaltyPoints,
    negotiationFactor,
    negotiationSignalsDetected,
    negotiatedPurchasePrice,
    reconditioningCostUsd: recon,
    transactionCostUsd: txn,
    totalCostAtAsk,
    totalCostNegotiated,
    totalCostAtPotentialBuy,
    resaleEstimate,
    grossSpreadVsAsk,
    negotiatedNetMargin,
    hardRejectionTriggered,
    hardRejectionAtAskTriggered,
    hardRejectionAtPotentialBuyTriggered,
    extraNegotiationDiscount,
    potentialBuyPrice,
    potentialMargin,
    negociableNegotiationLiftUsd,
    negociableMarginComparisonEs,
    becameOpportunityAfterNegotiation,
    negociableWhyEligibleEs,
    negociableExplanationEs,
    businessClassificationDetailEs,
  };
}

export type BusinessDisplayLabel =
  | "ganga_real"
  | "aprovechable"
  | "negociable"
  | "margen_bajo"
  | "descartar"
  | "revisar_manualmente";

export const BUSINESS_DISPLAY_LABEL_FEED_ORDER: readonly BusinessDisplayLabel[] = [
  "ganga_real",
  "aprovechable",
  "negociable",
  "margen_bajo",
  "descartar",
  "revisar_manualmente",
];

export function businessDisplayLabelEs(label: BusinessDisplayLabel): string {
  switch (label) {
    case "ganga_real":
      return "Ganga real";
    case "aprovechable":
      return "Aprovechable";
    case "negociable":
      return "Negociable";
    case "margen_bajo":
      return "Margen bajo";
    case "descartar":
      return "Descartar";
    case "revisar_manualmente":
      return "Revisar manualmente";
    default:
      return label;
  }
}

export function businessDisplayLabelFeedRank(label: BusinessDisplayLabel): number {
  const i = BUSINESS_DISPLAY_LABEL_FEED_ORDER.indexOf(label);
  return i >= 0 ? i : 99;
}

/** Filtro por defecto: solo oportunidades con señal clara (sin descartar ni revisar ni margen muy bajo). */
export const BUSINESS_LABELS_DEFAULT_FEED_VISIBLE: ReadonlySet<BusinessDisplayLabel> = new Set([
  "ganga_real",
  "aprovechable",
  "negociable",
]);

export type DeriveBusinessDisplayLabelInput = {
  businessOpportunity: BusinessOpportunityLayer | null | undefined;
  comparableConfidence: ComparableConfidence;
  marketConfidence: DealMarketConfidence;
};

function gangaRealAllConditionsMet(bo: BusinessOpportunityLayer): boolean {
  if (bo.negotiatedPurchasePrice <= 0) return false;
  const roi = bo.negotiatedNetMargin / bo.negotiatedPurchasePrice;
  return (
    bo.negotiatedNetMargin > GANGA_NEGOTIATED_NET_MARGIN_MIN_USD &&
    bo.liquidityFactorEffective >= GANGA_LIQUIDITY_FACTOR_MIN &&
    bo.riskPenaltyPoints < GANGA_RISK_PENALTY_MAX &&
    roi >= GANGA_MIN_NEGOTIATED_ROI
  );
}

/** Misma lógica numérica que la etiqueta «Negociable» (sin comprobar confianza comparable). */
export function qualifiesForNegociableBusinessLabel(bo: BusinessOpportunityLayer): boolean {
  return negociableLabelNumericEligible({
    hardRejectionAtPotentialBuyTriggered: bo.hardRejectionAtPotentialBuyTriggered,
    negotiatedNetMargin: bo.negotiatedNetMargin,
    potentialMargin: bo.potentialMargin,
  });
}

/**
 * Clasificación estricta orientada a rentabilidad real (Lima / reventa).
 */
export function deriveBusinessDisplayLabel(input: DeriveBusinessDisplayLabelInput): BusinessDisplayLabel {
  const bo = input.businessOpportunity;
  if (!bo) {
    return "revisar_manualmente";
  }

  /** Solo muestra muy débil o inexistente (0–1 comparables, fallback_self); «mercado bajo» con 2+ peers ya no bloquea. */
  if (input.comparableConfidence === "very_low") {
    return "revisar_manualmente";
  }

  if (gangaRealAllConditionsMet(bo)) {
    return "ganga_real";
  }

  if (bo.negotiatedNetMargin > APROVECHABLE_NET_MARGIN_MIN_USD) {
    return "aprovechable";
  }

  if (qualifiesForNegociableBusinessLabel(bo)) {
    return "negociable";
  }

  if (bo.negotiatedNetMargin > 0) {
    return "margen_bajo";
  }

  if (bo.hardRejectionTriggered) {
    return "descartar";
  }

  return "descartar";
}

export function businessDisplayDecisionRationaleEs(
  label: BusinessDisplayLabel,
  bo: BusinessOpportunityLayer | null | undefined,
): string {
  if (!bo) {
    return "Sin datos de capa de negocio o valor justo no disponible; conviene revisar el aviso y comparables a mano.";
  }
  switch (label) {
    case "revisar_manualmente":
      return "Comparables insuficientes o no fiables (confianza muy baja: 0–1 avisos o referencia sin peers): el modelo no aplica etiquetas de negocio automáticas.";
    case "descartar":
      if (bo.hardRejectionTriggered) {
        return (
          `Descartar: la reventa modelada (${bo.resaleEstimate.toLocaleString("es-PE")} USD) no supera el costo total con compra negociada ` +
          `(${bo.totalCostNegotiated.toLocaleString("es-PE")} USD, incl. recon y transacción).`
        );
      }
      return `Descartar: sin trayectoria «Negociable» y sin margen neto positivo tras negociación modelada (${bo.negotiatedNetMargin.toLocaleString("es-PE")} USD).`;
    case "ganga_real": {
      const roiPct = (bo.negotiatedNetMargin / Math.max(1, bo.negotiatedPurchasePrice)) * 100;
      return (
        `Ganga real: margen neto ${bo.negotiatedNetMargin.toLocaleString("es-PE")} USD (>${GANGA_NEGOTIATED_NET_MARGIN_MIN_USD}), ` +
        `liquidez efectiva ${bo.liquidityFactorEffective.toFixed(2)} (≥${GANGA_LIQUIDITY_FACTOR_MIN}), ` +
        `riesgo ${bo.riskPenaltyPoints} (<${GANGA_RISK_PENALTY_MAX}), ROI ~${roiPct.toFixed(1)}% sobre compra negociada (≥${(GANGA_MIN_NEGOTIATED_ROI * 100).toFixed(0)}%).`
      );
    }
    case "aprovechable":
      return `Aprovechable: margen neto ${bo.negotiatedNetMargin.toLocaleString("es-PE")} USD (>${APROVECHABLE_NET_MARGIN_MIN_USD}) sin cumplir todos los requisitos de «Ganga real».`;
    case "negociable":
      return (
        [bo.negociableWhyEligibleEs, bo.negociableExplanationEs].filter(Boolean).join(" ") ||
        `Negociable: potencial > ${NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD} USD, +${NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD} USD vs neto modelado, neto actual ≤ ${NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD} USD, sin rechazo duro en escenario compra potencial.`
      );
    case "margen_bajo":
      return (
        `Margen bajo: neto positivo (${bo.negotiatedNetMargin.toLocaleString("es-PE")} USD) sin alcanzar «Aprovechable» (> ${APROVECHABLE_NET_MARGIN_MIN_USD}) ` +
        `ni perfil «Negociable» (potencial ${bo.potentialMargin.toLocaleString("es-PE")} USD).`
      );
    default:
      return bo.businessClassificationDetailEs;
  }
}

export function businessInsightLineEs(label: BusinessDisplayLabel): string {
  switch (label) {
    case "ganga_real":
      return "Señal fuerte de rentabilidad neta modelada; aun así valida salida, tiempos y riesgos reales.";
    case "aprovechable":
      return "Margen neto razonable tras costos; contrasta con operadores reales en Lima.";
    case "negociable":
      return "No destaca con el precio publicado, pero un descuento realista adicional podría dejar margen; valida en mesa.";
    case "margen_bajo":
      return "Margen neto pequeño: fácil que fricción real lo coma.";
    case "descartar":
      return "Con los supuestos del modelo no hay negocio claro de reventa.";
    case "revisar_manualmente":
      return "Muestra de comparables demasiado pequeña o poco fiable; revisa el aviso y busca más referencias antes de decidir.";
    default:
      return "";
  }
}
