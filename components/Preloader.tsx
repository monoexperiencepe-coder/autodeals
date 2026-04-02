"use client";

import { useEffect, useState } from "react";

/** Visible hold before fade; total UX ≈ VISIBLE_MS + FADE_MS (~1.35s) */
const VISIBLE_MS = 950;
const FADE_MS = 420;

export function Preloader() {
  const [phase, setPhase] = useState<"in" | "out" | "off">("in");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const exit = window.setTimeout(() => setPhase("out"), VISIBLE_MS);
    const remove = window.setTimeout(() => {
      setPhase("off");
      document.body.style.overflow = "";
    }, VISIBLE_MS + FADE_MS);
    return () => {
      window.clearTimeout(exit);
      window.clearTimeout(remove);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "off") return null;

  return (
    <div
      className={[
        "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#f6f6f7]",
        "transition-[opacity,visibility] ease-out",
        phase === "out" ? "pointer-events-none invisible opacity-0" : "opacity-100",
      ].join(" ")}
      style={{ transitionDuration: `${FADE_MS}ms` }}
      aria-hidden={phase === "out"}
    >
      <div className="flex flex-col items-center px-6">
        <p className="text-[0.8125rem] font-semibold tracking-[0.14em] text-zinc-500">
          AutoDeals
        </p>
        <p className="mt-6 text-[0.9375rem] font-medium tracking-[-0.01em] text-zinc-600">
          Analizando oportunidades...
        </p>
        <div
          className="mt-8 h-[2px] w-[min(11rem,72vw)] overflow-hidden rounded-full bg-zinc-200/90"
          role="presentation"
        >
          <div className="preloader-scan-line h-full w-full rounded-full bg-gradient-to-r from-transparent via-emerald-500/75 to-transparent" />
        </div>
      </div>
    </div>
  );
}
