import { getMockDeals } from "@/data/mock-cars";
import { DealCard } from "@/components/DealCard";

export function ExampleDeals() {
  const deals = getMockDeals();

  // Pick the two highest-scored ganga_real deals as showcase examples
  const examples = deals
    .filter((d) => d.businessDisplayLabel === "ganga_real")
    .slice(0, 2);

  // Fall back to aprovechable if there are no ganga_real deals
  const showcaseDeals =
    examples.length > 0
      ? examples
      : deals.filter((d) => d.businessDisplayLabel === "aprovechable").slice(0, 2);

  if (showcaseDeals.length === 0) return null;

  return (
    <section className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-3xl px-5 sm:px-6">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600">
            Ejemplo real
          </p>
          <h2 className="mt-3 text-[1.75rem] font-semibold tracking-[-0.025em] text-zinc-950 sm:text-[2.125rem]">
            Así se ve una oportunidad Motordeals
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-zinc-500">
            Autos reales de la muestra analizada, clasificados con nuestra capa de negocio.
          </p>
        </div>

        {/* Deal cards */}
        <ul className="mt-12 flex flex-col gap-5 sm:gap-6">
          {showcaseDeals.map((deal) => (
            <li key={deal.id}>
              <DealCard deal={deal} />
            </li>
          ))}
        </ul>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-[0.75rem] leading-relaxed text-zinc-400">
          Tarjetas reales de la última muestra analizada. Los datos cambian con cada actualización del mercado.
        </p>
      </div>
    </section>
  );
}
