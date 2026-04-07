"use client";

import { useMemo, useState } from "react";
import type { CarDeal } from "@/data/mock-cars";
import {
  BUSINESS_DISPLAY_LABEL_FEED_ORDER,
  BUSINESS_LABELS_DEFAULT_FEED_VISIBLE,
  type BusinessDisplayLabel,
  businessDisplayLabelEs,
} from "@/lib/business-opportunity-layer";
import { DealCard } from "@/components/DealCard";

type FeedFilter = "todas" | "oportunidades" | BusinessDisplayLabel;

const LABEL_FILTERS: BusinessDisplayLabel[] = [...BUSINESS_DISPLAY_LABEL_FEED_ORDER];

function filterDeals(deals: CarDeal[], mode: FeedFilter): CarDeal[] {
  if (mode === "todas") return deals;
  if (mode === "oportunidades") {
    return deals.filter((d) => BUSINESS_LABELS_DEFAULT_FEED_VISIBLE.has(d.businessDisplayLabel));
  }
  return deals.filter((d) => d.businessDisplayLabel === mode);
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

function chipClass(active: boolean): string {
  return [
    "rounded-xl px-2.5 py-2 text-center text-[0.7rem] font-medium leading-snug tracking-tight transition-all sm:px-3 sm:text-[0.8125rem]",
    active
      ? "bg-white text-zinc-950 shadow-[0_1px_3px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-200/90"
      : "text-zinc-500 hover:bg-white/50 hover:text-zinc-700",
  ].join(" ");
}

export function DealFeed({ deals }: Props) {
  const [filter, setFilter] = useState<FeedFilter>("oportunidades");

  const feedDeals = useMemo(() => deals.filter((d) => d.bargainTier !== "sobreprecio"), [deals]);
  const visible = useMemo(() => filterDeals(feedDeals, filter), [feedDeals, filter]);
  const labelCounts = useMemo(() => countByBusinessLabel(feedDeals), [feedDeals]);
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
                Orden por capa de negocio (reventa modelada, negociación y confianza). Filtra por categoría de oportunidad
                o abre «Todas» / cada etiqueta para auditar el mercado completo.
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
              ) : filter === "oportunidades" ? (
                <>
                  {visible.length} oportunidades
                  <span className="font-normal text-zinc-400"> · {feedDeals.length} sin sobreprecio</span>
                </>
              ) : (
                <>
                  {visible.length} con «{businessDisplayLabelEs(filter)}»
                  <span className="font-normal text-zinc-400"> · {feedDeals.length} sin sobreprecio</span>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-3" role="toolbar" aria-label="Filtro por categoría de negocio">
            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-zinc-400">Vista</p>
            <div className="flex flex-wrap gap-1.5 rounded-2xl bg-zinc-100/90 p-1.5 ring-1 ring-zinc-200/70">
              <button
                type="button"
                onClick={() => setFilter("oportunidades")}
                className={chipClass(filter === "oportunidades")}
                aria-pressed={filter === "oportunidades"}
              >
                Oportunidades
                <span className="mt-0.5 block text-[0.65rem] font-normal text-zinc-400 sm:inline sm:mt-0 sm:before:content-['·'] sm:before:mx-1">
                  Ganga + Aprov. + Neg.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFilter("todas")}
                className={chipClass(filter === "todas")}
                aria-pressed={filter === "todas"}
              >
                Todas
              </button>
            </div>

            <p className="text-[0.6875rem] font-medium uppercase tracking-wide text-zinc-400">Por etiqueta</p>
            <div className="flex flex-wrap gap-1.5">
              {LABEL_FILTERS.map((id) => {
                const active = filter === id;
                const n = labelCounts[id];
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    className={[
                      "rounded-xl border px-2.5 py-1.5 text-[0.7rem] font-medium transition-all sm:text-[0.75rem]",
                      active
                        ? "border-emerald-300/80 bg-emerald-50/90 text-emerald-950 ring-1 ring-emerald-500/15"
                        : "border-zinc-200/80 bg-white/80 text-zinc-600 hover:border-zinc-300 hover:bg-white",
                    ].join(" ")}
                    aria-pressed={active}
                  >
                    {businessDisplayLabelEs(id)}
                    <span className="ml-1 tabular-nums text-zinc-400">({n})</span>
                  </button>
                );
              })}
            </div>
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
          Pocas coincidencias con el filtro actual — prueba otra etiqueta o «Todas» para ver más contexto del mercado.
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
              No hay listados en esta vista. Cambia el filtro (p. ej. <span className="font-medium text-zinc-700">Todas</span>{" "}
              o otra etiqueta) para explorar el resto del mercado analizado.
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
