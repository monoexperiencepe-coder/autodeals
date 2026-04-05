/**
 * Liquidez orientativa para usados en Perú (v1: mapeo por modelo / par marca+modelo).
 *
 * - Alta: volumen alto y salida típicamente rápida (ej. Yaris, Hilux, Corolla, Accent, Rio).
 * - Media: SUV familiar / segmento C muy frecuente (ej. Tucson, Sportage, CX-5, Tiguan).
 * - Baja: premium europeo, SUV de lujo, deportivos poco comunes.
 * - Sin entrada en el mapa → `unknown`.
 */

import { brandModelKey } from "@/lib/peer-market-price";
import type { LiquidityTier } from "@/lib/bargain-score";

function normModelSegment(model: string): string {
  return model
    .trim()
    .toUpperCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ");
}

/** Clave `MARCA|MODELO` con el segmento de modelo normalizado (guiones → espacio). */
function normalizedBrandModelKey(brand?: string, model?: string): string | null {
  const raw = brandModelKey(brand, model);
  if (!raw) return null;
  const i = raw.indexOf("|");
  if (i < 0) return null;
  const b = raw.slice(0, i);
  const m = normModelSegment(raw.slice(i + 1));
  return `${b}|${m}`;
}

/** Pares explícitos (después de normalizar el lado modelo). */
const HIGH_BRAND_MODEL = new Set<string>([
  "TOYOTA|YARIS",
  "TOYOTA|YARIS CROSS",
  "TOYOTA|COROLLA",
  "TOYOTA|COROLLA CROSS",
  "TOYOTA|HILUX",
  "TOYOTA|RAV4",
  "TOYOTA|ETIOS",
  "HYUNDAI|ACCENT",
  "KIA|RIO",
  "NISSAN|VERSA",
  "NISSAN|SENTRA",
  "NISSAN|MARCH",
  "NISSAN|KICKS",
  "HONDA|CITY",
  "HONDA|CIVIC",
  "HONDA|FIT",
  "SUZUKI|SWIFT",
  "CHEVROLET|SPARK",
  "CHEVROLET|AVEO",
  "CHEVROLET|ONIX",
  "VOLKSWAGEN|GOL",
  "FORD|RANGER",
  "MITSUBISHI|L200",
  "NISSAN|FRONTIER",
  "MAZDA|2",
  "MAZDA|3",
  "MAZDA|MAZDA2",
  "MAZDA|MAZDA3",
]);

const MEDIUM_BRAND_MODEL = new Set<string>([
  "HYUNDAI|TUCSON",
  "HYUNDAI|CRETA",
  "HYUNDAI|KONA",
  "HYUNDAI|VENUE",
  "HYUNDAI|SANTA FE",
  "KIA|SPORTAGE",
  "KIA|SELTOS",
  "KIA|SORENTO",
  "MAZDA|CX 5",
  "VOLKSWAGEN|TIGUAN",
  "VOLKSWAGEN|T CROSS",
  "VOLKSWAGEN|TAOS",
  "HONDA|HR V",
  "HONDA|CR V",
  "NISSAN|X TRAIL",
  "PEUGEOT|3008",
  "PEUGEOT|2008",
  "SEAT|ARONA",
  "FORD|ECOSPORT",
  "FORD|TERRITORY",
  "FORD|EXPLORER",
  "JEEP|COMPASS",
  "JEEP|RENEGADE",
  "RENAULT|DUSTER",
  "RENAULT|OROCH",
  "SUBARU|XV",
  "VOLKSWAGEN|AMAROK",
]);

const LOW_BRAND_MODEL = new Set<string>([
  "MERCEDES-BENZ|GLE",
  "MERCEDES-BENZ|GLS",
  "MERCEDES-BENZ|GLC",
  "MERCEDES-BENZ|GLA",
  "MERCEDES-BENZ|CLA",
  "MERCEDES-BENZ|CLS",
  "MERCEDES-BENZ|SL",
  "MERCEDES-BENZ|SLC",
  "MERCEDES-BENZ|SLC 380",
  "BMW|X5",
  "BMW|X6",
  "BMW|X7",
  "BMW|X3",
  "BMW|X4",
  "BMW|M3",
  "BMW|M4",
  "BMW|M235I",
  "BMW|M240I",
  "BMW|I4",
  "BMW|X1",
  "BMW|318I",
  "BMW|320I",
  "AUDI|Q7",
  "AUDI|Q8",
  "AUDI|A1",
  "AUDI|A3",
  "AUDI|A6",
  "AUDI|A7",
  "AUDI|A8",
  "AUDI|Q2",
  "AUDI|Q3",
  "PORSCHE|CAYENNE",
  "PORSCHE|MACAN",
  "LAND|ROVER",
  "LAND ROVER|DISCOVERY",
  "LAND ROVER|DEFENDER",
  "LAND ROVER|RANGE ROVER",
  "VOLVO|XC90",
  "VOLVO|XC60",
  "VOLVO|S90",
  "VOLVO|S60",
  "VOLVO|XC 40",
  "MINI|COUNTRYMAN",
  "MINI|HATCH",
  "MINI|COOPER",
  "HYUNDAI|PALISADE",
  "HONDA|PILOT",
  "DODGE|DURANGO",
  "DODGE|RAM",
  "DODGE|CHALLENGER",
  "DODGE|CHARGER",
  "JEEP|GRAND CHEROKEE",
]);

/** Solo por nombre de modelo normalizado (cuando el nombre es reconocible solo). */
const HIGH_MODELS = new Set<string>([
  "YARIS",
  "YARIS CROSS",
  "COROLLA",
  "COROLLA CROSS",
  "HILUX",
  "RAV4",
  "RAV 4",
  "ETIOS",
  "ACCENT",
  "RIO",
  "VERSA",
  "SENTRA",
  "MARCH",
  "KICKS",
  "CITY",
  "CIVIC",
  "FIT",
  "SWIFT",
  "GOL",
  "RANGER",
  "L200",
  "FRONTIER",
  "ONIX",
  "PRISMA",
  "AVEO",
  "SPARK",
  "RAM",
]);

const MEDIUM_MODELS = new Set<string>([
  "TUCSON",
  "SPORTAGE",
  "CX 5",
  "CX5",
  "TIGUAN",
  "CRETA",
  "KONA",
  "VENUE",
  "HR V",
  "HRV",
  "CR V",
  "CRV",
  "X TRAIL",
  "XTRAIL",
  "3008",
  "2008",
  "ARONA",
  "T CROSS",
  "TCROSS",
  "TAOS",
  "ECOSPORT",
  "TERRITORY",
  "COMPASS",
  "RENEGADE",
  "DUSTER",
  "OROCH",
  "AMAROK",
  "EXPLORER",
  "OUTBACK",
  "SORENTO",
  "SANTA FE",
  "C5",
  "GRAND CHEROKEE",
]);

const LOW_MODELS = new Set<string>([
  "GLE",
  "GLS",
  "GLC",
  "GLA",
  "X5",
  "X6",
  "X7",
  "X3",
  "X4",
  "M235I",
  "M240I",
  "M3",
  "M4",
  "I4",
  "Q7",
  "Q8",
  "A6",
  "A7",
  "A8",
  "A1",
  "A3",
  "Q2",
  "Q3",
  "X1",
  "318I",
  "320I",
  "330I",
  "340I",
  "428I",
  "430I",
  "440I",
  "CAYENNE",
  "MACAN",
  "RANGE ROVER",
  "ROVER",
  "DISCOVERY",
  "DEFENDER",
  "XC90",
  "XC60",
  "XC 40",
  "S90",
  "S60",
  "SLC",
  "SL",
  "SLC 380",
  "COUNTRYMAN",
  "PALISADE",
  "PILOT",
  "STINGER",
  "DURANGO",
  "CHALLENGER",
  "CHARGER",
  "ROADSPORT",
  "REFINE",
  "STARIA",
  "BENZ",
]);

function normModel(model: string | undefined): string {
  if (typeof model !== "string") return "";
  return normModelSegment(model);
}

/**
 * Clasificación por mapeo fijo (Perú, usados). Sin coincidencia → `unknown`.
 * Orden: pares marca+modelo (alta → media → baja), luego solo modelo (misma prioridad).
 */
export function classifyVehicleLiquidityPeru(brand?: string, model?: string): LiquidityTier {
  const modelNorm = normModel(model);
  if (!modelNorm) return "unknown";

  const composite = normalizedBrandModelKey(brand, model);
  if (composite) {
    if (HIGH_BRAND_MODEL.has(composite)) return "high";
    if (MEDIUM_BRAND_MODEL.has(composite)) return "medium";
    if (LOW_BRAND_MODEL.has(composite)) return "low";
  }

  if (HIGH_MODELS.has(modelNorm)) return "high";
  if (MEDIUM_MODELS.has(modelNorm)) return "medium";
  if (LOW_MODELS.has(modelNorm)) return "low";

  return "unknown";
}
