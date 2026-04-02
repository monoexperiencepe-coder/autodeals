export type DealStatus = "hot" | "warm" | "pass";

/**
 * Percent the asking price is below estimated market (positive = discount).
 */
export function percentBelowMarket(askingPrice: number, marketPrice: number): number {
  if (marketPrice <= 0) return 0;
  const raw = ((marketPrice - askingPrice) / marketPrice) * 100;
  return Math.round(raw * 10) / 10;
}

/**
 * Hot: >20% below market. Warm: 5–20% below. Pass: <5% below (or above market).
 */
export function dealStatus(percentBelow: number): DealStatus {
  if (percentBelow > 20) return "hot";
  if (percentBelow >= 5) return "warm";
  return "pass";
}

export function dealStatusLabel(status: DealStatus): string {
  switch (status) {
    case "hot":
      return "Oportunidad clara";
    case "warm":
      return "Buena diferencia";
    case "pass":
      return "Cerca del mercado";
  }
}
