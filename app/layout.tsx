import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Preloader } from "@/components/Preloader";
import { Navbar } from "@/components/Navbar";
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
  title: "Motordeals — Encuentra oportunidades reales en el mercado automotriz | Lima, Perú",
  description:
    "Encuentra oportunidades reales en el mercado automotriz. Valor justo conservador, reventa estimada y puntuación de oportunidad para autos usados en Perú. Lista orientativa para Lima.",
  applicationName: "Motordeals",
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
        <Navbar />
        {children}
      </body>
    </html>
  );
}
