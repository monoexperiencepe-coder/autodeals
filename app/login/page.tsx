import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Login — Motordeals",
  description: "Accede a tu cuenta Motordeals.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f6f6f7] px-5 py-16 sm:px-6">
      {/* Card */}
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="text-[0.68rem] font-bold uppercase tracking-[0.3em] text-emerald-600 transition hover:text-emerald-500"
          >
            Motordeals
          </Link>
          <h1 className="mt-4 text-[1.5rem] font-semibold tracking-[-0.02em] text-zinc-950">
            Bienvenido de vuelta
          </h1>
          <p className="mt-2 text-[0.875rem] text-zinc-500">
            Inicia sesión para acceder a tu panel
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-7 shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_24px_-4px_rgba(0,0,0,0.07)]">
          <form
            onSubmit={(e) => e.preventDefault()}
            className="flex flex-col gap-4"
          >
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-[0.8125rem] font-medium text-zinc-700"
              >
                Correo electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="tu@correo.com"
                className="h-11 rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-3.5 text-[0.9375rem] text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-[0.8125rem] font-medium text-zinc-700"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-[0.75rem] text-zinc-400 transition hover:text-zinc-600"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="h-11 rounded-xl border border-zinc-200/90 bg-zinc-50/50 px-3.5 text-[0.9375rem] text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.03)] outline-none transition placeholder:text-zinc-400 hover:border-zinc-300 focus:border-zinc-400 focus:bg-white focus:shadow-[0_0_0_3px_rgba(24,24,27,0.06)]"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 h-11 w-full rounded-xl bg-zinc-900 text-[0.9375rem] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),0_4px_14px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-[1px] hover:bg-zinc-800 hover:shadow-[0_2px_4px_rgba(0,0,0,0.07),0_8px_20px_rgba(0,0,0,0.12)] active:translate-y-0"
            >
              Iniciar sesión
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-100" />
            <span className="text-[0.6875rem] text-zinc-400">o</span>
            <div className="h-px flex-1 bg-zinc-100" />
          </div>

          {/* Demo shortcut */}
          <Link
            href="/deals"
            className="flex h-11 w-full items-center justify-center rounded-xl border border-zinc-200/90 bg-zinc-50/60 text-[0.875rem] font-medium text-zinc-600 transition hover:border-zinc-300 hover:bg-white hover:text-zinc-900"
          >
            Ver demo sin cuenta
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-[0.75rem] text-zinc-400">
          ¿No tienes cuenta?{" "}
          <button
            type="button"
            className="font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition hover:text-zinc-900"
          >
            Únete a la lista de espera
          </button>
        </p>
      </div>
    </div>
  );
}
