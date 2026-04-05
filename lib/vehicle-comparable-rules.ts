/**
 * Reglas de familia de valoración y filtrado de comparables con atributos estructurados (deals.json).
 * Prioriza datos normalizados del scraper; el título solo como respaldo cuando faltan campos.
 */

const RE_HYBRID_TITLE =
  /\b(HYBRID|HEV|PHEV|PLUGIN|PLUG[\s-]?IN|E[\s-]?HYBRID|MILD\s*HYBRID|H[IÍ]BRIDO|HIBRIDO)\b/i;

function titleSuggestsHybrid(title: string | undefined): boolean {
  const t = (title ?? "").replace(/,/g, " ");
  return RE_HYBRID_TITLE.test(t);
}

const PREMIUM_EUROPEAN_BRANDS = new Set(
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
    "VOLVO",
    "ALFA ROMEO",
  ].map((s) => s.toUpperCase()),
);

export type ValuationFamily =
  | "pickup"
  | "economy_small"
  | "family_suv"
  | "premium_european"
  | "toyota_hybrid"
  | "general";

/** Campos opcionales alineados con el scraper NeoAuto + idénticos en PeerListingInput. */
export type VehicleStructuredAttrs = {
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
};

export type VehicleComparableRow = VehicleStructuredAttrs & {
  id: string;
  brand?: string;
  model?: string;
  title?: string;
  year?: number;
  askingPrice?: number;
  currency?: string;
};

function normBrand(brand: string | undefined): string {
  return (brand ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

function normTitle(t: string | undefined): string {
  return (t ?? "").trim().toUpperCase().replace(/\s+/g, " ").replace(/,/g, " ");
}

export function isPremiumEuropeanBrand(brand: string | undefined): boolean {
  const b = normBrand(brand);
  if (!b) return false;
  if (PREMIUM_EUROPEAN_BRANDS.has(b)) return true;
  if (b.startsWith("MERCEDES")) return true;
  return false;
}

/** Híbrido / enchufable explícito en datos o título. */
export function effectiveHybridSignal(v: VehicleComparableRow): boolean | null {
  const ft = (v.fuelType ?? "").toLowerCase();
  if (ft === "hybrid" || ft === "plug_in_hybrid") return true;
  if (v.isHybrid === true) return true;
  if (v.isElectric === true || ft === "electric") return false;
  if (v.isHybrid === false && ft && ft !== "hybrid" && ft !== "plug_in_hybrid") return false;
  if (titleSuggestsHybrid(v.title)) return true;
  return null;
}

const RE_PICKUP_TITLE = /\b(HILUX|TACOMA|RANGER|AMAROK|L200|D-MAX|DMAX|BT-50|BT50|FRONTIER|COLORADO|TUNDRA|F-150|F150|SILVERADO|SIERRA|S10|SAVEIRO|STRADA|TORO|OROCH|RAMPAGE|TERRITORY\s*PICK|PICK\s*UP|PICKUP)\b/i;

function titleSuggestsPickup(title: string | undefined): boolean {
  return RE_PICKUP_TITLE.test(normTitle(title));
}

function titleSuggestsSuv(title: string | undefined): boolean {
  const t = normTitle(title);
  return /\b(CR-V|CRV|CX-5|CX5|RAV4|RAV\s*4|X-TRAIL|XTRAIL|KICKS|SPORTAGE|TUCSON|CRETA|KONA|TIGUAN|T-CROSS|TCROSS|COROLLA\s*CROSS|HR-V|HRV|COMPASS|RENEGADE|5008|3008|OUTBACK|FORESTER|ASCENT|HIGHLANDER|PILOT|PATHFINDER|ARMADA|SEQUOIA|4RUNNER|PRADO|LAND\s*CRUISER|PAJERO|MONTERO|MUX|MU-X)\b/i.test(
    t,
  );
}

/**
 * Clasificación estable para reglas de comparables y ajustes de score (no UI).
 */
export function classifyValuationFamily(v: VehicleComparableRow): ValuationFamily {
  const brand = normBrand(v.brand);
  const bt = v.bodyType ?? null;

  if (isPremiumEuropeanBrand(v.brand)) return "premium_european";

  if (brand === "TOYOTA") {
    const hy = effectiveHybridSignal(v);
    if (hy === true) return "toyota_hybrid";
  }

  if (bt === "pickup" || titleSuggestsPickup(v.title)) return "pickup";

  if (bt === "sedan" || bt === "hatchback") {
    return "economy_small";
  }

  if (bt === "suv" || bt === "minivan" || (bt === "van" && titleSuggestsSuv(v.title))) {
    return "family_suv";
  }

  if (bt === "van") return "family_suv";

  if (!bt && titleSuggestsSuv(v.title) && !titleSuggestsPickup(v.title)) {
    return "family_suv";
  }

  return "general";
}

export function hasStructuredComparableSignals(v: VehicleComparableRow): boolean {
  return (
    v.bodyType != null ||
    v.drivetrain != null ||
    v.fuelType != null ||
    v.isHybrid != null ||
    v.isElectric != null ||
    v.isDiesel != null ||
    v.transmission != null ||
    v.trim != null ||
    v.engineClass != null ||
    v.cabType != null
  );
}

type TrimBucket = "top" | "mid" | "base" | "unknown";

function trimBucketFromStructured(trim: string | null | undefined): TrimBucket {
  if (!trim || !trim.trim()) return "unknown";
  const t = trim.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();

  if (/\b(BASE|TREND|ENTRY|STD|STANDARD|BASICO)\b/.test(t)) return "base";
  if (/\b(FULL|ADVANCE|PLATINUM|LIMITED|PRESTIGE|SIGNATURE|TOURING|BLACK\s*ED|EXECUTIVE|ELITE|ULTIMATE)\b/.test(t))
    return "top";
  if (t.length >= 4) return "mid";
  return "unknown";
}

function trimTiersRoughlyCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  const ba = trimBucketFromStructured(a);
  const bb = trimBucketFromStructured(b);
  if (ba === "unknown" || bb === "unknown") return true;
  return ba === bb;
}

/**
 * Combustible normalizado para pick-up: null si no hay señal suficiente en el aviso.
 * Evita mezclar diésel con gasolina cuando ambos lados tienen dato.
 */
export function pickupFuelNormalizedKey(v: VehicleComparableRow): string | null {
  const ft = (v.fuelType ?? "").trim().toLowerCase();
  if (v.isDiesel === true) return "diesel";
  if (ft === "diesel") return "diesel";
  if (v.isElectric === true || ft === "electric") return "electric";
  if (ft === "hybrid" || ft === "plug_in_hybrid" || v.isHybrid === true) return "hybrid";
  if (ft === "gasoline" || ft === "petrol" || ft === "gas" || ft === "gasoline_ethanol" || ft === "bencina") {
    return "gasoline";
  }
  if (ft) return ft;
  return null;
}

function normCabComparable(c: string | null | undefined): string {
  return (c ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Filtro estructural estricto pick-up (Perú): tracción, combustible, bucket de versión y cabina
 * cuando el aviso tiene dato; no admite “unknown” en el comparable si el propio aviso está definido.
 */
export function peersPickupStrictComparable(self: VehicleComparableRow, peer: VehicleComparableRow): boolean {
  const sd = (self.drivetrain ?? "").trim();
  if (sd) {
    const pd = (peer.drivetrain ?? "").trim();
    if (!pd || pd !== sd) return false;
  }

  const sk = pickupFuelNormalizedKey(self);
  if (sk != null) {
    const pk = pickupFuelNormalizedKey(peer);
    if (pk == null || pk !== sk) return false;
  }

  const st = (self.trim ?? "").trim();
  const pt = (peer.trim ?? "").trim();
  const tbSelf = trimBucketFromStructured(self.trim);
  if (tbSelf !== "unknown") {
    const tbPeer = trimBucketFromStructured(peer.trim);
    if (tbPeer === "unknown" || tbPeer !== tbSelf) return false;
  } else if (st) {
    if (!pt) return false;
    const nt = st.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
    const np = pt.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
    if (nt !== np) return false;
  }

  const ca = normCabComparable(self.cabType);
  if (ca) {
    const cb = normCabComparable(peer.cabType);
    if (!cb) return false;
    if (ca !== cb && !ca.includes(cb) && !cb.includes(ca)) return false;
  }

  return true;
}

function fuelTypesCompatible(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return true;
  return a.toLowerCase() === b.toLowerCase();
}

function suvLikeBody(bt: string | null | undefined): boolean {
  if (!bt) return false;
  return bt === "suv" || bt === "minivan" || bt === "van";
}

/**
 * Filtro estricto entre aviso y comparable según familia (solo si hay señales en `self`).
 */
export function peersStructurallyCompatible(
  self: VehicleComparableRow,
  peer: VehicleComparableRow,
  family: ValuationFamily,
): boolean {
  if (!hasStructuredComparableSignals(self)) return true;

  switch (family) {
    case "pickup": {
      return peersPickupStrictComparable(self, peer);
    }
    case "economy_small": {
      if (self.bodyType && peer.bodyType && self.bodyType !== peer.bodyType) return false;
      if (self.fuelType && peer.fuelType && !fuelTypesCompatible(self.fuelType, peer.fuelType)) return false;
      return true;
    }
    case "family_suv": {
      if (self.bodyType && peer.bodyType) {
        const ss = suvLikeBody(self.bodyType);
        const sp = suvLikeBody(peer.bodyType);
        if (ss !== sp) return false;
        if (!ss && self.bodyType !== peer.bodyType) return false;
      }
      if (self.drivetrain && peer.drivetrain && self.drivetrain !== peer.drivetrain) return false;
      if (self.trim && peer.trim && !trimTiersRoughlyCompatible(self.trim, peer.trim)) return false;
      return true;
    }
    case "toyota_hybrid": {
      const ph = effectiveHybridSignal(peer);
      if (ph === false) return false;
      if (self.fuelType && peer.fuelType && !fuelTypesCompatible(self.fuelType, peer.fuelType)) return false;
      return true;
    }
    case "premium_european":
    case "general":
      return true;
  }
}

/**
 * Premium: exigir parecido en motor/tracción/versión cuando ambos lados tienen dato estructurado.
 */
export function premiumStructuredPeersCompatible(self: VehicleComparableRow, peer: VehicleComparableRow): boolean {
  if (!hasStructuredComparableSignals(self)) return true;

  if (self.engineClass && peer.engineClass && self.engineClass !== peer.engineClass) return false;
  if (self.drivetrain && peer.drivetrain && self.drivetrain !== peer.drivetrain) return false;

  if (self.trim && peer.trim) {
    const a = self.trim.trim().toUpperCase();
    const b = peer.trim.trim().toUpperCase();
    if (a !== b && !a.includes(b) && !b.includes(a)) return false;
  }

  if (self.fuelType && peer.fuelType && !fuelTypesCompatible(self.fuelType, peer.fuelType)) return false;

  const sh = effectiveHybridSignal(self);
  const ph = effectiveHybridSignal(peer);
  if (sh === true && ph === false) return false;
  if (sh === false && ph === true) return false;

  return true;
}

export function economySmallStrictMileageFamily(family: ValuationFamily): boolean {
  return family === "economy_small";
}
