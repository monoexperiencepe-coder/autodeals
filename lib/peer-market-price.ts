/**
 * Referencia de mercado a partir del propio lote de avisos (nunca incluye el precio del aviso actual).
 *
 * - **Premium / precio alto (≥ ~40k USD o equivalente PEN) o marcas premium**: solo comparables **estrictos**
 *   (mismo modelo, año ±1, versión y motor compatibles por título), **sin** pasadas amplias ni fallback a promedios
 *   de modelo amplio; si no hay muestra, referencia = precio del aviso. Mediana acotada a los más parecidos,
 *   piso 75% de la mediana de los 1–3 más cercanos.
 * - Resto: solo misma **marca + modelo** estructurada (JSON); se prioriza **año ±1**, luego ±2, ±4, cualquier año.
 * - Filtro de **outliers por precio**: solo avisos entre **70% y 130%** del precio del aviso actual (si hay precio).
 * - **Versiones / acabados** (heurística por título): no mezcla señales claras distintas (p. ej. AMG vs base, diésel vs no).
 * - Siempre **mediana** sobre un **subconjunto pequeño de los más parecidos** (no sobre “todos los que pasan”):
 *   prioriza año y precio cercanos al aviso; tope típico 5 (estricto) / 4 (pasada amplia).
 * - Tras elegir comparables: **precios ordenados asc.**, se elimina la **cola superior (~25%)** (avisos caros / sobrevalorados)
 *   y la referencia es la **mediana del resto**. Si eso deja menos de `minPeers`, se usa la muestra completa y se marca menor confianza.
 * - Si la distribución sigue **sesgada hacia precios altos** (media > mediana, cola superior más larga), la referencia usa solo la
 *   **parte baja** de la muestra (al menos `minPeers` precios, desde el mínimo), no la mediana sobre todo el conjunto recortado.
 * - Se exige **≥3** comparables cuando sea posible; si no, **2** o **1** con el mismo orden de pasadas.
 * - Pasadas “amplias” relajan solo el filtro de versión (mismo modelo), no el ±30% ni la marca/modelo.
 * - Con atributos estructurados (deals.json): familias pickup / sedán-hatch económico / SUV familiar /
 *   premium europeo / Toyota híbrido filtran comparables adicionales; si la muestra queda pequeña se
 *   relaja el filtro estructural y baja la confianza de mercado.
 * - **Pick-up con señales estructuradas**: ruta aparte — no se relaja a bm_wide ni se mezclan 4x2/4x4,
 *   diésel/gasolina ni versiones incompatibles; con menos de tres comparables estrictos la referencia usa
 *   solo 2 o 1 aviso o, si no hay ninguno, el precio del propio aviso (`usedConservativePickupFallback`).
 */

import {
  classifyValuationFamily,
  hasStructuredComparableSignals,
  peersPickupStrictComparable,
  peersStructurallyCompatible,
  premiumStructuredPeersCompatible,
  type VehicleComparableRow,
} from "@/lib/vehicle-comparable-rules";

export type PeerListingInput = VehicleComparableRow;

/** Identificador estable para UI / depuración. */
export type MarketReferenceTier =
  | "bm_trim_pm1"
  | "bm_trim_pm2"
  | "bm_trim_pm4"
  | "bm_trim_any"
  | "bm_wide_pm1"
  | "bm_wide_pm2"
  | "bm_wide_pm4"
  | "bm_wide_any"
  | "premium_trim_pm1"
  | "premium_trim_pm1_sparse"
  | "fallback_self";

export type PeerMarketResult = {
  marketPrice: number;
  comparableCount: number;
  tier: MarketReferenceTier;
  minPeersPass: 1 | 2 | 3 | null;
  /** Precios muy dispersos respecto a la mediana (IQR o rango); baja fiabilidad. */
  highPriceSpread: boolean;
  /**
   * True si no se pudo aplicar el recorte de cola cara sin quedar por debajo del mínimo de comparables;
   * la mediana usa toda la muestra seleccionada (lógica anterior) y la confianza debe bajar.
   */
  skippedUpperPriceTailTrim: boolean;
  /** Se relajó el filtro por atributos estructurados por falta de comparables en modo estricto. */
  structuredComparableRelaxed: boolean;
  /**
   * Pick-up con datos estructurados: avisos que pasan filtro estricto (tracción/combustible/versión/cabina)
   * en la pasada ganadora, antes del recorte por similitud. En otros segmentos coincide con `comparableCount`.
   */
  strictComparablesCount: number;
  /** Pick-up estructurado: muestra estricta menor a 3 o referencia = precio del aviso (sin peers válidos). */
  usedConservativePickupFallback: boolean;
};

export const MARKET_TIER_DESCRIPTION_ES: Record<MarketReferenceTier, string> = {
  bm_trim_pm1:
    "Mismo modelo, año muy cercano (±1), versión parecida y ±30%; avisos más parecidos, se ordenan precios asc., se quita ~25% superior y mediana del resto.",
  bm_trim_pm2: "Igual que arriba con año ±2.",
  bm_trim_pm4: "Igual con año ±4.",
  bm_trim_any: "Igual con cualquier año; mediana tras quitar la cola cara.",
  bm_wide_pm1: "Mismo modelo, año ±1 y ±30%; sin cruzar versiones por título; cola superior recortada si hay suficientes precios.",
  bm_wide_pm2: "Mismo modelo, año ±2 y ±30%; cola superior recortada si aplica.",
  bm_wide_pm4: "Mismo modelo, año ±4 y ±30%; cola superior recortada si aplica.",
  bm_wide_any: "Mismo modelo, cualquier año y ±30%; cola superior recortada si aplica.",
  premium_trim_pm1:
    "Segmento premium o caro: mismo modelo, año ±1, versión y motor compatibles (heurística); hasta 3 avisos más parecidos, sin ampliar a promedios amplios ni recorte agresivo de cola.",
  premium_trim_pm1_sparse:
    "Segmento premium o caro: pocos comparables estrictos (1–2); sin fallback amplio; referencia conservadora acotada a esos avisos.",
  fallback_self: "No hubo otros avisos comparables tras los filtros; la referencia coincide con el precio del aviso.",
};

const PEER_COUNT_PRIORITY = [3, 2, 1] as const;
/** Ventana respecto al precio del aviso (excluye outliers de otras gamas). */
const PRICE_BAND_FRAC = 0.3;
/** Máximo de comparables usados en la mediana tras ordenar por similitud (menos = más parecidos). */
const PREFERRED_COMPARABLES_STRICT_PASS = 5;
const PREFERRED_COMPARABLES_WIDE_PASS = 4;
/** Fracción de la muestra (más cara) a descartar antes de la mediana; ~25% (banda 20–30%). */
const UPPER_TAIL_REMOVE_FRAC = 0.25;

/** Premium / alto valor: no usar pasadas amplias; comparables estrictos y techo anti-subvaloración. */
const USD_HIGH_VARIANCE_THRESHOLD = 40_000;
const PEN_HIGH_VARIANCE_THRESHOLD = 152_000;
const PREMIUM_CLOSEST_MEDIAN_FLOOR_FRAC = 0.75;
const PREFERRED_PREMIUM_COMPARABLES = 3;

const PREMIUM_BRAND_SET = new Set(
  [
    "LAND ROVER",
    "RANGE ROVER",
    "BMW",
    "MERCEDES-BENZ",
    "MERCEDES",
    "AUDI",
    "PORSCHE",
    "LEXUS",
    "JAGUAR",
    "MASERATI",
    "BENTLEY",
    "ROLLS-ROYCE",
    "ROLLS ROYCE",
    "ASTON MARTIN",
    "FERRARI",
    "LAMBORGHINI",
    "MCLAREN",
    "GENESIS",
    "INFINITI",
    "ACURA",
    "CADILLAC",
    "LINCOLN",
    "VOLVO",
    "ALFA ROMEO",
  ].map((s) => s.toUpperCase()),
);

function normCurrency(c: string | undefined): string {
  return normToken(c).replace(/\$/g, "");
}

export function isPremiumBrandName(brand: string | undefined): boolean {
  const b = normToken(brand);
  if (!b) return false;
  if (PREMIUM_BRAND_SET.has(b)) return true;
  if (b.startsWith("MERCEDES")) return true;
  return false;
}

function isHighVarianceByPrice(self: PeerListingInput): boolean {
  const p = self.askingPrice ?? 0;
  if (p <= 0 || !Number.isFinite(p)) return false;
  const c = normCurrency(self.currency);
  if (c === "PEN" || c === "S/" || c === "SOLES") return p >= PEN_HIGH_VARIANCE_THRESHOLD;
  if (c === "USD" || c === "US" || c === "DOLARES" || c === "DÓLARES" || c === "") return p >= USD_HIGH_VARIANCE_THRESHOLD;
  return p >= USD_HIGH_VARIANCE_THRESHOLD;
}

/** Premium por marca o precio alto (USD o PEN equivalente). */
export function isHighVarianceSegment(self: PeerListingInput): boolean {
  return isPremiumBrandName(self.brand) || isHighVarianceByPrice(self);
}

function normToken(s: string | undefined): string {
  if (typeof s !== "string") return "";
  return s.trim().toUpperCase().replace(/\s+/g, " ");
}

function normTitle(s: string | undefined): string {
  return normToken(s).replace(/[,]/g, " ");
}

export function brandModelKey(brand?: string, model?: string): string | null {
  const b = normToken(brand);
  const m = normToken(model);
  if (!b || !m) return null;
  return `${b}|${m}`;
}

function medianRounded(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return Math.round(s[mid]);
  return Math.round((s[mid - 1] + s[mid]) / 2);
}

/** Mediana sin redondear (solo para contrastar con la media). */
function medianFloatSorted(sortedAsc: number[]): number {
  const m = sortedAsc.length;
  if (m === 0) return 0;
  const mid = Math.floor(m / 2);
  if (m % 2 === 1) return sortedAsc[mid];
  return (sortedAsc[mid - 1] + sortedAsc[mid]) / 2;
}

/**
 * Sesgo a la derecha en precios: muchos / fuertes outliers por encima (cola alta más larga que la baja, media por encima de la mediana).
 */
function isSkewedUpward(sortedAsc: number[]): boolean {
  const n = sortedAsc.length;
  if (n < 4) return false;
  const minV = sortedAsc[0];
  const maxV = sortedAsc[n - 1];
  const med = medianFloatSorted(sortedAsc);
  if (med <= 0 || minV >= med) return false;

  const mean = sortedAsc.reduce((s, x) => s + x, 0) / n;
  if (mean <= med * 1.025) return false;

  const q1i = Math.floor((n - 1) * 0.25);
  const q3i = Math.ceil((n - 1) * 0.75);
  const q1 = sortedAsc[q1i];
  const q3 = sortedAsc[q3i];
  const lowerArm = med - q1;
  const upperArm = q3 - med;
  if (lowerArm <= 0) return mean > med * 1.04;
  return upperArm > lowerArm * 1.1;
}

/**
 * Con sesgo alto: mediana solo sobre los precios más bajos (al menos minPeers, como mucho la mitad inferior redondeada hacia abajo).
 */
function pricesForMedianPreferringLowerWhenSkewed(sortedAsc: number[], minPeers: number): number[] {
  const n = sortedAsc.length;
  if (n === 0) return sortedAsc;
  if (!isSkewedUpward(sortedAsc)) return sortedAsc;

  const lowerHalfFloor = Math.floor(n / 2);
  const take = Math.min(n, Math.max(minPeers, lowerHalfFloor));
  return sortedAsc.slice(0, take);
}

/** Señales explícitas en título para no mezclar gamas muy distintas. */
type TrimSignals = {
  sportLux: boolean;
  diesel: boolean;
  hybrid: boolean;
  awd: boolean;
};

const RE_SPORT_LUX =
  /\b(AMG|GTI|GTD|CUPRA|TIPO[\s-]?R|TYPE[\s-]?R|M[\s-]?SPORT|MSPORT|R[\s-]?LINE|RLINE|COMPETITION|COOPER[\s-]?S|JCW|NISMO|RS\s?\d|M\d{2,3}\b|C\s?63|E\s?63|X\dM|TRACKHAWK|SRT|GR\s|SHELBY|LINEA\s+R|HIGHLINE|EXCLUSIVE|PREMIUM\s+PLUS)\b/i;
const RE_DIESEL = /\b(DIESEL|TDI|TDCI|TDCi|DCI|HDI|BLUE\s*HDI|D[\s-]?4D|TDC|CDI|BLUETEC)\b/i;
const RE_HYBRID =
  /\b(HYBRID|HEV|PHEV|PLUGIN|PLUG[\s-]?IN|E[\s-]?HYBRID|MILD\s*HYBRID|H[IÍ]BRIDO|HIBRIDO)\b/i;
const RE_AWD = /\b(4MATIC|QUATTRO|XDRIVE|X[\s-]?DRIVE|4X4|4WD|\bAWD\b|4MOTION|SYMMETRICAL)\b/i;

export function trimSignalsFromTitle(title: string | undefined): TrimSignals {
  const t = normTitle(title);
  return {
    sportLux: RE_SPORT_LUX.test(t),
    diesel: RE_DIESEL.test(t),
    hybrid: RE_HYBRID.test(t),
    awd: RE_AWD.test(t),
  };
}

/**
 * Compatible si las cuatro señales coinciden (ausencia = false en ambos → mismo “bucket” base).
 */
export function trimTitlesCompatible(selfTitle: string | undefined, peerTitle: string | undefined): boolean {
  const a = trimSignalsFromTitle(selfTitle);
  const b = trimSignalsFromTitle(peerTitle);
  return (
    a.sportLux === b.sportLux &&
    a.diesel === b.diesel &&
    a.hybrid === b.hybrid &&
    a.awd === b.awd
  );
}

type EngineClass = "ev" | "diesel" | "v8_plus" | "v6" | "four_cyl" | "unknown";

const RE_ENGINE_EV = /\b(ELECTRIC|E[\s-]?TRON|IONIQ\s*[56]|TESLA|BEV|\bEV\b)\b/i;
const RE_ENGINE_V8PLUS = /\b(V8|V\s*8|V10|V12|W12|P\s*500\b|P500\b|5\.0\s*[LT]|\bSVR\b|TRACKHAWK|SRT\s*8)\b/i;
const RE_ENGINE_V6 = /\b(V6|V\s*6|P\s*400\b|P400\b|P\s*360\b|P360\b|3\.0\s*[LT]|TWIN\s*TURBO\s*V6)\b/i;
const RE_ENGINE_4CYL =
  /\b(I4|L4|4\s*CIL|4CIL|P\s*200\b|P200\b|P\s*250\b|P250\b|P\s*300\b(?!\s*D)|1\.[56]\s*[LT]|2\.0\s*[LT])\b/i;

function engineClassFromTitle(title: string | undefined): EngineClass {
  const t = normTitle(title);
  if (!t) return "unknown";
  if (RE_ENGINE_EV.test(t)) return "ev";
  if (RE_DIESEL.test(t)) return "diesel";
  if (RE_ENGINE_V8PLUS.test(t)) return "v8_plus";
  if (RE_ENGINE_V6.test(t)) return "v6";
  if (RE_ENGINE_4CYL.test(t)) return "four_cyl";
  return "unknown";
}

/**
 * Si el motor del aviso es identificable, el comparable debe ser del mismo bucket; si no, no filtramos por motor.
 */
function premiumEngineCompatible(selfTitle: string | undefined, peerTitle: string | undefined): boolean {
  const sc = engineClassFromTitle(selfTitle);
  if (sc === "unknown") return true;
  return engineClassFromTitle(peerTitle) === sc;
}

function priceWithinBand(selfPrice: number, peerPrice: number): boolean {
  if (selfPrice <= 0 || !Number.isFinite(selfPrice)) return true;
  const lo = selfPrice * (1 - PRICE_BAND_FRAC);
  const hi = selfPrice * (1 + PRICE_BAND_FRAC);
  return peerPrice >= lo && peerPrice <= hi;
}

function yearMatches(
  peerYear: number | undefined,
  selfYear: number | undefined,
  tol: number | "any",
): boolean {
  if (tol === "any") {
    return peerYear != null && peerYear >= 1990;
  }
  if (selfYear == null || selfYear < 1990 || peerYear == null || peerYear < 1990) return false;
  return Math.abs(peerYear - selfYear) <= tol;
}

/**
 * Dispersión alta → referencia poco fiable (mezcla de gamas o outliers que colaron).
 */
export function pricesLookInconsistent(values: number[]): boolean {
  if (values.length < 2) return false;
  const s = [...values].sort((a, b) => a - b);
  const lo = s[0];
  const hi = s[s.length - 1];
  if (lo <= 0) return true;
  if (hi / lo > 1.65) return true;
  if (values.length >= 3) {
    const med = medianRounded(s);
    if (med <= 0) return true;
    const q1i = Math.floor((s.length - 1) * 0.25);
    const q3i = Math.ceil((s.length - 1) * 0.75);
    const q1 = s[q1i];
    const q3 = s[q3i];
    const iqrRatio = (q3 - q1) / med;
    if (iqrRatio > 0.38) return true;
  }
  if (values.length === 2 && hi / lo > 1.42) return true;
  return false;
}

type PassConfig = {
  tier: MarketReferenceTier;
  yearTol: number | "any";
  trimStrict: boolean;
};

const PASS_ORDER: PassConfig[] = [
  { tier: "bm_trim_pm1", yearTol: 1, trimStrict: true },
  { tier: "bm_trim_pm2", yearTol: 2, trimStrict: true },
  { tier: "bm_trim_pm4", yearTol: 4, trimStrict: true },
  { tier: "bm_trim_any", yearTol: "any", trimStrict: true },
  { tier: "bm_wide_pm1", yearTol: 1, trimStrict: false },
  { tier: "bm_wide_pm2", yearTol: 2, trimStrict: false },
  { tier: "bm_wide_pm4", yearTol: 4, trimStrict: false },
  { tier: "bm_wide_any", yearTol: "any", trimStrict: false },
];

/** Pick-up estructurado: solo pasadas con versión por título estricta (no bm_wide_*). */
const PICKUP_STRICT_PASS_ORDER: PassConfig[] = PASS_ORDER.filter((p) => p.trimStrict);

/**
 * Menor = más parecido al aviso (año y precio; el año pesa más).
 */
function similarityScore(self: PeerListingInput, peer: PeerListingInput): number {
  const peerPrice = peer.askingPrice;
  if (peerPrice == null || !Number.isFinite(peerPrice) || peerPrice <= 0) return Number.POSITIVE_INFINITY;

  const sy = self.year;
  const py = peer.year;
  let yearPart = 12;
  if (sy != null && sy >= 1990 && py != null && py >= 1990) {
    yearPart = Math.abs(py - sy);
  }

  const selfP = self.askingPrice ?? 0;
  let pricePart = 0;
  if (selfP > 0 && Number.isFinite(selfP)) {
    const ratio = peerPrice / selfP;
    if (ratio > 0) pricePart = Math.abs(Math.log(ratio));
  }

  return yearPart * 1_000 + pricePart * 350;
}

function collectFilteredCandidates(
  listings: PeerListingInput[],
  self: PeerListingInput,
  pass: PassConfig,
  structuredMode: "off" | "strict",
): PeerListingInput[] {
  const selfBm = brandModelKey(self.brand, self.model);
  if (!selfBm) return [];

  const selfPrice = self.askingPrice ?? 0;
  const selfTitle = self.title;
  const family = classifyValuationFamily(self);

  const out: PeerListingInput[] = [];
  for (const o of listings) {
    if (o.id === self.id) continue;
    const p = o.askingPrice;
    if (p == null || !Number.isFinite(p) || p <= 0) continue;
    if (brandModelKey(o.brand, o.model) !== selfBm) continue;
    if (!yearMatches(o.year, self.year, pass.yearTol)) continue;
    if (!priceWithinBand(selfPrice, p)) continue;
    if (pass.trimStrict && !trimTitlesCompatible(selfTitle, o.title)) continue;
    if (structuredMode === "strict" && hasStructuredComparableSignals(self)) {
      if (!peersStructurallyCompatible(self, o, family)) continue;
    }
    out.push(o);
  }
  return out;
}

/**
 * Pick-up con datos estructurados: mismos filtros de pasada que el flujo general pero comparables solo si
 * pasan `peersPickupStrictComparable` (sin relajar a mezclas 4x2/4x4, diésel/gasolina, etc.).
 */
function collectPickupStrictFilteredCandidates(
  listings: PeerListingInput[],
  self: PeerListingInput,
  pass: PassConfig,
): PeerListingInput[] {
  const selfBm = brandModelKey(self.brand, self.model);
  if (!selfBm) return [];

  const selfPrice = self.askingPrice ?? 0;
  const selfTitle = self.title;

  const out: PeerListingInput[] = [];
  for (const o of listings) {
    if (o.id === self.id) continue;
    const p = o.askingPrice;
    if (p == null || !Number.isFinite(p) || p <= 0) continue;
    if (brandModelKey(o.brand, o.model) !== selfBm) continue;
    if (!yearMatches(o.year, self.year, pass.yearTol)) continue;
    if (!priceWithinBand(selfPrice, p)) continue;
    if (pass.trimStrict && !trimTitlesCompatible(selfTitle, o.title)) continue;
    if (!peersPickupStrictComparable(self, o)) continue;
    out.push(o);
  }
  return out;
}

/** Premium / alto valor: mismo modelo, año ±1, versión + motor (si aplica), banda ±30%. Sin pasadas amplias. */
function collectPremiumStrictCandidates(listings: PeerListingInput[], self: PeerListingInput): PeerListingInput[] {
  const selfBm = brandModelKey(self.brand, self.model);
  if (!selfBm) return [];

  const selfPrice = self.askingPrice ?? 0;
  const selfTitle = self.title;

  const out: PeerListingInput[] = [];
  for (const o of listings) {
    if (o.id === self.id) continue;
    const p = o.askingPrice;
    if (p == null || !Number.isFinite(p) || p <= 0) continue;
    if (brandModelKey(o.brand, o.model) !== selfBm) continue;
    if (!yearMatches(o.year, self.year, 1)) continue;
    if (!priceWithinBand(selfPrice, p)) continue;
    if (!trimTitlesCompatible(selfTitle, o.title)) continue;
    if (!premiumEngineCompatible(selfTitle, o.title)) continue;
    if (hasStructuredComparableSignals(self) && !premiumStructuredPeersCompatible(self, o)) continue;
    out.push(o);
  }
  return out;
}

/**
 * Mediana sobre los comparables más cercanos (máx. 3), sin recorte de cola superior ni sesgo a la baja.
 * Piso: no menos del 75% de la mediana de los 1–3 avisos más cercanos por similitud.
 */
function tryPremiumStrictPasses(
  listings: PeerListingInput[],
  row: PeerListingInput,
  minPeers: number,
): TierHit | null {
  const candidates = collectPremiumStrictCandidates(listings, row);
  if (candidates.length < minPeers) return null;

  const sorted = [...candidates].sort((a, b) => similarityScore(row, a) - similarityScore(row, b));
  const targetKeep = Math.max(minPeers, Math.min(PREFERRED_PREMIUM_COMPARABLES, sorted.length));
  const slicePeers = sorted.slice(0, targetKeep);
  const closestN = Math.min(3, sorted.length);
  const closestPeers = sorted.slice(0, closestN);
  const prices = slicePeers.map((o) => o.askingPrice!);
  const closestPrices = closestPeers.map((o) => o.askingPrice!);

  const highPriceSpread = pricesLookInconsistent(prices) || prices.length < 3;
  const medianRef = medianRounded(prices);
  const closestMedian = medianRounded(closestPrices);
  const floored = Math.max(medianRef, Math.round(closestMedian * PREMIUM_CLOSEST_MEDIAN_FLOOR_FRAC));
  const tier: MarketReferenceTier = prices.length >= 3 ? "premium_trim_pm1" : "premium_trim_pm1_sparse";

  return {
    price: floored,
    count: prices.length,
    tier,
    highPriceSpread,
    skippedUpperPriceTailTrim: false,
    structuredComparableRelaxed: false,
    strictPoolCount: prices.length,
    usedConservativePickupFallback: false,
  };
}

/**
 * Precios ya seleccionados: orden ascendente, quita la cola superior (frac fija) y mediana del resto.
 * Si quitar esa cola dejaría menos de minPeers, no recorta y devuelve la muestra completa ordenada.
 */
function trimUpperPriceTailAndMedian(
  prices: number[],
  minPeers: number,
): { trimmedPrices: number[]; skippedTrim: boolean } {
  if (prices.length === 0) {
    return { trimmedPrices: [], skippedTrim: false };
  }
  const sortedAsc = [...prices].sort((a, b) => a - b);
  const n = sortedAsc.length;

  const maxRemove = n - minPeers;
  let removeCount = Math.round(n * UPPER_TAIL_REMOVE_FRAC);
  if (n >= 4 && maxRemove >= 1 && removeCount < 1) removeCount = 1;
  removeCount = Math.min(removeCount, maxRemove);

  if (removeCount <= 0) {
    return { trimmedPrices: sortedAsc, skippedTrim: true };
  }

  const remaining = sortedAsc.slice(0, n - removeCount);
  if (remaining.length < minPeers) {
    return { trimmedPrices: sortedAsc, skippedTrim: true };
  }
  return { trimmedPrices: remaining, skippedTrim: false };
}

/**
 * Ordena candidatos por similitud y toma un subconjunto acotado; los precios se procesan después con cola superior.
 */
function buildSimilarityPriceSample(
  self: PeerListingInput,
  candidates: PeerListingInput[],
  pass: PassConfig,
  minPeers: number,
): number[] {
  if (candidates.length === 0) return [];

  const sorted = [...candidates].sort((a, b) => similarityScore(self, a) - similarityScore(self, b));

  let preferredCap = pass.trimStrict ? PREFERRED_COMPARABLES_STRICT_PASS : PREFERRED_COMPARABLES_WIDE_PASS;
  if (minPeers === 1) preferredCap = Math.min(preferredCap, 3);
  else if (minPeers === 2) preferredCap = Math.min(preferredCap, 4);

  const targetKeep = Math.max(minPeers, Math.min(preferredCap, sorted.length));
  const keep = Math.min(sorted.length, targetKeep);
  const slice = sorted.slice(0, keep);
  return slice.map((o) => o.askingPrice!);
}

type TierHit = {
  price: number;
  count: number;
  tier: MarketReferenceTier;
  highPriceSpread: boolean;
  skippedUpperPriceTailTrim: boolean;
  structuredComparableRelaxed?: boolean;
  /** Tamaño del pool estricto en la pasada ganadora (pick-up); si no aplica, se infiere de `count`. */
  strictPoolCount?: number;
  usedConservativePickupFallback?: boolean;
};

/**
 * Pick-up con señales estructuradas: nunca relaja a bm_wide ni mezcla atributos incompatibles.
 * Si hay menos de 3 peers en la muestra final, usa 2 o 1 con referencia conservadora; si 0, precio del aviso.
 */
function tryPickupConservativeMarket(listings: PeerListingInput[], row: PeerListingInput): TierHit {
  for (const minPeers of PEER_COUNT_PRIORITY) {
    for (const pass of PICKUP_STRICT_PASS_ORDER) {
      const candidates = collectPickupStrictFilteredCandidates(listings, row, pass);
      if (candidates.length < minPeers) continue;

      const rawSample = buildSimilarityPriceSample(row, candidates, pass, minPeers);
      if (rawSample.length < minPeers) continue;

      const { trimmedPrices, skippedTrim } = trimUpperPriceTailAndMedian(rawSample, minPeers);
      if (trimmedPrices.length < minPeers) continue;

      const highPriceSpread = pricesLookInconsistent(trimmedPrices);
      const forMedian = pricesForMedianPreferringLowerWhenSkewed(trimmedPrices, minPeers);
      const strictPoolCount = candidates.length;
      const usedConservativePickupFallback = forMedian.length < 3;

      return {
        price: medianRounded(forMedian),
        count: forMedian.length,
        tier: pass.tier,
        highPriceSpread,
        skippedUpperPriceTailTrim: skippedTrim,
        structuredComparableRelaxed: false,
        strictPoolCount,
        usedConservativePickupFallback,
      };
    }
  }

  const selfPrice = row.askingPrice;
  const market =
    selfPrice != null && Number.isFinite(selfPrice) && selfPrice > 0 ? Math.round(selfPrice) : 0;
  return {
    price: market,
    count: 0,
    tier: "fallback_self",
    highPriceSpread: false,
    skippedUpperPriceTailTrim: false,
    structuredComparableRelaxed: false,
    strictPoolCount: 0,
    usedConservativePickupFallback: true,
  };
}

function tryPassesForMinPeers(
  listings: PeerListingInput[],
  row: PeerListingInput,
  minPeers: number,
): TierHit | null {
  const family = classifyValuationFamily(row);
  const canStructuredStrict =
    hasStructuredComparableSignals(row) &&
    family !== "general" &&
    family !== "premium_european";

  for (const pass of PASS_ORDER) {
    let relaxed = false;
    let candidates = collectFilteredCandidates(
      listings,
      row,
      pass,
      canStructuredStrict ? "strict" : "off",
    );
    if (candidates.length < minPeers && canStructuredStrict) {
      candidates = collectFilteredCandidates(listings, row, pass, "off");
      relaxed = true;
    }
    if (candidates.length < minPeers) continue;
    const rawSample = buildSimilarityPriceSample(row, candidates, pass, minPeers);
    if (rawSample.length < minPeers) continue;

    const { trimmedPrices, skippedTrim } = trimUpperPriceTailAndMedian(rawSample, minPeers);
    if (trimmedPrices.length < minPeers) continue;

    const highPriceSpread = pricesLookInconsistent(trimmedPrices);
    const forMedian = pricesForMedianPreferringLowerWhenSkewed(trimmedPrices, minPeers);
    return {
      price: medianRounded(forMedian),
      count: forMedian.length,
      tier: pass.tier,
      highPriceSpread,
      skippedUpperPriceTailTrim: skippedTrim,
      structuredComparableRelaxed: relaxed,
    };
  }
  return null;
}

function minPeersPassFromHitCount(count: number): 1 | 2 | 3 | null {
  if (count <= 0) return null;
  if (count >= 3) return 3;
  return count as 1 | 2;
}

function peerResultFromTierHit(hit: TierHit, minPeersPass: 1 | 2 | 3 | null): PeerMarketResult {
  return {
    marketPrice: hit.price,
    comparableCount: hit.count,
    tier: hit.tier,
    minPeersPass,
    highPriceSpread: hit.highPriceSpread,
    skippedUpperPriceTailTrim: hit.skippedUpperPriceTailTrim,
    structuredComparableRelaxed: hit.structuredComparableRelaxed ?? false,
    strictComparablesCount: hit.strictPoolCount ?? hit.count,
    usedConservativePickupFallback: hit.usedConservativePickupFallback ?? false,
  };
}

const EMPTY_PEER_RESULT: Omit<PeerMarketResult, "marketPrice" | "tier"> = {
  comparableCount: 0,
  minPeersPass: null,
  highPriceSpread: false,
  skippedUpperPriceTailTrim: false,
  structuredComparableRelaxed: false,
  strictComparablesCount: 0,
  usedConservativePickupFallback: false,
};

export function computePeerMarketMeta(listings: PeerListingInput[]): Map<string, PeerMarketResult> {
  const result = new Map<string, PeerMarketResult>();

  for (const row of listings) {
    let hit: TierHit | null = null;
    let minPeersPass: 1 | 2 | 3 | null = null;

    if (isHighVarianceSegment(row)) {
      for (const minPeers of PEER_COUNT_PRIORITY) {
        hit = tryPremiumStrictPasses(listings, row, minPeers);
        if (hit) {
          minPeersPass = minPeers;
          break;
        }
      }
      if (hit) {
        result.set(row.id, peerResultFromTierHit(hit, minPeersPass));
        continue;
      }
      const selfPrice = row.askingPrice;
      const market =
        selfPrice != null && Number.isFinite(selfPrice) && selfPrice > 0 ? Math.round(selfPrice) : 0;
      result.set(row.id, {
        marketPrice: market,
        ...EMPTY_PEER_RESULT,
        tier: "fallback_self",
      });
      continue;
    }

    if (classifyValuationFamily(row) === "pickup" && hasStructuredComparableSignals(row)) {
      hit = tryPickupConservativeMarket(listings, row);
      minPeersPass = minPeersPassFromHitCount(hit.count);
      result.set(row.id, peerResultFromTierHit(hit, minPeersPass));
      continue;
    }

    for (const minPeers of PEER_COUNT_PRIORITY) {
      hit = tryPassesForMinPeers(listings, row, minPeers);
      if (hit) {
        minPeersPass = minPeers;
        break;
      }
    }

    if (hit) {
      result.set(row.id, peerResultFromTierHit(hit, minPeersPass));
      continue;
    }

    const selfPrice = row.askingPrice;
    const market =
      selfPrice != null && Number.isFinite(selfPrice) && selfPrice > 0 ? Math.round(selfPrice) : 0;
    result.set(row.id, {
      marketPrice: market,
      ...EMPTY_PEER_RESULT,
      tier: "fallback_self",
    });
  }

  return result;
}

export function computePeerMarketPrices(listings: PeerListingInput[]): Map<string, number> {
  const m = computePeerMarketMeta(listings);
  return new Map([...m].map(([id, v]) => [id, v.marketPrice]));
}
