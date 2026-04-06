import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-24 sm:py-32 lg:py-40">
      {/* Ambient glow orbs — matches preloader palette */}
      <div
        className="pointer-events-none absolute -right-48 -top-48 h-[42rem] w-[42rem] rounded-full bg-emerald-500/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-48 -left-48 h-[36rem] w-[36rem] rounded-full bg-emerald-500/[0.05] blur-3xl"
        aria-hidden
      />

      {/* Subtle dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
        aria-hidden
      />

      {/* Bottom fade to next section */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-zinc-950 to-transparent"
        aria-hidden
      />

      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-6">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/[0.08] px-4 py-1.5 text-[0.75rem] font-medium tracking-wide text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
          Escáner de oportunidades automotrices · Lima, Perú
        </div>

        {/* Headline */}
        <h1 className="mt-7 text-balance text-[2.25rem] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[3rem] sm:leading-[1.08] lg:text-[3.75rem]">
          Encuentra autos que realmente son{" "}
          <span className="text-emerald-400">oportunidad</span>
        </h1>

        {/* Subheadline */}
        <p className="mx-auto mt-6 max-w-xl text-[1rem] leading-relaxed text-zinc-400 sm:text-[1.0625rem]">
          Analizamos el mercado por ti. Detectamos gangas reales.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/deals"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-8 py-3.5 text-[0.9375rem] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_4px_16px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_6px_24px_rgba(16,185,129,0.3)] sm:w-auto"
          >
            Ver oportunidades
          </Link>
          <Link
            href="/deals"
            className="inline-flex w-full items-center justify-center rounded-2xl border border-zinc-700 bg-transparent px-8 py-3.5 text-[0.9375rem] font-semibold text-zinc-300 transition hover:border-zinc-500 hover:text-white sm:w-auto"
          >
            Probar demo
          </Link>
        </div>

        {/* Trust note */}
        <p className="mt-8 text-[0.75rem] text-zinc-600">
          Sin registro. Sin costo. Datos reales del mercado.
        </p>
      </div>
    </section>
  );
}
