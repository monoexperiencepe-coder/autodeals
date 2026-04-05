"use client";

import { useMemo, useState } from "react";
import type { CarDeal } from "@/data/mock-cars";
import type { BargainTier } from "@/lib/bargain-score";
import { DealCard } from "@/components/DealCard";

type FeedFilter = "oportunidades" | "gangas" | "todas";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "oportunidades", label: "Solo oportunidades" },
  { id: "gangas", label: "Solo gangas" },
  { id: "todas", label: "Todas" },
];

function tiersForFilter(mode: FeedFilter): Set<BargainTier> | null {
  switch (mode) {
    case "oportunidades":
      return new Set<BargainTier>(["ganga_real", "buena_compra"]);
    case "gangas":
      return new Set<BargainTier>(["ganga_real"]);
    case "todas":
      return null;
  }
}

/** Feed principal: nunca se muestran sobreprecios (solo UI; el dataset completo sigue en memoria). */
function excludeSobreprecio(deals: CarDeal[]): CarDeal[] {
  return deals.filter((d) => d.bargainTier !== "sobreprecio");
}

function filterDeals(deals: CarDeal[], mode: FeedFilter): CarDeal[] {
  const allow = tiersForFilter(mode);
  if (!allow) return deals;
  return deals.filter((d) => allow.has(d.bargainTier));
}

type TierCounts = Record<BargainTier, number>;

function countByTier(deals: CarDeal[]): TierCounts {
  const z: TierCounts = { ganga_real: 0, buena_compra: 0, precio_justo: 0, sobreprecio: 0 };
  for (const d of deals) {
    z[d.bargainTier]++;
  }
  return z;
}

type Props = { deals: CarDeal[] };

const SPARSE_VISIBLE_THRESHOLD = 3;

export function DealFeed({ deals }: Props) {
  const [filter, setFilter] = useState<FeedFilter>("oportunidades");

  const feedDeals = useMemo(() => excludeSobreprecio(deals), [deals]);
  const visible = useMemo(() => filterDeals(feedDeals, filter), [feedDeals, filter]);
  const tierCounts = useMemo(() => countByTier(deals), [deals]);
  const showSparseHint =
    visible.length > 0 && (visible.length <= SPARSE_VISIBLE_THRESHOLD || feedDeals.length <= SPARSE_VISIBLE_THRESHOLD);

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-20">
      <div className="mb-8 border-b border-zinc-200/60 pb-8 sm:mb-10 sm:pb-10">
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-zinc-950 sm:text-2xl">
                Selección de hoy
              </h2>
              <p className="max-w-md text-[0.9375rem] leading-relaxed text-zinc-600">
                Orden por oportunidad de reventa (0–100): valor justo conservador, margen frente a una salida
                típica, confianza en comparables y liquidez del modelo en Perú.
              </p>
            </div>
            <p className="shrink-0 text-[0.8125rem] font-medium tabular-nums text-zinc-500 sm:pb-0.5">
              {filter === "todas" ? (
                <>
                  {visible.length} en lista
                  {deals.length !== visible.length ? (
                    <span className="font-normal text-zinc-400">
                      {" "}
                      · {deals.length} analizados
                    </span>
                  ) : null}
                </>
              ) : (
                <>
                  {visible.length} mostrados
                  <span className="font-normal text-zinc-400"> · {feedDeals.length} sin sobreprecio</span>
                </>
              )}
            </p>
          </div>

          <div
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
            role="toolbar"
            aria-label="Filtro de listados"
          >
            <div className="flex w-full min-w-0 gap-1 rounded-2xl bg-zinc-100/80 p-1 ring-1 ring-zinc-200/70 sm:max-w-xl">
              {FILTERS.map(({ id, label }) => {
                const active = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={[
                      "min-w-0 flex-1 rounded-xl px-2 py-2.5 text-center text-[0.75rem] font-medium leading-snug tracking-tight transition sm:px-3 sm:text-[0.8125rem]",
                      active
                        ? "bg-white text-zinc-950 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/80"
                        : "text-zinc-500 hover:text-zinc-800",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[0.6875rem] leading-relaxed text-zinc-400 sm:max-w-[14rem] sm:shrink-0 sm:text-right">
              Por defecto: <span className="text-zinc-500">Ganga real</span> y{" "}
              <span className="text-zinc-500">Buena compra</span>. Sobreprecio oculto en el feed.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200/70 bg-white/70 px-3.5 py-3 sm:px-4 sm:py-3.5">
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1 text-[0.6875rem] leading-snug text-zinc-500 sm:gap-x-0 sm:text-[0.7rem]">
          <span className="font-medium text-zinc-600">Resumen</span>
          <span className="mx-1 hidden text-zinc-300 sm:inline" aria-hidden>
            ·
          </span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">Analizados</span> {deals.length}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">Ganga real</span> {tierCounts.ganga_real}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">Buena compra</span> {tierCounts.buena_compra}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">Precio justo</span> {tierCounts.precio_justo}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">Sobreprecio</span> {tierCounts.sobreprecio}
          </span>
        </div>
        {filter !== "todas" ? (
          <p className="mt-2 border-t border-zinc-100 pt-2 text-[0.6875rem] font-medium tabular-nums text-zinc-600 sm:text-[0.7rem]">
            Visibles con este filtro: {visible.length}
            <span className="font-normal text-zinc-400"> · {feedDeals.length} sin sobreprecio</span>
          </p>
        ) : null}
      </div>

      {showSparseHint ? (
        <p className="mb-5 text-center text-[0.6875rem] leading-relaxed text-zinc-400 sm:mb-6">
          Mostrando solo oportunidades relevantes
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200/90 bg-white/60 px-5 py-12 text-center text-[0.9375rem] leading-relaxed text-zinc-500">
          {feedDeals.length === 0 ? (
            <>
              Con el modelo actual, todos los avisos quedan en <span className="font-medium text-zinc-700">Sobreprecio</span>
              . No hay entradas que mostrar en el feed (los datos siguen en el lote analizado).
            </>
          ) : (
            <>
              No hay listados en esta vista. Prueba <span className="font-medium text-zinc-700">Todas</span> para ver{" "}
              <span className="font-medium text-zinc-700">Precio justo</span> y el resto de oportunidades sin sobreprecio.
            </>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-5 sm:gap-6">
          {visible.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
