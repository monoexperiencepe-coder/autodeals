import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { ExampleDeals } from "@/components/landing/ExampleDeals";
import { OpportunityTypes } from "@/components/landing/OpportunityTypes";
import { WhyMotordeals } from "@/components/landing/WhyMotordeals";
import { PricingSection } from "@/components/landing/PricingSection";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { LandingFooter } from "@/components/landing/LandingFooter";

export const metadata: Metadata = {
  title: "Motordeals — Encuentra autos que realmente son oportunidad | Lima, Perú",
  description:
    "Escáner inteligente de oportunidades automotrices. Detectamos gangas reales con margen de reventa calculado. Lima, Perú.",
};

export default function LandingPage() {
  return (
    <div className="min-h-full bg-zinc-950">
      <HeroSection />
      <HowItWorks />
      <ExampleDeals />
      <OpportunityTypes />
      <WhyMotordeals />
      <PricingSection variant="dark" />
      <FinalCTA />
      <LandingFooter />
    </div>
  );
}
