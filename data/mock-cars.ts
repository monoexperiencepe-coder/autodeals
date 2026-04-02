import { dealStatus, percentBelowMarket, type DealStatus } from "@/lib/deal-utils";

export type CarListing = {
  id: string;
  title: string;
  year: number;
  mileageKm: number;
  askingPrice: number;
  marketPrice: number;
  listingUrl: string;
};

/** Raw mock rows; derived fields computed for consistency with deal rules */
const raw: CarListing[] = [
  {
    id: "1",
    title: "Toyota Hilux 4x4 DC SR",
    year: 2019,
    mileageKm: 78000,
    askingPrice: 98500,
    marketPrice: 128000,
    listingUrl: "https://www.olx.com.pe/",
  },
  {
    id: "2",
    title: "Hyundai Tucson 2.0 GL",
    year: 2021,
    mileageKm: 42000,
    askingPrice: 78900,
    marketPrice: 102000,
    listingUrl: "https://www.mercadolibre.com.pe/",
  },
  {
    id: "3",
    title: "Kia Sportage GT Line",
    year: 2020,
    mileageKm: 55000,
    askingPrice: 82500,
    marketPrice: 98000,
    listingUrl: "https://www.olx.com.pe/",
  },
  {
    id: "4",
    title: "Toyota Yaris Sedán Full",
    year: 2022,
    mileageKm: 28000,
    askingPrice: 64800,
    marketPrice: 71500,
    listingUrl: "https://www.mercadolibre.com.pe/",
  },
  {
    id: "5",
    title: "Nissan Frontier NP300 4x4",
    year: 2018,
    mileageKm: 95000,
    askingPrice: 71200,
    marketPrice: 88000,
    listingUrl: "https://www.olx.com.pe/",
  },
  {
    id: "6",
    title: "Honda Civic 1.8 EX-L",
    year: 2017,
    mileageKm: 88000,
    askingPrice: 58900,
    marketPrice: 67000,
    listingUrl: "https://www.mercadolibre.com.pe/",
  },
  {
    id: "7",
    title: "Mitsubishi L200 Katana CR",
    year: 2020,
    mileageKm: 62000,
    askingPrice: 89800,
    marketPrice: 105000,
    listingUrl: "https://www.olx.com.pe/",
  },
  {
    id: "8",
    title: "Suzuki Swift GLX Boosterjet",
    year: 2023,
    mileageKm: 12000,
    askingPrice: 68500,
    marketPrice: 72000,
    listingUrl: "https://www.mercadolibre.com.pe/",
  },
  {
    id: "9",
    title: "Toyota Corolla XEI 1.8",
    year: 2019,
    mileageKm: 51000,
    askingPrice: 67800,
    marketPrice: 70500,
    listingUrl: "https://www.olx.com.pe/",
  },
  {
    id: "10",
    title: "Hyundai Accent Sedán Full",
    year: 2021,
    mileageKm: 36000,
    askingPrice: 54800,
    marketPrice: 58500,
    listingUrl: "https://www.mercadolibre.com.pe/",
  },
];

export type CarDeal = CarListing & {
  percentBelow: number;
  status: DealStatus;
};

const statusOrder: Record<DealStatus, number> = { hot: 0, warm: 1, pass: 2 };

export function getMockDeals(): CarDeal[] {
  const enriched = raw.map((c) => {
    const percentBelow = percentBelowMarket(c.askingPrice, c.marketPrice);
    const status = dealStatus(percentBelow);
    return { ...c, percentBelow, status };
  });
  return enriched.sort((a, b) => {
    const byStatus = statusOrder[a.status] - statusOrder[b.status];
    if (byStatus !== 0) return byStatus;
    return b.percentBelow - a.percentBelow;
  });
}
