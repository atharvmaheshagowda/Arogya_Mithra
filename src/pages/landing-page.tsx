import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { useLenis } from "@/components/smooth-scroll-provider";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const { scrollTo } = useLenis();

  const scrollToTop = () => {
    if (scrollTo) {
      scrollTo(0);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Scroll to top visibility tracker
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 450);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Framer Motion Scroll Progress & Parallax Transforms
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001,
  });

  // Background Parallax: Gently drifts vertically across the scroll duration
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "-14%"]);
  const backgroundScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  const sectionReveal = {
    initial: { opacity: 0, y: 36 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.12 },
    transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen bg-transparent text-foreground antialiased selection:bg-accent/20 selection:text-accent overflow-x-clip"
    >
      {/* 1. Global Reading Scroll Progress Indicator Line */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] z-[60] bg-gradient-to-r from-[#00A889] via-[#20C997] to-[#102B3F] origin-left shadow-xs"
        style={{ scaleX }}
      />

      {/* 2. Fixed Cinematic Parallax Clinical Sanctuary Background Image */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        <motion.div
          style={{ y: backgroundY, scale: backgroundScale }}
          className="relative w-full h-[125vh] -top-[12vh]"
        >
          {/* Authentic High-Resolution Hospital Architecture Sanctuary */}
          <img
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2600&q=85"
            alt="Aarogya Mithra Modern Clinical Sanctuary"
            className="size-full object-cover object-center filter brightness-[1.02] contrast-[1.02] dark:brightness-[0.72] dark:contrast-[1.08]"
            loading="eager"
          />

          {/* Luxury Adaptive Overlays: Warm Porcelain in light mode, Deep Atlantic in dark mode */}
          <div className="absolute inset-0 bg-[#F5F5EF]/80 dark:bg-[#102B3F]/75 backdrop-blur-[0.5px] transition-colors duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background/90" />
          <div className="absolute inset-0 surface-dots opacity-20 dark:opacity-10" />
        </motion.div>
      </div>

      {/* 3. Floating Navigation Pill */}
      <LandingNavbar />

      {/* 4. Main Scroll Sections with Viewport Triggers */}
      <main className="relative z-10">
        {/* Hero Section with 3D Preview Elevation */}
        <LandingHero />

        {/* Section 2: Trust & OPD Reality */}
        <motion.div {...sectionReveal}>
          <TrustMetricsSection />
        </motion.div>

        {/* Section 3: Four Core Capabilities (LISTEN, READ, CONNECT, SAFEGUARD) */}
        <motion.div {...sectionReveal}>
          <CoreCapabilitiesSection />
        </motion.div>

        {/* Section 4: Interactive Workflow Blueprint */}
        <motion.div {...sectionReveal}>
          <InteractiveWorkflowSection />
        </motion.div>

        {/* Section 5: Patient Context Engine Deep Dive */}
        <motion.div {...sectionReveal}>
          <ContextEngineSection />
        </motion.div>

        {/* Section 6: Clinical Safety & Human Oversight */}
        <motion.div {...sectionReveal}>
          <ClinicalSafetySection />
        </motion.div>

        {/* Section 7: FAQ Accordion */}
        <motion.div {...sectionReveal}>
          <FaqSection />
        </motion.div>

        {/* Section 8: Final Call to Action */}
        <motion.div {...sectionReveal}>
          <CtaSection />
        </motion.div>
      </main>

      {/* 5. Footer with Medical Disclaimer & Standards */}
      <LandingFooter />

      {/* 6. Floating Back to Top Button */}
      {showScrollTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Scroll back to top"
          className="fixed bottom-6 right-6 z-40 grid size-10 place-items-center rounded-full border border-border/80 bg-card/90 text-foreground shadow-lg backdrop-blur-md hover:border-accent hover:text-accent transition-all duration-300 animate-in fade-in zoom-in-90"
        >
          <ArrowUp className="size-4" />
        </button>
      )}
    </div>
  );
}
export default LandingPage;
