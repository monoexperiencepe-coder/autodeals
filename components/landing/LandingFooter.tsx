import Link from "next/link";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/#how-it-works", label: "Cómo funciona" },
  { href: "/deals", label: "Oportunidades" },
  { href: "/login", label: "Login" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-zinc-800/60 bg-zinc-950 py-12 sm:py-14">
      <div className="mx-auto max-w-5xl px-5 sm:px-6">
        <div className="flex flex-col items-center gap-6 text-center sm:gap-8">
          {/* Wordmark */}
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-500">
            Motordeals
          </p>

          {/* Nav links */}
          <nav aria-label="Footer">
            <ul className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {LINKS.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="text-[0.8125rem] text-zinc-500 transition hover:text-zinc-300"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Disclaimer */}
          <p className="max-w-lg text-[0.75rem] leading-relaxed text-zinc-600">
            Lista orientativa. Valor justo y reventa son estimaciones calculadas a partir de comparables en la
            muestra analizada. Revisa el auto y negocia en persona antes de decidir.
          </p>

          <p className="text-[0.6875rem] text-zinc-700">
            © {new Date().getFullYear()} Motordeals · Lima, Perú
          </p>
        </div>
      </div>
    </footer>
  );
}
