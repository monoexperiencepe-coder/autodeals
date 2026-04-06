const STEPS = [
  {
    number: "01",
    title: "Escaneamos el mercado",
    description:
      "Recopilamos avisos de portales peruanos y los normalizamos: precio, año, kilometraje, versión y señales de negociación.",
  },
  {
    number: "02",
    title: "Calculamos valor real",
    description:
      "Comparamos cada auto con sus pares en la misma muestra. El valor justo es conservador: usamos la mediana de comparables ajustada al mercado peruano.",
  },
  {
    number: "03",
    title: "Detectamos oportunidades",
    description:
      "Calculamos margen de reventa, descuento de negociación y confianza estadística. Solo los autos con margen real y salida razonable quedan como oportunidad.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-zinc-50 py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600">
            Cómo funciona
          </p>
          <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.025em] text-zinc-950 sm:text-[2.125rem]">
            Tres pasos. Sin adivinar.
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-zinc-500">
            Metodología reproducible, no una lista curada a ojo.
          </p>
        </div>

        {/* Steps */}
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6 lg:gap-10">
          {STEPS.map((step, i) => (
            <div key={step.number} className="relative flex flex-col gap-4">
              {/* Connector line (desktop) */}
              {i < STEPS.length - 1 && (
                <div
                  className="absolute left-full top-5 hidden h-px w-full -translate-y-0.5 bg-gradient-to-r from-zinc-200 to-transparent sm:block"
                  aria-hidden
                />
              )}

              {/* Number circle */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-emerald-200/70 bg-white text-[0.75rem] font-bold tabular-nums text-emerald-600 shadow-sm">
                {step.number}
              </div>

              {/* Content */}
              <div>
                <h3 className="text-[1rem] font-semibold tracking-tight text-zinc-950">
                  {step.title}
                </h3>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-zinc-500">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
