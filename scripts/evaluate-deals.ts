/**
 * Lee scraper/deals.json, aplica la misma pipeline que el app (mock-cars + capa negocio)
 * y escribe scraper/deals.evaluated.json. No modifica el dataset crudo.
 */

import * as fs from "node:fs";
import * as path from "node:path";

import type { CarDeal } from "@/data/mock-cars";
import { evaluateScrapeRowsWithRaw } from "@/data/mock-cars";
import {
  APROVECHABLE_NET_MARGIN_MIN_USD,
  GANGA_NEGOTIATED_NET_MARGIN_MIN_USD,
  NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD,
  NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD,
  NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD,
  businessDisplayDecisionRationaleEs,
  businessDisplayLabelEs,
  qualifiesForNegociableBusinessLabel,
  type BusinessDisplayLabel,
} from "@/lib/business-opportunity-layer";

type EvaluatedOutput = {
  generatedAt: string;
  sourceRelative: string;
  outputRelative: string;
  listingCount: number;
  records: Record<string, unknown>[];
};

function shortWarnings(deal: CarDeal): string[] {
  const w: string[] = [];
  if (deal.comparableConfidence === "very_low") w.push("Comparables: confianza muy baja");
  if (deal.comparableConfidence === "low") w.push("Comparables: confianza baja");
  if (deal.marketConfidence === "low") w.push("Mercado: confianza baja");
  const bo = deal.businessOpportunity;
  if (bo?.hardRejectionAtAskTriggered) {
    w.push("Economía al ask: reventa modelada ≤ costo total al precio publicado");
  }
  if (bo?.hardRejectionTriggered) {
    w.push("Rechazo duro operativo: reventa ≤ costo con compra negociada + recon + transacción");
  }
  if (bo?.premiumBrandPenaltyApplied) w.push("Penalización marca premium / alto riesgo");
  if (bo?.highTicketPenaltyApplied) w.push("Penalización ticket alto (>30k USD)");
  if (bo?.largeEnginePenaltyApplied) w.push("Penalización motor grande");
  if (deal.marketHighPriceSpread) w.push("Comparables: dispersión de precios alta");
  if (deal.marketSkippedUpperPriceTailTrim) w.push("Muestra: no se recortó cola de precios altos");
  return w;
}

function buildEvaluationBlock(deal: CarDeal): Record<string, unknown> {
  const bo = deal.businessOpportunity;
  const shortReason = businessDisplayDecisionRationaleEs(deal.businessDisplayLabel, bo ?? null);

  return {
    fairValue: deal.fairValue,
    fairValueListingBased: deal.fairValueListingBased,
    resaleValueReference: deal.resaleValue,
    comparableConfidence: deal.comparableConfidence,
    marketConfidence: deal.marketConfidence,
    liquidityTier: deal.liquidityTier,
    bargainTier: deal.bargainTier,
    resaleEstimate: bo?.resaleEstimate ?? null,
    reconditioningCost: bo?.reconditioningCostUsd ?? null,
    transactionCost: bo?.transactionCostUsd ?? null,
    totalCostAtAsk: bo?.totalCostAtAsk ?? null,
    totalCostNegotiated: bo?.totalCostNegotiated ?? null,
    totalCostAtPotentialBuy: bo?.totalCostAtPotentialBuy ?? null,
    totalCost: bo?.totalCostAtAsk ?? null,
    negotiationFactor: bo?.negotiationFactor ?? null,
    extraNegotiationDiscount: bo?.extraNegotiationDiscount ?? null,
    potentialBuyPrice: bo?.potentialBuyPrice ?? null,
    grossMargin: bo?.grossSpreadVsAsk ?? null,
    negotiatedMargin: bo?.negotiatedNetMargin ?? null,
    potentialMargin: bo?.potentialMargin ?? null,
    liquidityFactor: bo?.liquidityFactorEffective ?? null,
    liquidityFactorBase: bo?.liquidityFactorBase ?? null,
    riskPenalty: bo?.riskPenaltyPoints ?? null,
    hardRejectionTriggered: bo?.hardRejectionTriggered ?? null,
    hardRejectionAtAskTriggered: bo?.hardRejectionAtAskTriggered ?? null,
    hardRejectionAtPotentialBuyTriggered: bo?.hardRejectionAtPotentialBuyTriggered ?? null,
    businessLabel: deal.businessDisplayLabel,
    businessLabelEs: businessDisplayLabelEs(deal.businessDisplayLabel),
    businessScore: deal.dealScore,
    becameOpportunityAfterNegotiation: bo?.becameOpportunityAfterNegotiation ?? false,
    negociableNegotiationLiftUsd: bo?.negociableNegotiationLiftUsd ?? null,
    negociableMarginComparisonEs: bo?.negociableMarginComparisonEs ?? null,
    negociableWhyEligibleEs: bo?.negociableWhyEligibleEs ?? null,
    shortReason,
    shortWarnings: shortWarnings(deal),
    negociableExplanationEs: bo?.negociableExplanationEs ?? null,
    businessClassificationDetailEs: bo?.businessClassificationDetailEs ?? null,
    businessNegotiatedMargin: deal.businessNegotiatedMargin,
    businessPotentialMargin: deal.businessPotentialMargin,
    businessGrossMargin: deal.businessGrossMargin,
    businessOpportunity: bo ?? null,
  };
}

function printClassificationFunnel(deals: CarDeal[]) {
  let withBo = 0;
  let noBo = 0;
  let veryLowComparable = 0;
  let marketLow = 0;
  let hardRejectNegotiated = 0;
  let hardRejectAtAsk = 0;
  let hardRejectPotentialBuy = 0;
  let nmGt2000 = 0;
  let nmGt800 = 0;
  let nmGt0 = 0;
  let potGt400 = 0;
  let potGt800 = 0;
  let becameOpp = 0;
  let fullNegociableNumericRule = 0;
  let negociableLostToVeryLowComparable = 0;
  let potGtNegotiatedPlusGap = 0;
  let nmLte500ForNegociable = 0;
  let sumNegDiscUsd = 0;
  let sumNegDiscPctOfAsk = 0;
  let sumExtraNegotiationDiscount = 0;
  let sumPotentialBuyImprovementVsNegotiated = 0;
  let nAvgNegotiationScenario = 0;

  for (const d of deals) {
    const bo = d.businessOpportunity;
    if (!bo) {
      noBo++;
      continue;
    }
    withBo++;
    const ask = d.askingPrice ?? 0;
    if (ask > 0) {
      nAvgNegotiationScenario++;
      const negDiscUsd = ask - bo.negotiatedPurchasePrice;
      sumNegDiscUsd += negDiscUsd;
      sumNegDiscPctOfAsk += negDiscUsd / ask;
      sumExtraNegotiationDiscount += bo.extraNegotiationDiscount;
      sumPotentialBuyImprovementVsNegotiated += bo.negotiatedPurchasePrice - bo.potentialBuyPrice;
    }
    if (d.comparableConfidence === "very_low") veryLowComparable++;
    if (d.marketConfidence === "low") marketLow++;
    if (bo.hardRejectionAtAskTriggered) hardRejectAtAsk++;
    if (bo.hardRejectionTriggered) hardRejectNegotiated++;
    if (bo.hardRejectionAtPotentialBuyTriggered) hardRejectPotentialBuy++;
    if (bo.negotiatedNetMargin > GANGA_NEGOTIATED_NET_MARGIN_MIN_USD) nmGt2000++;
    if (bo.negotiatedNetMargin > APROVECHABLE_NET_MARGIN_MIN_USD) nmGt800++;
    if (bo.negotiatedNetMargin > 0) nmGt0++;
    if (bo.potentialMargin > NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD) potGt400++;
    if (bo.potentialMargin > 800) potGt800++;
    if (bo.potentialMargin > bo.negotiatedNetMargin + NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD) {
      potGtNegotiatedPlusGap++;
    }
    if (bo.negotiatedNetMargin <= NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD) nmLte500ForNegociable++;
    if (bo.becameOpportunityAfterNegotiation) becameOpp++;

    if (qualifiesForNegociableBusinessLabel(bo)) {
      fullNegociableNumericRule++;
      if (d.comparableConfidence === "very_low") {
        negociableLostToVeryLowComparable++;
      }
    }
  }

  const finalNegociable = deals.filter((d) => d.businessDisplayLabel === "negociable").length;
  const finalRevisar = deals.filter((d) => d.businessDisplayLabel === "revisar_manualmente").length;
  const withoutHardRejectNegotiated = withBo - hardRejectNegotiated;
  const survivePotentialBuyHardReject = withBo - hardRejectPotentialBuy;

  console.log("\n=== Diagnóstico embudo (capa negocio) ===");
  console.log(`  Total listados:                    ${deals.length}`);
  console.log(`  Sin capa negocio (!fairValue/precio): ${noBo}`);
  console.log(`  Con capa negocio:                  ${withBo}`);
  console.log(`  comparableConfidence === very_low: ${veryLowComparable}  (bloquea etiqueta negocio)`);
  console.log(`  marketConfidence === low (info):    ${marketLow}  (ya no bloquea)`);
  console.log(
    `  hardRejectionAtAskTriggered:       ${hardRejectAtAsk}  (reventa ≤ costo al precio publicado; solo diagnóstico)`,
  );
  console.log(
    `  hardRejectionTriggered (negociado): ${hardRejectNegotiated}  (reventa ≤ costo compra negociada + costos; descarte duro)`,
  );
  console.log(
    `  hardRejectionAtPotentialBuyTriggered: ${hardRejectPotentialBuy}  (reventa ≤ costo compra potencial + recon + txn; bloquea solo «Negociable»)`,
  );
  console.log(`  Sin rechazo duro negociado (Ganga/Aprov/Margen/Descartar): ${withoutHardRejectNegotiated}`);
  console.log(
    `  Sin rechazo duro compra potencial (!hardRejectionAtPotentialBuyTriggered): ${survivePotentialBuyHardReject}`,
  );
  const avg = (sum: number, n: number) => (n > 0 ? sum / n : 0);
  const nAvg = nAvgNegotiationScenario;
  console.log("\n  — Compra potencial / Negociable (promedios, listados con capa negocio y ask > 0) —");
  console.log(`  Promedio descuento precio negociado vs ask (USD):        ${avg(sumNegDiscUsd, nAvg).toFixed(0)}`);
  console.log(
    `  Promedio descuento precio negociado vs ask (% del ask):   ${(avg(sumNegDiscPctOfAsk, nAvg) * 100).toFixed(2)}%`,
  );
  console.log(`  Promedio extraNegotiationDiscount (2.ª mesa, USD):      ${avg(sumExtraNegotiationDiscount, nAvg).toFixed(0)}`);
  console.log(
    `  Promedio mejora compra potencial vs negociado (USD):      ${avg(sumPotentialBuyImprovementVsNegotiated, nAvg).toFixed(0)}  (= precio negociado − compra potencial)`,
  );
  console.log(`  negotiatedNetMargin > ${GANGA_NEGOTIATED_NET_MARGIN_MIN_USD} (Ganga umbral): ${nmGt2000}`);
  console.log(`  negotiatedNetMargin > ${APROVECHABLE_NET_MARGIN_MIN_USD} (Aprovechable): ${nmGt800}`);
  console.log(`  negotiatedNetMargin > 0:           ${nmGt0}`);
  console.log(`  potentialMargin > ${NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD}:          ${potGt400}`);
  console.log(
    `  potentialMargin > negotiatedNetMargin + ${NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD}: ${potGtNegotiatedPlusGap}`,
  );
  console.log(
    `  negotiatedNetMargin ≤ ${NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD} (tope Negociable): ${nmLte500ForNegociable}`,
  );
  console.log(`  potentialMargin > 800:             ${potGt800}`);
  console.log(`  becameOpportunityAfterNegotiation: ${becameOpp}`);
  console.log(
    `  Regla numérica «Negociable» completa (!hard compra potencial, pot>${NEGOTIABLE_POTENTIAL_MARGIN_MIN_USD}, pot>neto+${NEGOTIABLE_POTENTIAL_VS_NEGOTIATED_MIN_GAP_USD}, neto≤${NEGOTIABLE_MAX_NEGOTIATED_NET_FOR_LABEL_USD}): ${fullNegociableNumericRule}`,
  );
  console.log(`  De ellos, bloqueados por very_low: ${negociableLostToVeryLowComparable}`);
  console.log(`  Etiqueta final Negociable:                               ${finalNegociable}`);
  console.log(`  Etiqueta final revisar_manualmente: ${finalRevisar}`);
}

function countByLabel(deals: CarDeal[]): Record<BusinessDisplayLabel, number> {
  const z: Record<BusinessDisplayLabel, number> = {
    ganga_real: 0,
    aprovechable: 0,
    negociable: 0,
    margen_bajo: 0,
    descartar: 0,
    revisar_manualmente: 0,
  };
  for (const d of deals) {
    z[d.businessDisplayLabel]++;
  }
  return z;
}

function printTop(
  title: string,
  deals: CarDeal[],
  limit: number,
  marginFn: (d: CarDeal) => number,
) {
  const sorted = [...deals].sort((a, b) => marginFn(b) - marginFn(a)).slice(0, limit);
  console.log(`\n--- ${title} (top ${limit}) ---`);
  if (sorted.length === 0) {
    console.log("(ninguno)");
    return;
  }
  for (const d of sorted) {
    console.log(
      `  ${d.id}\t${marginFn(d)} USD\t| ${d.title.slice(0, 56)}${d.title.length > 56 ? "…" : ""}`,
    );
  }
}

function main() {
  const root = process.cwd();
  const inPath = path.join(root, "scraper", "deals.json");
  const outPath = path.join(root, "scraper", "deals.evaluated.json");

  if (!fs.existsSync(inPath)) {
    console.error(`No se encontró ${inPath}`);
    process.exit(1);
  }

  const rawText = fs.readFileSync(inPath, "utf8");
  const rows = JSON.parse(rawText) as unknown[];
  if (!Array.isArray(rows)) {
    console.error("deals.json debe ser un array de listados.");
    process.exit(1);
  }

  const pairs = evaluateScrapeRowsWithRaw(rows);
  const deals = pairs.map((p) => p.deal);

  const records: Record<string, unknown>[] = pairs.map(({ raw, deal }) => {
    const base = typeof raw === "object" && raw !== null ? { ...(raw as Record<string, unknown>) } : {};
    return {
      ...base,
      evaluation: buildEvaluationBlock(deal),
    };
  });

  const out: EvaluatedOutput = {
    generatedAt: new Date().toISOString(),
    sourceRelative: "scraper/deals.json",
    outputRelative: "scraper/deals.evaluated.json",
    listingCount: records.length,
    records,
  };

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), "utf8");

  console.log(`Escrito: ${outPath}`);
  console.log(`Listados procesados: ${deals.length}`);

  printClassificationFunnel(deals);

  const counts = countByLabel(deals);
  console.log("\n--- Por businessLabel ---");
  for (const [k, v] of Object.entries(counts)) {
    console.log(`  ${k}: ${v}`);
  }

  printTop(
    "Ganga real (por negotiatedMargin)",
    deals.filter((d) => d.businessDisplayLabel === "ganga_real"),
    20,
    (d) => d.businessNegotiatedMargin,
  );
  printTop(
    "Aprovechable (por negotiatedMargin)",
    deals.filter((d) => d.businessDisplayLabel === "aprovechable"),
    20,
    (d) => d.businessNegotiatedMargin,
  );
  printTop(
    "Negociable (por potentialMargin)",
    deals.filter((d) => d.businessDisplayLabel === "negociable"),
    20,
    (d) => d.businessPotentialMargin,
  );
  printTop("Todos (por negotiatedMargin)", deals, 20, (d) => d.businessNegotiatedMargin);
}

main();
