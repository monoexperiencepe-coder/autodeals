import { marketConfidenceShortLabelEs, type DealMarketConfidence } from "@/lib/deal-utils";
import type { CarDeal } from "@/data/mock-cars";
import {
  bargainTierLabel,
  comparableConfidenceLabelEs,
  FAIR_VALUE_LISTING_TO_TRANSACTION_PE,
  liquidityTierLabelEs,
  trimTierLabelEs,
  type BargainTier,
  type ComparableConfidence,
} from "@/lib/bargain-score";
import {
  finalLabelRationaleParagraphsEs,
  formatAuditBool,
  formatAuditString,
  marketConfidenceTierLabelEs,
  valuationFamilyLabelEs,
} from "@/lib/listing-audit-es";
import { MARKET_TIER_DESCRIPTION_ES } from "@/lib/peer-market-price";
import {
  hiluxHighLiquidityInsightEs,
  hiluxPeruMarketContextParagraphsEs,
  isToyotaHiluxDeal,
} from "@/lib/peru-hilux-market-es";

const leftAccentByTier: Record<BargainTier, string> = {
  ganga_real: "border-l-[6px] border-l-emerald-600",
  buena_compra: "border-l-[5px] border-l-teal-500",
  precio_justo: "border-l-[5px] border-l-amber-400",
  sobreprecio: "border-l-[5px] border-l-zinc-300",
};

const badgeByTier: Record<BargainTier, string> = {
  ganga_real:
    "border border-emerald-200/80 bg-emerald-50/90 text-emerald-950 shadow-sm ring-1 ring-emerald-500/10",
  buena_compra:
    "border border-teal-200/80 bg-teal-50/90 text-teal-950 shadow-sm ring-1 ring-teal-500/10",
  precio_justo:
    "border border-amber-200/80 bg-amber-50/95 text-amber-950 shadow-sm ring-1 ring-amber-400/10",
  sobreprecio: "border border-zinc-200/90 bg-zinc-50 text-zinc-700 shadow-sm",
};

/** Segunda etiqueta: camino a ganga con negociación acotada (3–8%). */
const negotiableGangaBadgeClass =
  "border border-emerald-300/45 bg-gradient-to-br from-emerald-50/90 via-white to-white text-emerald-950 shadow-sm ring-1 ring-emerald-600/12";

const insightAccentByTier: Record<BargainTier, string> = {
  ganga_real: "border-emerald-400/70",
  buena_compra: "border-teal-400/60",
  precio_justo: "border-amber-300/80",
  sobreprecio: "border-zinc-300",
};

const kmFmt = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

type Props = { deal: CarDeal };

function formatMoney(value: number | undefined, currency: string | undefined) {
  if (value === undefined || value === null) return "N/D";
  const cur = currency === "USD" ? "USD" : currency ?? "PEN";

  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
}

/** Monto siempre sin signo; evita salidas raras de Intl con montos negativos en la celda de margen. */
function formatCurrencyUnsigned(amount: number, currency: string | undefined) {
  const abs = Math.abs(amount);
  const cur = currency === "USD" ? "USD" : currency ?? "PEN";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: 0,
    }).format(abs);
  } catch {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(abs);
  }
}

const MINUS = "\u2212";
const THIN = "\u2009";

function potentialMarginPresentation(deal: CarDeal) {
  const m = deal.potentialMargin;
  const unsigned = formatCurrencyUnsigned(m, deal.currency);

  if (m < 0) {
    return {
      title: "Pérdida potencial",
      valueText: `${MINUS}${THIN}${unsigned}`,
      valueClass: "text-rose-900",
      marginDetailLine:
        "Pérdida potencial frente a la reventa estimada de referencia: el precio del aviso es mayor que esa salida aproximada (sin costos de operación ni plazo).",
    };
  }

  return {
    title: "Margen potencial",
    valueText: unsigned,
    valueClass: "text-teal-800",
    marginDetailLine:
      "Margen orientativo: reventa estimada menos precio del aviso; no incluye gastos, impuestos ni tiempo hasta la venta.",
  };
}

/** Una línea clara por listado, alineada con el tier y la brecha / margen. */
function listingInsightLine(deal: CarDeal): string {
  const pb = deal.percentBelow;
  const ask = deal.askingPrice ?? 0;
  const marginRatio = ask > 0 ? deal.potentialMargin / ask : 0;

  switch (deal.bargainTier) {
    case "ganga_real":
      if (pb >= 10 && marginRatio >= 0.06) {
        return "Precio muy por debajo del mercado con margen sólido.";
      }
      if (pb >= 6) {
        return "Precio claramente por debajo del valor justo, con margen de reventa atractivo.";
      }
      return "Precio muy por debajo del mercado con margen sólido.";
    case "buena_compra":
      return "Debajo del mercado, pero con margen moderado.";
    case "precio_justo":
      return "Alineado con el mercado, sin ventaja clara.";
    case "sobreprecio":
      return "Por encima del mercado, no conviene.";
  }
}

function comparableFootnote(deal: CarDeal): string {
  const n = deal.marketComparableCount;
  if (n <= 0) {
    return "Sin otros avisos con precio en esta lista; el valor justo coincide con el precio del aviso.";
  }
  if (n === 1) return "Valor justo con 1 comparable (muestra muy pequeña).";
  if (n === 2) return "Valor justo con 2 comparables (muestra limitada).";
  return `Valor justo estimado con ${n} comparables (conservador).`;
}

function percentColorClass(tier: BargainTier): string {
  switch (tier) {
    case "ganga_real":
      return "text-emerald-700";
    case "buena_compra":
      return "text-teal-700";
    case "precio_justo":
      return "text-amber-700";
    case "sobreprecio":
      return "text-zinc-500";
  }
}

function scoreColorClass(tier: BargainTier): string {
  switch (tier) {
    case "ganga_real":
      return "text-emerald-900";
    case "buena_compra":
      return "text-teal-900";
    case "precio_justo":
      return "text-amber-900";
    case "sobreprecio":
      return "text-zinc-600";
  }
}

function scoreOpacityForComparableConfidence(c: ComparableConfidence): string {
  switch (c) {
    case "high":
      return "";
    case "medium":
      return "opacity-[0.97]";
    case "low":
      return "opacity-[0.92]";
    case "very_low":
      return "opacity-[0.86]";
  }
}

function comparableConfidenceMutedClass(c: ComparableConfidence): string {
  if (c === "very_low") return "text-amber-900/70";
  if (c === "low") return "text-zinc-600";
  if (c === "medium") return "text-zinc-500";
  return "text-zinc-400";
}

function confidenceDetailEs(level: DealMarketConfidence): string {
  switch (level) {
    case "high":
      return "Alta: al menos tres avisos del mismo modelo, año cercano y precios relativamente alineados.";
    case "medium":
      return "Media: pocos avisos, año o versión menos ajustados, o precios algo dispersos entre comparables.";
    case "low":
      return "Baja: referencia débil o muestra pequeña; la puntuación usa multiplicador de confianza más bajo.";
  }
}

function marketAdjustmentMessages(deal: CarDeal): string[] {
  const out: string[] = [];
  if (deal.marketHighPriceSpread) {
    out.push("Los comparables tenían precios muy dispersos; el valor justo es menos estable.");
  }
  if (deal.marketSkippedUpperPriceTailTrim) {
    out.push(
      "No se pudo descartar la cola de precios altos sin perder la muestra; menor confianza en el valor justo.",
    );
  }
  return out;
}

function formatScorePct(x: number): string {
  return `${(x * 100).toFixed(0)}%`;
}

export function DealCard({ deal }: Props) {
  const label = bargainTierLabel(deal.bargainTier);
  const isTop = deal.bargainTier === "ganga_real";
  const adjustmentMessages = marketAdjustmentMessages(deal);
  const b = deal.scoreBreakdown;
  const insight = hiluxHighLiquidityInsightEs(deal) ?? listingInsightLine(deal);
  const marginUi = potentialMarginPresentation(deal);

  const metricLabelClass =
    "text-[0.625rem] font-semibold uppercase leading-snug tracking-[0.12em] text-zinc-400";
  const metricValuePrimaryClass =
    "mt-1 text-lg font-semibold tabular-nums tracking-tight text-zinc-950 sm:mt-1.5 sm:text-xl";
  const metricValueSecondaryClass =
    "mt-1 text-base font-semibold tabular-nums tracking-tight text-zinc-800 sm:mt-1.5 sm:text-lg";

  return (
    <a
      href={deal.listingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group block overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-200",
        "hover:border-zinc-300/90 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.07)]",
        isTop
          ? "ring-1 ring-emerald-500/[0.12]"
          : deal.bargainTier === "buena_compra"
            ? "ring-1 ring-teal-500/[0.08]"
            : "",
        leftAccentByTier[deal.bargainTier],
        isTop ? "bg-gradient-to-br from-emerald-50/40 via-white to-white" : "",
        deal.bargainTier === "buena_compra" ? "bg-gradient-to-br from-teal-50/25 via-white to-white" : "",
      ].join(" ")}
    >
      <div className="p-6 sm:flex sm:items-start sm:gap-8 lg:gap-10 sm:p-8">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 lg:gap-6">
            <h2 className="min-w-0 flex-1 pr-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-zinc-950 sm:text-lg sm:leading-tight">
              {deal.title}
            </h2>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end">
              <span
                className={[
                  "inline-flex w-fit max-w-[min(100%,11rem)] items-center rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold leading-snug tracking-wide",
                  badgeByTier[deal.bargainTier],
                ].join(" ")}
              >
                {label}
              </span>
              {deal.negotiableToGanga ? (
                <span
                  className={[
                    "inline-flex w-fit items-center rounded-md px-2.5 py-1 text-[0.6875rem] font-semibold leading-snug tracking-wide",
                    negotiableGangaBadgeClass,
                  ].join(" ")}
                >
                  Negociable a ganga
                </span>
              ) : null}
            </div>
          </div>

          <p
            className={[
              "mt-4 max-w-xl border-l-2 pl-3 text-[0.9375rem] leading-relaxed text-zinc-600",
              insightAccentByTier[deal.bargainTier],
            ].join(" ")}
          >
            {insight}
          </p>

          <div
            className={[
              "mt-6 border-t border-zinc-100 pt-6",
              isTop ? "border-emerald-100/60" : deal.bargainTier === "buena_compra" ? "border-teal-100/50" : "",
            ].join(" ")}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-6 sm:gap-y-5 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-0">
              <div className="flex min-h-0 min-w-0 flex-col rounded-lg bg-zinc-50/60 px-3 py-3 ring-1 ring-zinc-100/70 lg:rounded-none lg:bg-transparent lg:px-0 lg:py-0 lg:pl-0 lg:ring-0">
                <p className={metricLabelClass}>Precio del aviso</p>
                <p className={metricValuePrimaryClass}>{formatMoney(deal.askingPrice, deal.currency)}</p>
              </div>
              <div className="flex min-h-0 min-w-0 flex-col rounded-lg bg-zinc-50/60 px-3 py-3 ring-1 ring-zinc-100/70 lg:rounded-none lg:border-l lg:border-zinc-100/80 lg:bg-transparent lg:px-0 lg:py-0 lg:pl-6 lg:ring-0">
                <p className={metricLabelClass}>Valor justo estimado</p>
                <p className={metricValueSecondaryClass}>{formatMoney(deal.fairValue, deal.currency)}</p>
              </div>
              <div className="flex min-h-0 min-w-0 flex-col rounded-lg bg-zinc-50/60 px-3 py-3 ring-1 ring-zinc-100/70 lg:rounded-none lg:border-l lg:border-zinc-100/80 lg:bg-transparent lg:px-0 lg:py-0 lg:pl-6 lg:ring-0">
                <p className={metricLabelClass}>Reventa estimada</p>
                <p className={metricValueSecondaryClass}>{formatMoney(deal.resaleValue, deal.currency)}</p>
              </div>
              <div className="flex min-h-0 min-w-0 flex-col rounded-lg bg-zinc-50/60 px-3 py-3 ring-1 ring-zinc-100/70 lg:rounded-none lg:border-l lg:border-zinc-100/80 lg:bg-transparent lg:px-0 lg:py-0 lg:pl-6 lg:ring-0">
                <p className={metricLabelClass}>{marginUi.title}</p>
                <p
                  className={[
                    "mt-1 text-base font-semibold tabular-nums tracking-tight sm:mt-1.5 sm:text-lg",
                    marginUi.valueClass,
                  ].join(" ")}
                >
                  {marginUi.valueText}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-1 text-[0.6875rem] text-zinc-500">
            <span className="tabular-nums">
              <span className="text-zinc-400">Año</span>{" "}
              <span className="font-medium text-zinc-700">
                {deal.year === undefined || deal.year === null ? "N/D" : deal.year}
              </span>
            </span>
            <span>
              <span className="text-zinc-400">Km</span>{" "}
              <span className="font-medium tabular-nums text-zinc-700">
                {deal.mileageKm === undefined || deal.mileageKm === null
                  ? "N/D"
                  : `${kmFmt.format(deal.mileageKm)}`}
              </span>
            </span>
          </div>

          <div className="mt-5 max-w-lg">
            <details>
              <summary className="cursor-pointer text-[0.6875rem] font-medium text-zinc-400 underline decoration-zinc-300/90 underline-offset-2 transition hover:text-zinc-600 [&::-webkit-details-marker]:hidden">
                Definiciones, valor justo, modelo y auditoría
              </summary>
              <div className="mt-3 space-y-3 rounded-xl border border-zinc-100 bg-zinc-50/40 px-3 py-3 text-[0.6875rem] leading-relaxed text-zinc-600">
                <div>
                  <p className="font-medium text-zinc-700">Qué es cada cifra</p>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-4 text-zinc-500">
                    <li>
                      <span className="font-medium text-zinc-600">Precio del aviso</span> — lo publicado en el portal.
                    </li>
                    <li>
                      <span className="font-medium text-zinc-600">Valor justo estimado</span> — {comparableFootnote(deal)} Ajuste
                      mercado Perú: la referencia calculada con precios de aviso se multiplica por{" "}
                      {deal.fairValueListingToTransactionMult.toLocaleString("es-PE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      para aproximar un cierre típico (no se muestra el valor previo a ese ajuste).
                      {deal.fairValueListingToTransactionMult !== FAIR_VALUE_LISTING_TO_TRANSACTION_PE ? (
                        <>
                          {" "}
                          En Toyota Corolla Cross híbrido en título, año 2024+ y kilometraje bajo, el factor es algo más
                          suave que el 0,93 estándar para acercarse a cierres reales en Perú y evitar valor justo demasiado
                          bajo.
                        </>
                      ) : null}
                    </li>
                    <li>
                      <span className="font-medium text-zinc-600">Reventa estimada</span> — salida conservadora aproximada
                      (valor justo × 0,92); no es una cotización de mercado.
                    </li>
                    <li>
                      <span className="font-medium text-zinc-600">{marginUi.title}</span> — {marginUi.marginDetailLine}
                    </li>
                  </ul>
                </div>
                {adjustmentMessages.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-zinc-500">
                    {adjustmentMessages.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                ) : null}
                {deal.negotiableToGanga ? (
                  <div className="space-y-2.5 border-t border-emerald-100/80 bg-emerald-50/25 px-3 py-3 text-zinc-600 ring-1 ring-emerald-100/60">
                    <p className="font-medium text-emerald-950">Negociable a ganga</p>
                    <p className="text-zinc-600">
                      No es «Ganga real» al precio publicado, pero con una negociación realista (en torno a 3%–8% del aviso)
                      el mismo modelo de puntuación situaría el precio en «Ganga real». Liquidez y confianza (datos y mercado)
                      medias o altas.
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <div>
                        <p className={metricLabelClass}>Precio objetivo ganga</p>
                        <p className="mt-1 font-semibold tabular-nums tracking-tight text-emerald-950">
                          {formatMoney(deal.negotiableToGanga.targetBargainPrice, deal.currency)}
                        </p>
                      </div>
                      <div>
                        <p className={metricLabelClass}>Rebaja necesaria</p>
                        <p className="mt-1 font-semibold tabular-nums tracking-tight text-emerald-950">
                          {formatMoney(deal.negotiableToGanga.negotiationGap, deal.currency)}
                        </p>
                        <p className="mt-1 text-[0.65rem] tabular-nums text-zinc-500">
                          ≈{" "}
                          {deal.negotiableToGanga.rebatePercent.toLocaleString("es-PE", {
                            maximumFractionDigits: 1,
                          })}
                          % del precio del aviso
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div className="space-y-2 border-t border-zinc-100/90 pt-3">
                  <p className="font-medium text-zinc-700">Modelo de puntuación (0–100)</p>
                  <p className="text-zinc-500">
                    <span className="font-medium text-zinc-700">Liquidez (mapeo Perú, v1):</span>{" "}
                    {liquidityTierLabelEs(deal.liquidityTier)} ·{" "}
                    <span className="font-medium text-zinc-700">Versión (título):</span>{" "}
                    {trimTierLabelEs(deal.trimTier)}
                  </p>
                  <p>
                    Base ponderada × multiplicador de confianza, más puntos por <span className="font-medium">km vs edad</span>
                    , edad del modelo, versión y liquidez. Valores normalizados: brecha{" "}
                    {formatScorePct(b.dealGapNorm)}, margen reventa {formatScorePct(b.resaleMarginNorm)}, confianza{" "}
                    {formatScorePct(b.confidenceNorm)} (×{b.confidenceMultiplier}), liquidez {formatScorePct(b.liquidityNorm)}{" "}
                    (puntos {b.pointsLiquidity >= 0 ? "+" : ""}
                    {b.pointsLiquidity}).
                  </p>
                  <p className="text-zinc-500">
                    <span className="font-medium text-zinc-700">Km vs uso típico (Perú):</span> puntos km{" "}
                    {b.pointsMileage >= 0 ? "+" : ""}
                    {b.pointsMileage}. {b.mileageVsAgeNoteEs}
                  </p>
                  <p className="text-zinc-500">{MARKET_TIER_DESCRIPTION_ES[deal.marketReferenceTier]}</p>
                  {deal.marketMinPeersPass != null ? (
                    <p className="text-zinc-500">
                      Mínimo comparables en la pasada:{" "}
                      <span className="tabular-nums font-medium text-zinc-700">{deal.marketMinPeersPass}</span>.
                    </p>
                  ) : (
                    <p className="text-zinc-500">Sin agregación con otros avisos.</p>
                  )}
                  <p className="font-mono text-[0.6rem] text-zinc-400">tier={deal.marketReferenceTier}</p>
                  <p className="text-zinc-500">{confidenceDetailEs(deal.marketConfidence)}</p>
                  <p className="text-zinc-500">
                    Confianza en score:{" "}
                    <span className="font-medium text-zinc-700">{comparableConfidenceLabelEs(deal.comparableConfidence)}</span>
                  </p>
                  {deal.marketHighPriceSpread ? (
                    <p className="text-zinc-500">Alta dispersión entre precios de comparables.</p>
                  ) : null}
                  {deal.marketSkippedUpperPriceTailTrim ? (
                    <p className="text-zinc-500">Recorte de cola alta no aplicado (poca muestra).</p>
                  ) : null}
                </div>

                <div className="space-y-2.5 border-t border-zinc-200/70 bg-white/60 px-2 py-3 pt-4 sm:px-3">
                  {isToyotaHiluxDeal(deal) ? (
                    <div className="mb-3 space-y-2 rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-3">
                      <p className="font-medium text-zinc-800">Toyota Hilux — contexto Perú</p>
                      {hiluxPeruMarketContextParagraphsEs().map((para, i) => (
                        <p key={i} className="text-[0.65rem] leading-relaxed text-zinc-600">
                          {para}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  <div>
                    <p className="font-medium text-zinc-800">Auditoría y atributos estructurados</p>
                    <p className="mt-1 text-[0.65rem] leading-snug text-zinc-400">
                      Referencia técnica (NeoAuto / motor de valoración); la tarjeta principal permanece resumida.
                    </p>
                  </div>
                  <dl className="space-y-2">
                    {(
                      [
                        ["Familia de valoración", valuationFamilyLabelEs(deal.valuationFamily)],
                        ["Comparables (conteo)", String(deal.marketComparableCount)],
                        ["Comparables estrictos (conteo)", String(deal.strictComparablesCount)],
                        ["Pick-up: fallback conservador", deal.usedConservativePickupFallback ? "Sí" : "No"],
                        ["Filtro estructural relajado", deal.marketStructuredComparableRelaxed ? "Sí" : "No"],
                        ["Combustible (fuelType)", formatAuditString(deal.fuelType)],
                        ["Transmisión", formatAuditString(deal.transmission)],
                        ["Tracción (drivetrain)", formatAuditString(deal.drivetrain)],
                        ["Versión / trim", formatAuditString(deal.trim)],
                        ["Carrocería (bodyType)", formatAuditString(deal.bodyType)],
                        ["Clase de motor (engineClass)", formatAuditString(deal.engineClass)],
                        ["Híbrido", formatAuditBool(deal.isHybrid)],
                        ["Diésel", formatAuditBool(deal.isDiesel)],
                        ["Eléctrico", formatAuditBool(deal.isElectric)],
                        ["Confianza en datos (score)", comparableConfidenceLabelEs(deal.comparableConfidence)],
                        ["Liquidez (tier)", liquidityTierLabelEs(deal.liquidityTier)],
                        [
                          "Confianza mercado (comparables)",
                          marketConfidenceTierLabelEs(deal.marketConfidence),
                        ],
                      ] as const
                    ).map(([k, v]) => (
                      <div
                        key={k}
                        className="grid gap-0.5 border-b border-zinc-100/90 pb-2 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,11.25rem),1fr] sm:gap-x-4"
                      >
                        <dt className={metricLabelClass}>{k}</dt>
                        <dd className="font-medium text-zinc-700">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="border-t border-zinc-100 pt-3">
                    <p className={metricLabelClass}>Por qué esta etiqueta final</p>
                    <div className="mt-2 space-y-2 text-zinc-600">
                      {finalLabelRationaleParagraphsEs(deal).map((para, i) => (
                        <p key={i} className="leading-relaxed">
                          {para}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>

        <div
          className={[
            "mt-8 flex w-full shrink-0 flex-col justify-center rounded-xl border px-6 py-6 text-center sm:mt-0 sm:w-[11rem] sm:min-w-[11rem] sm:max-w-[12rem] sm:px-5",
            isTop
              ? "border-emerald-200/60 bg-emerald-50/35 shadow-sm"
              : deal.bargainTier === "buena_compra"
                ? "border-teal-200/50 bg-teal-50/25 shadow-sm"
                : deal.bargainTier === "precio_justo"
                  ? "border-amber-200/50 bg-amber-50/20"
                  : "border-zinc-200/80 bg-zinc-50/30",
          ].join(" ")}
        >
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.16em] text-zinc-500">Puntuación</p>
          <p
            className={[
              "mt-2 text-[2.25rem] font-bold tabular-nums leading-none tracking-[-0.04em] sm:text-[2.5rem]",
              scoreColorClass(deal.bargainTier),
              scoreOpacityForComparableConfidence(deal.comparableConfidence),
            ].join(" ")}
          >
            {deal.dealScore}
          </p>
          <p className="mt-1 text-[0.7rem] font-medium text-zinc-400">de 100</p>
          <p className="mt-4 text-[0.8125rem] font-semibold leading-snug text-zinc-800">{label}</p>
          <div className="mt-5 border-t border-zinc-200/70 pt-4">
            <p className="text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-zinc-500">Vs. valor justo</p>
            <p
              className={[
                "mt-1.5 text-2xl font-semibold tabular-nums tracking-tight",
                percentColorClass(deal.bargainTier),
              ].join(" ")}
            >
              {deal.percentBelow.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%
            </p>
            <p className="mt-1 text-[0.65rem] leading-snug text-zinc-500">
              {deal.percentBelow >= 0 ? "Por debajo del valor justo" : "Por encima del valor justo"}
            </p>
          </div>
          <p
            className={[
              "mt-4 text-[0.65rem] font-medium leading-snug",
              comparableConfidenceMutedClass(deal.comparableConfidence),
            ].join(" ")}
          >
            {comparableConfidenceLabelEs(deal.comparableConfidence)} en datos
          </p>
          <p className="mt-1 text-[0.6rem] leading-snug text-zinc-400">{marketConfidenceShortLabelEs(deal.marketConfidence)}</p>
        </div>
      </div>
      <p className="border-t border-zinc-100 bg-zinc-50/50 px-6 py-3.5 text-center text-[0.6875rem] leading-relaxed text-zinc-500 sm:px-8 sm:text-left">
        El aviso original se abre en otra pestaña
      </p>
    </a>
  );
}
