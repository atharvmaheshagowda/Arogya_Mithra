import { LandingNavbar } from "@/components/landing/landing-navbar";
import { LandingHero } from "@/components/landing/landing-hero";
import { TrustMetricsSection } from "@/components/landing/trust-metrics-section";
import { CoreCapabilitiesSection } from "@/components/landing/core-capabilities-section";
import { InteractiveWorkflowSection } from "@/components/landing/interactive-workflow-section";
import { ContextEngineSection } from "@/components/landing/context-engine-section";
import { ClinicalSafetySection } from "@/components/landing/clinical-safety-section";
import { FaqSection } from "@/components/landing/faq-section";
import { CtaSection } from "@/components/landing/cta-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export function LandingPage() {
  return (
    <div className="relative min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
      {/* Cinematic Clinical Architecture Atmospheric Background */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1050px] overflow-hidden -z-10">
        <img
          src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2400&q=85"
          alt=""
          aria-hidden="true"
          className="size-full object-cover object-top opacity-35 dark:opacity-15 filter brightness-105 contrast-95 dark:brightness-75"
        />
        {/* Gradients to blend smoothly with Porcelain (#F5F5EF) / Deep Atlantic (#102B3F) */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 via-55% to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-transparent via-background/40 to-background" />
      </div>

      {/* 1. Navigation */}
      <LandingNavbar />

      {/* 2. Hero & Product Preview */}
      <main>
        <LandingHero />

        {/* 3. Trust & OPD Reality */}
        <TrustMetricsSection />

        {/* 4. Four Core Capabilities (LISTEN, READ, CONNECT, SAFEGUARD) */}
        <CoreCapabilitiesSection />

        {/* 6. How It Works: Interactive Workflow Blueprint */}
        <InteractiveWorkflowSection />

        {/* 7. Patient Context Engine Deep Dive */}
        <ContextEngineSection />

        {/* 8. Clinical Safety Architecture & Human Oversight */}
        <ClinicalSafetySection />

        {/* 9. FAQ Accordion */}
        <FaqSection />

        {/* 10. Final CTA */}
        <CtaSection />
      </main>

      {/* 11. Footer with Legal & Medical Disclaimer */}
      <LandingFooter />
    </div>
  );
}

