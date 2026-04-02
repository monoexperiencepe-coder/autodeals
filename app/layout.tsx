import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Preloader } from "@/components/Preloader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AutoDeals — Precio del aviso frente al mercado en Lima",
  description:
    "Compara avisos con una referencia de mercado local. Selección curada para Lima, actualizada dos veces al día.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col text-zinc-900">
        <Preloader />
        {children}
      </body>
    </html>
  );
}
