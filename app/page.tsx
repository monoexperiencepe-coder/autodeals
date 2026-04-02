import { DealCard } from "@/components/DealCard";
import { Hero } from "@/components/Hero";
import { getMockDeals } from "@/data/mock-cars";

export default function Home() {
  const deals = getMockDeals();

  return (
    <div className="min-h-full bg-[#f6f6f7]">
      <Hero />
      <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 flex flex-col gap-3 border-b border-zinc-200/60 pb-8 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:pb-10">
          <div className="space-y-1.5">
            <h2 className="text-[1.375rem] font-semibold tracking-[-0.02em] text-zinc-950 sm:text-2xl">
              Selección de hoy
            </h2>
            <p className="max-w-md text-[0.9375rem] leading-relaxed text-zinc-600">
              Primero los que más se distancian de la referencia de mercado en Lima.
            </p>
          </div>
          <p className="text-[0.8125rem] font-medium tabular-nums text-zinc-500 sm:pb-0.5">
            {deals.length} en lista
          </p>
        </div>
        <ul className="flex flex-col gap-5 sm:gap-6">
          {deals.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>
      </main>
      <footer className="border-t border-zinc-200/60 bg-white/90 py-10 text-center sm:py-12">
        <p className="mx-auto max-w-lg px-6 text-[0.8125rem] leading-relaxed text-zinc-500 sm:px-8 sm:text-sm">
          Lista orientativa, actualizada dos veces al día. La referencia de mercado es estimada:
          revisa el auto y cierra solo cuando lo veas en persona.
        </p>
      </footer>
    </div>
  );
}
