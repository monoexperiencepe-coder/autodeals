import { EmailCapture } from "@/components/EmailCapture";

export function Hero() {
  return (
    <header className="relative overflow-hidden border-b border-zinc-200/60 bg-gradient-to-b from-white via-zinc-50/40 to-[#f6f6f7]">
      <div
        className="pointer-events-none absolute -right-20 -top-28 h-[28rem] w-[28rem] rounded-full bg-emerald-400/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-36 -left-20 h-[22rem] w-[22rem] rounded-full bg-sky-400/[0.06] blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-2xl px-5 pb-20 pt-16 text-center sm:px-6 sm:pb-24 sm:pt-20">
        <p className="text-[0.8125rem] font-semibold tracking-[0.12em] text-zinc-500">
          GangaDeals
        </p>
        <p className="mt-4 inline-flex items-center rounded-full border border-emerald-200/70 bg-emerald-50/90 px-3.5 py-1 text-[0.6875rem] font-semibold tracking-wide text-emerald-900/90 shadow-sm shadow-emerald-900/5">
          Lima, Perú
        </p>
        <h1 className="mt-7 text-balance text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.025em] text-zinc-950 sm:mt-8 sm:text-[2.125rem] sm:leading-[1.18] md:text-[2.5rem]">
          Gangas con margen de reventa en mente, no solo “barato en el aviso”
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[0.9375rem] leading-[1.65] text-zinc-600 sm:mt-6 sm:text-base sm:leading-relaxed">
          Valor justo conservador, reventa típica estimada y una nota que premia comprar por debajo de ese
          valor y con salida razonable en Perú.
        </p>
        <EmailCapture />
        <p className="mt-5 text-[0.8125rem] leading-snug text-zinc-500 sm:mt-6">
          Un correo de vez en cuando, solo cuando haya algo que valga la pena. Nada de ruido.
        </p>
      </div>
    </header>
  );
}
