"use client";

import { FormEvent, useState } from "react";

export function EmailCapture() {
  const [email, setEmail] = useState("");

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("Correo registrado:", email.trim() || "(vacío)");
    setEmail("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto mt-11 flex w-full max-w-[26rem] flex-col gap-3 sm:mt-12 sm:flex-row sm:items-stretch sm:gap-2.5"
    >
      <label htmlFor="email" className="sr-only">
        Tu correo
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="Déjanos tu correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 min-h-12 flex-1 rounded-2xl border border-zinc-200/90 bg-white px-4 text-[0.9375rem] text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-300/90 focus:border-zinc-300 focus:shadow-[0_1px_2px_rgba(0,0,0,0.04),0_0_0_3px_rgba(24,24,27,0.06)] sm:px-5"
      />
      <button
        type="submit"
        className="h-12 min-h-12 shrink-0 rounded-2xl bg-zinc-900 px-7 text-[0.9375rem] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_14px_rgba(0,0,0,0.1)] transition-all hover:bg-zinc-800 hover:-translate-y-[1px] hover:shadow-[0_2px_4px_rgba(0,0,0,0.07),0_8px_20px_rgba(0,0,0,0.12)] active:translate-y-0 active:shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
      >
        Recibir alertas
      </button>
    </form>
  );
}
