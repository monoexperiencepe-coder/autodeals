const TYPES = [
  {
    key: "ganga_real",
    label: "Ganga real",
    color: {
      border: "border-l-emerald-600",
      badge: "border-emerald-300/60 bg-gradient-to-br from-emerald-100/80 to-emerald-50/60 text-emerald-900",
      dot: "bg-emerald-500",
    },
    description:
      "El margen negociado supera los 2000 USD, la liquidez del modelo es alta y el riesgo de corrección es bajo. Son raras y valen la pena moverse rápido.",
  },
  {
    key: "aprovechable",
    label: "Aprovechable",
    color: {
      border: "border-l-teal-500",
      badge: "border-teal-200/80 bg-gradient-to-br from-teal-100/60 to-teal-50/50 text-teal-900",
      dot: "bg-teal-500",
    },
    description:
      "El margen negociado supera los 800 USD. No es una ganga espectacular, pero sí una compra con salida razonable en el mercado peruano.",
  },
  {
    key: "negociable",
    label: "Negociable",
    color: {
      border: "border-l-violet-500",
      badge: "border-violet-200/80 bg-gradient-to-br from-violet-100/60 to-violet-50/50 text-violet-900",
      dot: "bg-violet-500",
    },
    description:
      "No es rentable al precio actual, pero si el vendedor acepta una segunda oferta más agresiva, el margen aparece. Requiere negociar activamente.",
  },
  {
    key: "margen_bajo",
    label: "Margen bajo",
    color: {
      border: "border-l-sky-500",
      badge: "border-sky-200/75 bg-gradient-to-br from-sky-100/55 to-sky-50/50 text-sky-900",
      dot: "bg-sky-500",
    },
    description:
      "El margen positivo existe pero es pequeño. Puede funcionar si necesitas ese modelo específico, pero no es una oportunidad clara de reventa.",
  },
] as const;

export function OpportunityTypes() {
  return (
    <section className="bg-zinc-50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600">
            Clasificación
          </p>
          <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.025em] text-zinc-950 sm:text-[2.125rem]">
            Cómo clasificamos cada oportunidad
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-zinc-500">
            Cuatro etiquetas de negocio, calculadas automáticamente para cada aviso analizado.
          </p>
        </div>

        {/* Type cards */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
          {TYPES.map((t) => (
            <div
              key={t.key}
              className={[
                "rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition hover:-translate-y-[1px] hover:shadow-[0_4px_16px_-2px_rgba(0,0,0,0.08)]",
                "border-l-[5px]",
                t.color.border,
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={[
                    "inline-flex items-center rounded-md border px-2.5 py-1 text-[0.6875rem] font-semibold leading-snug tracking-wide shadow-sm",
                    t.color.badge,
                  ].join(" ")}
                >
                  {t.label}
                </span>
                <span
                  className={["mt-1.5 h-2 w-2 shrink-0 rounded-full", t.color.dot].join(" ")}
                  aria-hidden
                />
              </div>
              <p className="mt-3 text-[0.875rem] leading-relaxed text-zinc-500">{t.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
