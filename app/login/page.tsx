import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Login — Motordeals",
  description: "Accede a tu cuenta Motordeals.",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-[#f6f6f7] px-5 py-16 sm:px-6">
      <div className="w-full max-w-sm">
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

        <LoginForm />

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
