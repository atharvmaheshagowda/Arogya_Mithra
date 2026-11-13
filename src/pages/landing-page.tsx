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
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
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
