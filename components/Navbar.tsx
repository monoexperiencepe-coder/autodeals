"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/#how-it-works", label: "Cómo funciona" },
  { href: "/deals", label: "Oportunidades" },
];

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <rect x="2" y="5" width="16" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="9.25" width="16" height="1.5" rx="0.75" fill="currentColor" />
      <rect x="2" y="13.5" width="16" height="1.5" rx="0.75" fill="currentColor" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <line x1="4" y1="4" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="16" y1="4" x2="4" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    const base = href.split("#")[0] || "/";
    return pathname === base;
  };

  return (
    <nav
      className="sticky top-0 z-50 border-b border-zinc-200/60 bg-white/90 backdrop-blur-md"
      aria-label="Navegación principal"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-6">
        {/* Wordmark */}
        <Link
          href="/"
          className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600 transition hover:text-emerald-500"
        >
          Motordeals
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-1 sm:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={[
                "rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium transition",
                isActive(href)
                  ? "bg-zinc-100 text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900",
              ].join(" ")}
            >
              {label}
            </Link>
          ))}
          <div className="ml-2 h-4 w-px bg-zinc-200" aria-hidden />
          <Link
            href="/login"
            className={[
              "ml-2 rounded-xl px-4 py-1.5 text-[0.8125rem] font-medium transition",
              pathname === "/login"
                ? "bg-zinc-900 text-white"
                : "bg-zinc-900 text-white hover:bg-zinc-700",
            ].join(" ")}
          >
            Login
          </Link>
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center justify-center rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 sm:hidden"
          aria-expanded={open}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div
          className="border-t border-zinc-100 bg-white px-5 pb-4 pt-2 sm:hidden"
          onClick={() => setOpen(false)}
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={[
                  "rounded-lg px-3 py-2.5 text-[0.9375rem] font-medium transition",
                  isActive(href)
                    ? "bg-zinc-100 text-zinc-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900",
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
            <Link
              href="/login"
              className="mt-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-center text-[0.9375rem] font-medium text-white transition hover:bg-zinc-700"
            >
              Login
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
