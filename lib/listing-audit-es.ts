/**
 * Textos de auditoría / depuración (solo UI en sección colapsable).
 */

import type { CarDeal } from "@/data/mock-cars";
import { bargainTierFromScore, bargainTierLabel } from "@/lib/bargain-score";
import type { DealMarketConfidence } from "@/lib/deal-utils";
import type { ValuationFamily } from "@/lib/vehicle-comparable-rules";

export function valuationFamilyLabelEs(family: ValuationFamily): string {
  switch (family) {
    case "pickup":
      return "Pick-up / camioneta";
    case "economy_small":
      return "Sedán / hatch económico";
    case "family_suv":
      return "SUV / familiar";
    case "premium_european":
      return "Premium europeo";
    case "toyota_hybrid":
      return "Toyota híbrido";
    case "general":
      return "General";
    default:
      return family;
  }
}

export function marketConfidenceTierLabelEs(level: DealMarketConfidence): string {
  switch (level) {
    case "high":
      return "Alta";
    case "medium":
      return "Media";
    case "low":
      return "Baja";
    default:
      return level;
  }
}

export function formatAuditString(value: string | null | undefined): string {
  if (value === undefined) return "—";
  if (value === null) return "N/D";
  return value;
}

export function formatAuditBool(value: boolean | null | undefined): string {
  if (value === undefined) return "—";
  if (value === null) return "N/D";
  return value ? "Sí" : "No";
}

/**
 * Explica en lenguaje claro por qué la etiqueta final puede coincidir o no con el tramo bruto del score.
 */
export function finalLabelRationaleParagraphsEs(deal: CarDeal): string[] {
  const scoreTier = bargainTierFromScore(deal.dealScore);
  const finalTier = deal.bargainTier;
  const labelFinal = bargainTierLabel(finalTier);
  const labelScore = bargainTierLabel(scoreTier);

  const chunks: string[] = [];

  chunks.push(
    `Puntuación ${deal.dealScore}/100. Umbrales base del score: desde 75 «Ganga real», 50–74 «Buena compra», 25–49 «Precio justo», menor de 25 «Sobreprecio». Con esa puntuación, el tramo bruto sería «${labelScore}».`,
  );

  if (finalTier !== scoreTier) {
    chunks.push(
      `La etiqueta mostrada es «${labelFinal}» porque el modelo aplica reglas adicionales de kilometraje vs edad y, en algunos casos, de porcentaje frente al valor justo, que pueden bajar o subir una categoría respecto al tramo bruto.`,
    );
  } else {
    chunks.push(`La etiqueta «${labelFinal}» coincide con el tramo bruto del score (sin ajuste de etiqueta por esas reglas).`);
  }

  if (deal.valuationFamily === "pickup" && deal.usedConservativePickupFallback) {
    chunks.push(
      `Familia pick-up con muestra estricta insuficiente (menos de tres comparables alineados en tracción, combustible, versión y cabina cuando hay dato): el valor justo prioriza no mezclar gamas; si el tramo bruto del score era más favorable, la etiqueta queda tope «Precio justo» y no se muestra «Negociable a ganga».`,
    );
  }

  if (deal.percentBelow >= 0) {
    chunks.push(
      `Brecha vs valor justo: ${deal.percentBelow.toLocaleString("es-PE", { maximumFractionDigits: 1 })}% por debajo.`,
    );
  } else {
    chunks.push(
      `Brecha vs valor justo: ${Math.abs(deal.percentBelow).toLocaleString("es-PE", { maximumFractionDigits: 1 })}% por encima.`,
    );
  }

  if (deal.negotiableToGanga) {
    chunks.push(
      `Además, aplica la etiqueta práctica «Negociable a ganga» (rebaja 3–8% que llevaría a «Ganga real» con el mismo modelo).`,
    );
  }

  return chunks;
}
