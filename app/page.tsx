import { DealFeed } from "@/components/DealFeed";
import { Hero } from "@/components/Hero";
import { getMockDeals } from "@/data/mock-cars";

export default function Home() {
  const deals = getMockDeals();

  return (
    <div className="min-h-full bg-[#f6f6f7]">
      <Hero />
      <DealFeed deals={deals} />
      <footer className="border-t border-zinc-200/60 bg-white/90 py-10 text-center sm:py-12">
        <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-zinc-400">GangaDeals</p>
        <p className="mx-auto mt-3 max-w-lg px-6 text-[0.8125rem] leading-relaxed text-zinc-500 sm:px-8 sm:text-sm">
          Lista orientativa. Valor justo y reventa son estimaciones a partir de comparables en la misma muestra;
          revisa el auto y negocia en persona antes de decidir.
        </p>
      </footer>
    </div>
  );
}
