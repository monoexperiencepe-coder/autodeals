import type { Metadata } from "next";
import { PricingSection } from "@/components/landing/PricingSection";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Planes y precios — Motordeals",
  description:
    "Elige el plan que se adapta a tu ritmo. Demo gratuita, Pro para revendedores y Elite para traders serios.",
};

export default function PricingPage() {
  return (
    <div className="min-h-full bg-zinc-950">
      {/* Page header */}
      <div className="relative overflow-hidden border-b border-zinc-800/60 bg-zinc-950 py-16 sm:py-20">
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[20rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/[0.06] blur-3xl"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-5 text-center sm:px-6">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-500">
            Motordeals
          </p>
          <h1 className="mt-4 text-[2rem] font-semibold tracking-[-0.025em] text-white sm:text-[2.5rem]">
            Planes y precios
          </h1>
          <p className="mx-auto mt-4 max-w-md text-[0.9375rem] leading-relaxed text-zinc-400">
            Desde explorar el producto gratuitamente hasta acceso completo para dealers serios.
          </p>
        </div>
      </div>

      <PricingSection variant="dark" />

      {/* FAQ teaser */}
      <section className="border-t border-zinc-800/60 bg-zinc-950 py-16 sm:py-20">
        <div className="mx-auto max-w-2xl px-5 sm:px-6">
          <p className="text-center text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-500">
            Preguntas frecuentes
          </p>
          <div className="mt-8 divide-y divide-zinc-800/80">
            {FAQ.map(({ q, a }) => (
              <div key={q} className="py-5">
                <p className="text-[0.9375rem] font-medium text-white">{q}</p>
                <p className="mt-2 text-[0.875rem] leading-relaxed text-zinc-400">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}

const FAQ = [
  {
    q: "¿El plan Demo es realmente gratuito?",
    a: "Sí. Sin tarjeta. Sin registro obligatorio. Puedes explorar el producto y ver cómo funciona el sistema de clasificación antes de comprometerte.",
  },
  {
    q: "¿Qué diferencia a Pro de Demo?",
    a: "Demo muestra una vista general con datos limitados. Pro da acceso completo a todas las oportunidades clasificadas, análisis completos y filtros avanzados.",
  },
  {
    q: "¿Para qué sirve Elite?",
    a: "Elite es para traders y pequeños dealers que usan el producto intensivamente. Incluye señales de negociación más profundas y una base preparada para funciones de equipo y alertas futuras.",
  },
  {
    q: "¿Puedo cancelar en cualquier momento?",
    a: "Sí. Sin penalizaciones ni periodos mínimos. Cancela desde tu panel cuando quieras.",
  },
  {
    q: "¿Los datos son en tiempo real?",
    a: "Los datos se actualizan periódicamente a partir del scraping del mercado. La frecuencia de actualización depende del plan.",
  },
];
