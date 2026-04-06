import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-zinc-950 py-20 sm:py-28">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.08] blur-3xl"
        aria-hidden
      />

      <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-6">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-500">
          Empieza ahora
        </p>
        <h2 className="mt-4 text-balance text-[1.875rem] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-[2.5rem]">
          Empieza a encontrar oportunidades reales
        </h2>
        <p className="mx-auto mt-5 max-w-md text-[0.9375rem] leading-relaxed text-zinc-400">
          Sin registro. Sin costo. Solo los autos del mercado que realmente tienen margen.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/deals"
            className="inline-flex w-full items-center justify-center rounded-2xl bg-emerald-500 px-10 py-4 text-[1rem] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_4px_20px_rgba(16,185,129,0.25)] transition hover:bg-emerald-400 hover:shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_8px_28px_rgba(16,185,129,0.3)] sm:w-auto"
          >
            Ver oportunidades de hoy
          </Link>
        </div>

        <p className="mt-6 text-[0.75rem] text-zinc-600">
          Datos reales · Lima, Perú · Lista actualizada periódicamente
        </p>
      </div>
    </section>
  );
}
