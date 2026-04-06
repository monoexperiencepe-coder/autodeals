import type { Metadata } from "next";
import { DealFeed } from "@/components/DealFeed";
import { Hero } from "@/components/Hero";
import { getMockDeals } from "@/data/mock-cars";

export const metadata: Metadata = {
  title: "Oportunidades del día — Motordeals",
  description:
    "Lista diaria de autos con margen de reventa analizado. Ganga real, Aprovechable y Negociable. Lima, Perú.",
};

export default function DealsPage() {
  const deals = getMockDeals();

  return (
    <div className="min-h-full bg-[#f6f6f7]">
      <Hero />
      <DealFeed deals={deals} />
      <footer className="md-page-enter-d2 border-t border-zinc-200/60 bg-white/90 py-10 text-center sm:py-12">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600/80">
          Motordeals
        </p>
        <p className="mx-auto mt-3 max-w-lg px-6 text-[0.8125rem] leading-relaxed text-zinc-500 sm:px-8 sm:text-sm">
          Lista orientativa. Valor justo y reventa son estimaciones a partir de comparables en la misma
          muestra; revisa el auto y negocia en persona antes de decidir.
        </p>
      </footer>
    </div>
  );
}
