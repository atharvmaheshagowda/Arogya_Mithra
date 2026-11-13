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

  // Inertia-smoothed parallax scroll driver with natural spring damping
  const smoothParallax = useSpring(scrollYProgress, {
    stiffness: 75,
    damping: 24,
    mass: 0.25,
    restDelta: 0.0005,
  });

  // Layer 1 (Deep Hospital Architecture Sanctuary): Continuous fluid vertical parallax drift
  const backgroundY = useTransform(smoothParallax, [0, 0.35, 0.7, 1], ["0%", "-18%", "-36%", "-52%"]);
  const backgroundScale = useTransform(smoothParallax, [0, 0.5, 1], [1.06, 1.16, 1.28]);

  // Layer 2 (Atmospheric Jade & Cyan Glow Aurora): Moves at an independent higher parallax velocity
  const auraY = useTransform(smoothParallax, [0, 1], ["0%", "-75%"]);
  const auraScale = useTransform(smoothParallax, [0, 0.5, 1], [1, 1.25, 1.5]);
  const auraOpacity = useTransform(smoothParallax, [0, 0.4, 0.8, 1], [0.35, 0.5, 0.3, 0.15]);

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

      {/* 2. Fixed Cinematic Multi-Layer Parallax Background Canvas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
        {/* Layer 1: Photorealistic Hospital Architecture Sanctuary */}
        <motion.div
          style={{ y: backgroundY, scale: backgroundScale }}
          className="relative w-full h-[180vh] -top-[25vh] will-change-transform"
        >
          {/* Authentic High-Resolution Hospital Architecture Sanctuary */}
          <img
            src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=2600&q=85"
            alt="Aarogya Mithra Modern Clinical Sanctuary"
            className="size-full object-cover object-center filter brightness-[1.02] contrast-[1.02] dark:brightness-[0.74] dark:contrast-[1.08]"
            loading="eager"
          />

          {/* Luxury Adaptive Overlays: Warm Porcelain in light mode, Deep Atlantic in dark mode */}
          <div className="absolute inset-0 bg-[#F5F5EF]/80 dark:bg-[#102B3F]/75 backdrop-blur-[0.5px] transition-colors duration-500" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/25 to-background/95" />
          <div className="absolute inset-0 surface-dots opacity-20 dark:opacity-10" />
        </motion.div>

        {/* Layer 2: Secondary Floating Atmospheric Aurora Depth Plane */}
        <motion.div
          style={{ y: auraY, scale: auraScale, opacity: auraOpacity }}
          className="absolute inset-0 will-change-transform"
        >
          <div className="absolute -top-32 left-1/4 size-[600px] rounded-full bg-accent/15 blur-[160px] dark:bg-accent/25" />
          <div className="absolute top-1/2 -right-24 size-[550px] rounded-full bg-teal-500/10 blur-[180px] dark:bg-teal-400/20" />
          <div className="absolute top-3/4 left-1/3 size-[500px] rounded-full bg-[#102B3F]/20 blur-[150px] dark:bg-accent/10" />
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
