/**
 * Contexto de mercado Perú para Toyota Hilux (pick-up de trabajo, alta liquidez).
 * Complementa el valor justo modelado; no sustituye a los comparables numéricos.
 */

import type { CarDeal } from "@/data/mock-cars";
import type { BargainTier } from "@/lib/bargain-score";

function norm(s: string | undefined): string {
  return (s ?? "")
    .trim()
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

/** Toyota Hilux por marca/modelo/título (datos NeoAuto a veces acortan el modelo). */
export function isToyotaHiluxDeal(deal: {
  brand?: string;
  model?: string;
  title?: string;
}): boolean {
  if (norm(deal.brand) !== "TOYOTA") return false;
  const m = norm(deal.model);
  const t = norm(deal.title);
  return m.includes("HILUX") || /\bHILUX\b/.test(t);
}

/**
 * Línea de insight principal cuando aplica Hilux + liquidez alta (Perú).
 */
export function hiluxHighLiquidityInsightEs(deal: CarDeal): string | null {
  if (!isToyotaHiluxDeal(deal) || deal.liquidityTier !== "high") return null;

  const tier: BargainTier = deal.bargainTier;
  const dt = deal.drivetrain;
  const fuel = (deal.fuelType ?? "").toLowerCase();
  const diesel = fuel === "diesel" || deal.isDiesel === true;
  const fourByTwo = dt === "4x2";
  const fourByFour = dt === "4x4";

  const tractionHint =
    fourByTwo && !fourByFour
      ? " Una 4x2 suele topar por debajo de una 4x4 equivalente en la misma muestra."
      : fourByFour
        ? " Con 4x4 suele haber más margen de precio vs una 4x2 parecida."
        : "";

  switch (tier) {
    case "ganga_real":
      return `Precio muy favorable vs valor justo. Hilux mueve volumen en Perú: herramienta de trabajo con demanda constante; conviene que tracción y motor cuadren con los comparables.${tractionHint}`;
    case "buena_compra":
      return `Debajo del mercado con margen moderado. En Lima la Hilux rota bien cuando el precio respeta el “perfil trabajo” (diésel/mecánica frecuentes) y la tracción frente a otros avisos.${tractionHint}`;
    case "precio_justo":
      return `Alineado con el mercado modelado. No es segmento aspiracional: es liquidez y uso profesional.${diesel ? " Diésel encaja con el comprador típico de flota y obra." : ""}${tractionHint}`;
    case "sobreprecio":
      return `Por encima del valor justo del modelo. Si es 4x2, pedir muy por encima de Hilux comparables suele alargar la venta frente a quien puede subir a 4x4 o mejor equipamiento.${tractionHint}`;
    default:
      return null;
  }
}

/**
 * Párrafos para la sección colapsable (auditoría / contexto).
 */
export function hiluxPeruMarketContextParagraphsEs(): string[] {
  return [
    "En Perú la Toyota Hilux se entiende sobre todo como pick-up de trabajo: alta liquidez, comprador frecuente y rotación en Lima. No compite en el mismo registro aspiracional que un SUV de lujo.",
    "El diésel y la caja mecánica suelen ser valorados en el uso real (obra, flota, provincias). La tracción 4x2 y la 4x4 no cotizan igual: la 4x4 aporta versatilidad que muchos comparan al decidir techo de precio.",
    "Las bandas de precio que circulan en mesa (muy orientativas, en USD, para doble cabina 4x2 diésel en buen estado) suelen citarse así: alrededor de 24–25k como ganga fuerte, 26–27,5k como zona de precio corriente/justo, y por encima de ~30k como exigente frente a alternativas 4x4 o unidades mejor posicionadas. Este listado prioriza siempre el valor justo calculado con tus comparables reales.",
  ];
}
