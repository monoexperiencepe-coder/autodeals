import { dealStatusLabel, type DealStatus } from "@/lib/deal-utils";
import type { CarDeal } from "@/data/mock-cars";

const leftAccentByStatus: Record<DealStatus, string> = {
  hot: "border-l-[6px] border-l-emerald-600",
  warm: "border-l-[5px] border-l-amber-400",
  pass: "border-l-[5px] border-l-zinc-200",
};

const badgeByStatus: Record<DealStatus, string> = {
  hot: "border border-emerald-300/55 bg-emerald-50/95 text-emerald-950 shadow-sm shadow-emerald-900/[0.06] ring-1 ring-emerald-400/15",
  warm: "border border-amber-200/80 bg-amber-50/90 text-amber-950 shadow-sm shadow-amber-900/[0.04]",
  pass: "border border-zinc-200/90 bg-zinc-50 text-zinc-700 shadow-sm shadow-zinc-900/[0.03]",
};

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  maximumFractionDigits: 0,
});

const kmFmt = new Intl.NumberFormat("es-PE", { maximumFractionDigits: 0 });

type Props = { deal: CarDeal };

export function DealCard({ deal }: Props) {
  const label = dealStatusLabel(deal.status);
  const isHot = deal.status === "hot";

  return (
    <a
      href={deal.listingUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={[
        "group block overflow-hidden rounded-2xl border bg-white transition duration-200",
        isHot
          ? "border-emerald-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_22px_-4px_rgba(5,100,75,0.1),inset_0_1px_0_0_rgba(255,255,255,0.92)] ring-1 ring-emerald-500/[0.16] hover:border-emerald-200/65 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_14px_40px_-10px_rgba(5,100,75,0.14)] hover:ring-emerald-500/20"
          : "border-zinc-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.04)] hover:border-zinc-200 hover:shadow-[0_2px_4px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.06)]",
        leftAccentByStatus[deal.status],
        isHot
          ? "bg-gradient-to-br from-emerald-50/55 via-white to-white"
          : "",
      ].join(" ")}
    >
      <div className="p-6 sm:flex sm:items-stretch sm:gap-8 sm:p-7">
        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <h2 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-zinc-950 sm:text-lg sm:leading-tight">
              {deal.title}
            </h2>
            <span
              className={[
                "inline-flex w-fit shrink-0 items-center rounded-lg px-2.5 py-1 text-[0.6875rem] font-semibold tracking-wide whitespace-nowrap",
                badgeByStatus[deal.status],
              ].join(" ")}
            >
              {label}
            </span>
          </div>

          <div
            className={[
              "mt-6 grid gap-5 border-t pt-5 sm:mt-7 sm:pt-6",
              isHot ? "border-emerald-100/70" : "border-zinc-100",
            ].join(" ")}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:max-w-md">
              <div>
                <p className="text-[0.6875rem] font-medium tracking-wide text-zinc-500">
                  Año
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-zinc-800">{deal.year}</p>
              </div>
              <div>
                <p className="text-[0.6875rem] font-medium tracking-wide text-zinc-500">
                  Recorrido
                </p>
                <p className="mt-1 text-sm font-medium tabular-nums text-zinc-800">
                  {kmFmt.format(deal.mileageKm)} km
                </p>
              </div>
            </div>

            <div
              className={[
                "flex flex-col gap-3 rounded-xl px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between sm:gap-6 sm:px-5 sm:py-4",
                isHot
                  ? "bg-emerald-50/45 ring-1 ring-emerald-200/45 ring-inset shadow-[inset_0_1px_0_0_rgba(255,255,255,0.65)]"
                  : "bg-zinc-50/80 ring-1 ring-zinc-100",
              ].join(" ")}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    "text-[0.6875rem] font-medium tracking-wide",
                    isHot ? "text-emerald-900/55" : "text-zinc-500",
                  ].join(" ")}
                >
                  Precio del aviso
                </p>
                <p
                  className={[
                    "mt-1 tabular-nums text-zinc-950",
                    isHot
                      ? "text-[1.375rem] font-bold tracking-[-0.03em] sm:text-[1.6875rem]"
                      : "text-xl font-semibold tracking-tight sm:text-2xl sm:tracking-[-0.02em]",
                  ].join(" ")}
                >
                  {money.format(deal.askingPrice)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col border-t border-zinc-200/80 pt-3 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
                <p className="text-[0.6875rem] font-medium tracking-wide text-zinc-500">
                  Referencia de mercado (est.)
                </p>
                <p className="mt-1 text-base font-medium tabular-nums text-zinc-500 line-through decoration-zinc-300 decoration-1 sm:text-[1.0625rem]">
                  {money.format(deal.marketPrice)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className={[
            "mt-6 flex shrink-0 flex-col justify-center rounded-xl px-5 py-4 text-center sm:mt-0 sm:w-[7.5rem] sm:px-4 sm:py-5",
            isHot
              ? "border border-emerald-200/55 bg-emerald-50/40 shadow-[0_1px_3px_rgba(5,80,60,0.07)] ring-1 ring-emerald-300/20"
              : "border border-zinc-100 bg-white shadow-sm shadow-zinc-900/[0.03]",
          ].join(" ")}
        >
          <span
            className={[
              "text-[0.625rem] font-semibold tracking-wide",
              isHot ? "text-emerald-800/60" : "text-zinc-500",
            ].join(" ")}
          >
            Vs. referencia
          </span>
          <span
            className={
              deal.percentBelow >= 20
                ? isHot
                  ? "mt-2 text-[2rem] font-bold tracking-[-0.04em] tabular-nums text-emerald-700 sm:text-[2.125rem]"
                  : "mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums text-emerald-600 sm:text-[2rem]"
                : deal.percentBelow >= 5
                  ? "mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums text-amber-700 sm:text-[2rem]"
                  : "mt-2 text-[1.75rem] font-semibold tracking-[-0.03em] tabular-nums text-zinc-400 sm:text-[2rem]"
            }
          >
            {deal.percentBelow.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%
          </span>
          <span
            className={[
              "mt-1.5 text-[0.6875rem]",
              isHot ? "font-medium text-emerald-800/55" : "text-zinc-500",
            ].join(" ")}
          >
            Ahorro potencial
          </span>
        </div>
      </div>
      <p className="border-t border-zinc-100 bg-zinc-50/40 px-6 py-3 text-center text-[0.6875rem] leading-snug text-zinc-500 sm:px-7 sm:text-left">
        El aviso original se abre en otra pestaña
      </p>
    </a>
  );
}
