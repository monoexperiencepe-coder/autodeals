const FEATURES = [
  {
    title: "Valor justo conservador",
    description:
      "No usamos el precio de lista como referencia. Calculamos la mediana de comparables reales ajustada al spread del mercado peruano.",
  },
  {
    title: "Margen de reventa, no solo descuento",
    description:
      "Un 10% de descuento puede seguir siendo sobreprecio. Lo que importa es cuánto puedes recuperar al vender, después de negociar la compra.",
  },
  {
    title: "Negociación modelada",
    description:
      "Simulamos el descuento típico en Lima según las señales del aviso. Así el margen que ves ya refleja lo que puedes pagar, no el precio publicado.",
  },
  {
    title: "Solo Lima, solo Perú",
    description:
      "Las referencias y multiplicadores están calibrados para el mercado local. No aplicamos tablas genéricas latinoamericanas.",
  },
  {
    title: "Sin ruido, solo oportunidades",
    description:
      "Por defecto solo mostramos Ganga real, Aprovechable y Negociable. Los sobreprecios están ocultos porque no te sirven.",
  },
] as const;

function CheckIcon() {
  return (
    <svg
      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="8" cy="8" r="7.25" stroke="currentColor" strokeWidth="1.25" opacity="0.25" />
      <path
        d="M5 8.25l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WhyMotordeals() {
  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16 lg:items-start">
          {/* Left: headline */}
          <div className="lg:sticky lg:top-24">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600">
              Por qué Motordeals
            </p>
            <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.025em] text-zinc-950 sm:text-[2.125rem]">
              Un escáner, no un portal.
            </h2>
            <p className="mt-4 text-[0.9375rem] leading-relaxed text-zinc-500">
              Los portales te muestran todo. Nosotros te decimos cuáles valen la pena y por qué, con los
              números sobre la mesa.
            </p>

            {/* Stat callout */}
            <div className="mt-8 rounded-2xl border border-zinc-200/80 bg-zinc-50 px-5 py-4">
              <p className="text-[0.75rem] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                En la última muestra
              </p>
              <p className="mt-2 text-[1.75rem] font-semibold tabular-nums tracking-tight text-zinc-950">
                &lt; 2%
              </p>
              <p className="mt-1 text-[0.875rem] text-zinc-500">
                de los avisos pasa como oportunidad real.
              </p>
            </div>
          </div>

          {/* Right: feature list */}
          <ul className="flex flex-col gap-5">
            {FEATURES.map((f) => (
              <li
                key={f.title}
                className="flex gap-3 rounded-xl border border-zinc-100 bg-zinc-50/50 px-4 py-4"
              >
                <CheckIcon />
                <div>
                  <p className="text-[0.9375rem] font-semibold text-zinc-900">{f.title}</p>
                  <p className="mt-1 text-[0.875rem] leading-relaxed text-zinc-500">{f.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
