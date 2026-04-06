"use client";

import { useMemo, useState } from "react";
import type { CarDeal } from "@/data/mock-cars";
import {
  BUSINESS_LABELS_DEFAULT_FEED_VISIBLE,
  type BusinessDisplayLabel,
  businessDisplayLabelEs,
} from "@/lib/business-opportunity-layer";
import { DealCard } from "@/components/DealCard";

type FeedFilter = "oportunidades" | "gangas" | "todas";

const FILTERS: { id: FeedFilter; label: string }[] = [
  { id: "oportunidades", label: "Solo oportunidades" },
  { id: "gangas", label: "Solo gangas" },
  { id: "todas", label: "Todas" },
];

function labelsForFilter(mode: FeedFilter): Set<BusinessDisplayLabel> | null {
  switch (mode) {
    case "oportunidades":
      return new Set(BUSINESS_LABELS_DEFAULT_FEED_VISIBLE);
    case "gangas":
      return new Set<BusinessDisplayLabel>(["ganga_real"]);
    case "todas":
      return null;
  }
}

/** Feed principal: nunca se muestran sobreprecios (valoración); el resto se filtra por etiqueta de negocio. */
function excludeSobreprecio(deals: CarDeal[]): CarDeal[] {
  return deals.filter((d) => d.bargainTier !== "sobreprecio");
}

function filterDeals(deals: CarDeal[], mode: FeedFilter): CarDeal[] {
  const allow = labelsForFilter(mode);
  if (!allow) return deals;
  return deals.filter((d) => allow.has(d.businessDisplayLabel));
}

type LabelCounts = Record<BusinessDisplayLabel, number>;

function countByBusinessLabel(deals: CarDeal[]): LabelCounts {
  const z: LabelCounts = {
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

type Props = { deals: CarDeal[] };

const SPARSE_VISIBLE_THRESHOLD = 3;

export function DealFeed({ deals }: Props) {
  const [filter, setFilter] = useState<FeedFilter>("oportunidades");

  const feedDeals = useMemo(() => excludeSobreprecio(deals), [deals]);
  const visible = useMemo(() => filterDeals(feedDeals, filter), [feedDeals, filter]);
  const labelCounts = useMemo(() => countByBusinessLabel(deals), [deals]);
  const showSparseHint =
    visible.length > 0 && (visible.length <= SPARSE_VISIBLE_THRESHOLD || feedDeals.length <= SPARSE_VISIBLE_THRESHOLD);

  return (
    <main className="md-page-enter-d1 mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-20">
      <div className="mb-8 border-b border-zinc-200/60 pb-8 sm:mb-10 sm:pb-10">
        <div className="flex flex-col gap-6 sm:gap-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 space-y-1.5">
              <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-zinc-950 sm:text-2xl">
                Selección de hoy
              </h2>
              <p className="max-w-md text-[0.9375rem] leading-relaxed text-zinc-600">
                Orden por capa de negocio (reventa modelada, negociación y confianza). La valoración clásica sigue en
                cada tarjeta para auditoría.
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
            <div className="flex w-full min-w-0 gap-1 rounded-2xl bg-zinc-100/90 p-1 ring-1 ring-zinc-200/70 sm:max-w-xl">
              {FILTERS.map(({ id, label }) => {
                const active = filter === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={[
                      "min-w-0 flex-1 rounded-xl px-2 py-2.5 text-center text-[0.75rem] font-medium leading-snug tracking-tight transition-all sm:px-3 sm:text-[0.8125rem]",
                      active
                        ? "bg-white text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/90"
                        : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[0.6875rem] leading-relaxed text-zinc-400 sm:max-w-[15rem] sm:shrink-0 sm:text-right">
              Por defecto: <span className="text-zinc-500">Ganga real</span>,{" "}
              <span className="text-zinc-500">Aprovechable</span> y{" "}
              <span className="text-zinc-500">Negociable</span>. Ocultos:{" "}
              <span className="text-zinc-500">Margen bajo</span>,{" "}
              <span className="text-zinc-500">Descartar</span> y{" "}
              <span className="text-zinc-500">Revisar manualmente</span>.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-zinc-200/70 bg-white/80 px-3.5 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:px-4 sm:py-3.5">
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-1 text-[0.6875rem] leading-snug text-zinc-500 sm:gap-x-0 sm:text-[0.7rem]">
          <span className="font-medium text-zinc-600">Resumen (negocio)</span>
          <span className="mx-1 hidden text-zinc-300 sm:inline" aria-hidden>
            ·
          </span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">Analizados</span> {deals.length}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">{businessDisplayLabelEs("ganga_real")}</span> {labelCounts.ganga_real}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">{businessDisplayLabelEs("aprovechable")}</span> {labelCounts.aprovechable}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">{businessDisplayLabelEs("negociable")}</span> {labelCounts.negociable}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">{businessDisplayLabelEs("margen_bajo")}</span> {labelCounts.margen_bajo}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">{businessDisplayLabelEs("descartar")}</span> {labelCounts.descartar}
          </span>
          <span className="mx-1.5 text-zinc-300">·</span>
          <span className="tabular-nums text-zinc-700">
            <span className="text-zinc-500">{businessDisplayLabelEs("revisar_manualmente")}</span>{" "}
            {labelCounts.revisar_manualmente}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-1.5 gap-y-0.5 border-t border-zinc-100 pt-2 text-[0.65rem] text-zinc-400">
          <span className="font-medium text-zinc-500">Valoración</span>
          <span className="tabular-nums">
            Ganga {deals.filter((d) => d.bargainTier === "ganga_real").length}
          </span>
          <span>·</span>
          <span className="tabular-nums">
            Buena compra {deals.filter((d) => d.bargainTier === "buena_compra").length}
          </span>
          <span>·</span>
          <span className="tabular-nums">
            Precio justo {deals.filter((d) => d.bargainTier === "precio_justo").length}
          </span>
          <span>·</span>
          <span className="tabular-nums">
            Sobreprecio {deals.filter((d) => d.bargainTier === "sobreprecio").length}
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
          Pocas coincidencias con el filtro actual
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200/90 bg-white/70 px-5 py-14 text-center text-[0.9375rem] leading-relaxed text-zinc-500 shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
          {feedDeals.length === 0 ? (
            <>
              Con el modelo actual, todos los avisos quedan en <span className="font-medium text-zinc-700">Sobreprecio</span>
              . No hay entradas que mostrar en el feed (los datos siguen en el lote analizado).
            </>
          ) : (
            <>
              No hay listados en esta vista. Prueba <span className="font-medium text-zinc-700">Todas</span> para ver también{" "}
              <span className="font-medium text-zinc-700">Margen bajo</span>,{" "}
              <span className="font-medium text-zinc-700">Descartar</span> y{" "}
              <span className="font-medium text-zinc-700">Revisar manualmente</span>.
            </>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-5 sm:gap-6">
          {visible.map((deal, i) => (
            <li
              key={deal.id}
              className="md-page-enter-d2"
              style={{ animationDelay: `${2.68 + i * 0.045}s` }}
            >
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
