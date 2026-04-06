import Link from "next/link";

type PlanFeature = string;

type Plan = {
  id: string;
  name: string;
  price: string;
  period: string | null;
  description: string;
  features: PlanFeature[];
  cta: string;
  ctaHref: string;
  recommended: boolean;
};

const PLANS: Plan[] = [
  {
    id: "demo",
    name: "Demo",
    price: "Gratis",
    period: null,
    description:
      "Explora cómo funciona Motordeals y descubre el potencial del producto.",
    features: [
      "Acceso a demo limitada",
      "Algunas oportunidades visibles",
      "Vista general del sistema",
      "Sin herramientas avanzadas",
    ],
    cta: "Empezar gratis",
    ctaHref: "/deals",
    recommended: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "USD 19",
    period: "/mes",
    description:
      "Para revendedores individuales y usuarios que quieren detectar oportunidades reales.",
    features: [
      "Acceso completo a oportunidades",
      "Etiquetas completas (Ganga, Aprovechable, Negociable)",
      "Estimaciones y análisis completos",
      "Filtros avanzados",
      "Experiencia completa del producto",
    ],
    cta: "Elegir Pro",
    ctaHref: "/login",
    recommended: true,
  },
  {
    id: "elite",
    name: "Elite",
    price: "USD 49",
    period: "/mes",
    description:
      "Para usuarios intensivos, traders serios y pequeños dealers.",
    features: [
      "Todo lo incluido en Pro",
      "Priorización de oportunidades",
      "Señales de negociación más profundas",
      "Base preparada para alertas futuras",
      "Estructura pensada para uso de equipo",
    ],
    cta: "Hablar con ventas",
    ctaHref: "/login",
    recommended: false,
  },
];

function CheckIcon({ highlighted }: { highlighted: boolean }) {
  return (
    <svg
      className={[
        "mt-0.5 h-4 w-4 shrink-0",
        highlighted ? "text-emerald-400" : "text-emerald-500/70",
      ].join(" ")}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <path
        d="M3.5 8.25l2.75 2.75 6-6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type PricingSectionProps = {
  /** When true the section renders with a light bg (landing teaser use). */
  variant?: "light" | "dark";
};

export function PricingSection({ variant = "dark" }: PricingSectionProps) {
  const isDark = variant === "dark";

  return (
    <section
      id="pricing"
      className={[
        "relative overflow-hidden py-20 sm:py-28",
        isDark ? "bg-zinc-950" : "bg-zinc-50",
      ].join(" ")}
    >
      {/* Ambient glow */}
      {isDark && (
        <>
          <div
            className="pointer-events-none absolute -right-48 top-0 h-[36rem] w-[36rem] rounded-full bg-emerald-500/[0.05] blur-3xl"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute -left-48 bottom-0 h-[30rem] w-[30rem] rounded-full bg-emerald-500/[0.04] blur-3xl"
            aria-hidden
          />
        </>
      )}

      <div className="relative mx-auto max-w-5xl px-5 sm:px-6">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-500">
            Planes
          </p>
          <h2
            className={[
              "mt-3 text-[1.75rem] font-semibold tracking-[-0.025em] sm:text-[2.125rem]",
              isDark ? "text-white" : "text-zinc-950",
            ].join(" ")}
          >
            Simple, directo, sin sorpresas.
          </h2>
          <p
            className={[
              "mt-4 text-[0.9375rem] leading-relaxed",
              isDark ? "text-zinc-400" : "text-zinc-500",
            ].join(" ")}
          >
            Elige el plan que se adapta a cómo usas el mercado.
          </p>
        </div>

        {/* Plan cards */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-4 lg:gap-6">
          {PLANS.map((plan) => {
            const isRec = plan.recommended;
            return (
              <div
                key={plan.id}
                className={[
                  "relative flex flex-col rounded-2xl border p-6 transition",
                  isRec
                    ? "border-emerald-500/40 bg-zinc-900 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_8px_40px_-4px_rgba(16,185,129,0.12)] lg:scale-[1.025]"
                    : isDark
                      ? "border-zinc-800 bg-zinc-900/50"
                      : "border-zinc-200/80 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]",
                ].join(" ")}
              >
                {/* Recommended badge */}
                {isRec && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-400">
                      Recomendado
                    </span>
                  </div>
                )}

                {/* Plan name */}
                <p
                  className={[
                    "text-[0.75rem] font-bold uppercase tracking-[0.18em]",
                    isRec ? "text-emerald-400" : isDark ? "text-zinc-400" : "text-zinc-500",
                  ].join(" ")}
                >
                  {plan.name}
                </p>

                {/* Price */}
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className={[
                      "text-[2rem] font-semibold tracking-tight tabular-nums leading-none",
                      isDark || isRec ? "text-white" : "text-zinc-950",
                    ].join(" ")}
                  >
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span
                      className={[
                        "text-[0.875rem]",
                        isRec ? "text-zinc-400" : isDark ? "text-zinc-500" : "text-zinc-400",
                      ].join(" ")}
                    >
                      {plan.period}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p
                  className={[
                    "mt-3 text-[0.8125rem] leading-relaxed",
                    isRec ? "text-zinc-300" : isDark ? "text-zinc-400" : "text-zinc-500",
                  ].join(" ")}
                >
                  {plan.description}
                </p>

                {/* Divider */}
                <div
                  className={[
                    "my-5 h-px",
                    isRec ? "bg-zinc-700/80" : isDark ? "bg-zinc-800" : "bg-zinc-100",
                  ].join(" ")}
                />

                {/* Features */}
                <ul className="flex flex-col gap-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckIcon highlighted={isRec} />
                      <span
                        className={[
                          "text-[0.8125rem] leading-snug",
                          isRec ? "text-zinc-200" : isDark ? "text-zinc-400" : "text-zinc-600",
                        ].join(" ")}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-auto pt-6">
                  <Link
                    href={plan.ctaHref}
                    className={[
                      "block w-full rounded-xl py-2.5 text-center text-[0.875rem] font-semibold transition-all",
                      isRec
                        ? "bg-emerald-500 text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_4px_16px_rgba(16,185,129,0.2)] hover:bg-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_6px_24px_rgba(16,185,129,0.28)]"
                        : isDark
                          ? "border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white"
                          : "border border-zinc-200 bg-zinc-50 text-zinc-700 hover:border-zinc-300 hover:bg-white hover:text-zinc-950",
                    ].join(" ")}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <p
          className={[
            "mt-10 text-center text-[0.75rem]",
            isDark ? "text-zinc-600" : "text-zinc-400",
          ].join(" ")}
        >
          Sin compromisos. Cancela cuando quieras. Los precios están en USD.
        </p>
      </div>
    </section>
  );
}
