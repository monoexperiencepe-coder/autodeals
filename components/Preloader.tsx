"use client";

import { useEffect, useState } from "react";

/** Total visible duration before fade begins. */
const VISIBLE_MS = 2400;
/** Fade-out transition duration. */
const FADE_MS = 500;
/** How long each microcopy item is shown. */
const MICRO_INTERVAL_MS = 1700;
/** Cross-fade gap for microcopy swap. */
const MICRO_SWAP_MS = 200;

const MICROCOPY = ["Evaluando precios", "Comparando mercado", "Detectando oportunidades"] as const;

const ORB = 168;

export function Preloader() {
  const [phase, setPhase] = useState<"in" | "out" | "off">("in");
  const [microIdx, setMicroIdx] = useState(0);
  const [microVisible, setMicroVisible] = useState(true);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let swapTimer: ReturnType<typeof setTimeout>;
    const cycle = setInterval(() => {
      setMicroVisible(false);
      swapTimer = setTimeout(() => {
        setMicroIdx((i) => (i + 1) % MICROCOPY.length);
        setMicroVisible(true);
      }, MICRO_SWAP_MS);
    }, MICRO_INTERVAL_MS);

    const exit = setTimeout(() => setPhase("out"), VISIBLE_MS);
    const off = setTimeout(() => {
      setPhase("off");
      document.body.style.overflow = "";
    }, VISIBLE_MS + FADE_MS);

    return () => {
      clearInterval(cycle);
      clearTimeout(swapTimer);
      clearTimeout(exit);
      clearTimeout(off);
      document.body.style.overflow = "";
    };
  }, []);

  if (phase === "off") return null;

  const isOut = phase === "out";

  return (
    <div
      className={[
        "fixed inset-0 z-[100] flex flex-col items-center justify-center",
        "transition-[opacity,visibility] ease-out",
        isOut ? "pointer-events-none invisible opacity-0" : "opacity-100",
      ].join(" ")}
      style={{
        transitionDuration: `${FADE_MS}ms`,
        background:
          "radial-gradient(ellipse 80% 70% at 50% 44%, #13131c 0%, #0b0b10 55%, #07070b 100%)",
      }}
      aria-hidden={isOut}
    >
      {/* Wide ambient glow behind the orb */}
      <div
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          width: 440,
          height: 440,
          borderRadius: "50%",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -54%)",
          background:
            "radial-gradient(circle, rgba(74,222,128,0.055) 0%, transparent 68%)",
        }}
      />

      {/* ── Content block ── */}
      <div className="mdpl-fade-in relative flex flex-col items-center gap-0 select-none px-6">

        {/* Wordmark */}
        <span
          className="text-[0.6rem] font-bold uppercase"
          style={{
            letterSpacing: "0.42em",
            color: "rgba(74,222,128,0.72)",
          }}
        >
          Motordeals
        </span>

        {/* ── Radar orb ── */}
        <div
          className="relative mt-9 flex shrink-0 items-center justify-center"
          style={{ width: ORB, height: ORB }}
        >
          {/* Outer ring */}
          <div
            className="mdpl-ring-breathe absolute rounded-full border"
            style={{
              width: ORB,
              height: ORB,
              borderColor: "rgba(74,222,128,0.1)",
            }}
          />
          {/* Mid ring */}
          <div
            className="mdpl-ring-breathe absolute rounded-full border"
            style={{
              width: Math.round(ORB * 0.65),
              height: Math.round(ORB * 0.65),
              borderColor: "rgba(74,222,128,0.15)",
              animationDelay: "0.4s",
            }}
          />
          {/* Inner ring */}
          <div
            className="mdpl-ring-breathe absolute rounded-full border"
            style={{
              width: Math.round(ORB * 0.33),
              height: Math.round(ORB * 0.33),
              borderColor: "rgba(74,222,128,0.22)",
              animationDelay: "0.8s",
            }}
          />

          {/* Crosshair lines */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full overflow-hidden pointer-events-none"
            style={{
              background: [
                "linear-gradient(to right, transparent 49.6%, rgba(74,222,128,0.08) 50%, transparent 50.4%)",
                "linear-gradient(to bottom, transparent 49.6%, rgba(74,222,128,0.08) 50%, transparent 50.4%)",
              ].join(", "),
            }}
          />

          {/* Rotating sweep — conic gradient */}
          <div
            className="mdpl-spin absolute rounded-full"
            style={{
              width: ORB,
              height: ORB,
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(74,222,128,0.0) 0deg, rgba(74,222,128,0.22) 38deg, rgba(74,222,128,0.08) 65deg, transparent 85deg)",
            }}
          />

          {/* Sweep leading-edge highlight — thin bright arc */}
          <div
            className="mdpl-spin absolute rounded-full"
            style={{
              width: ORB,
              height: ORB,
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(74,222,128,0.55) 4deg, transparent 8deg)",
            }}
          />

          {/* Expanding pulse ring */}
          <div
            className="mdpl-pulse absolute rounded-full border"
            style={{
              width: Math.round(ORB * 0.54),
              height: Math.round(ORB * 0.54),
              borderColor: "rgba(74,222,128,0.38)",
            }}
          />

          {/* Center halo glow */}
          <div
            className="mdpl-halo absolute rounded-full"
            style={{
              width: 30,
              height: 30,
              background:
                "radial-gradient(circle, rgba(74,222,128,0.4) 0%, transparent 72%)",
            }}
          />

          {/* Center pip */}
          <div
            className="mdpl-pip-blink relative z-10 rounded-full"
            style={{
              width: 7,
              height: 7,
              background: "#4ade80",
            }}
          />
        </div>

        {/* ── Primary subtitle ── */}
        <p
          className="mt-8 text-[0.875rem] font-medium"
          style={{
            color: "rgba(255,255,255,0.62)",
            letterSpacing: "0.01em",
          }}
        >
          Escaneando oportunidades reales
          <span aria-hidden style={{ color: "rgba(74,222,128,0.55)" }}>
            {" "}
            ...
          </span>
        </p>

        {/* ── Cycling microcopy ── */}
        <p
          className="mt-2.5 text-[0.65rem] font-semibold uppercase"
          style={{
            letterSpacing: "0.18em",
            color: "rgba(74,222,128,0.52)",
            opacity: microVisible ? 1 : 0,
            transition: `opacity ${MICRO_SWAP_MS}ms ease`,
          }}
        >
          {MICROCOPY[microIdx]}
        </p>
      </div>
    </div>
  );
}
