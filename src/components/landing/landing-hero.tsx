import { useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ProductPreviewDashboard } from "./product-preview-dashboard";

export function LandingHero() {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const previewRotateX = useTransform(heroProgress, [0, 0.55], [14, 0]);
  const previewScale = useTransform(heroProgress, [0, 0.55], [0.93, 1]);
  const previewY = useTransform(heroProgress, [0, 0.55], [0, -35]);

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.querySelector("#capabilities");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  const fadeInUp = {
    initial: shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24 lg:pt-40 lg:pb-28"
    >
      {/* Background warm radial gradients & subtle clinical dot canvas */}
      <div className="pointer-events-none absolute inset-0 surface-dots opacity-40 dark:opacity-20" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-accent/10 blur-[140px] dark:bg-accent/15" />
      <div className="pointer-events-none absolute top-1/3 -left-32 size-[400px] rounded-full bg-amber-500/5 blur-[120px]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Editorial Heading Stack */}
        <motion.div
          className="mx-auto max-w-4xl text-center space-y-6"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.12 }}
        >
          {/* Refined Pill Announcement Badge */}
          <motion.div variants={fadeInUp} className="inline-flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground backdrop-blur-md shadow-xs hover:border-accent/40 transition-colors">
              <span className="flex size-2 rounded-full bg-accent animate-pulse" />
              <span className="tracking-wide uppercase">Evidence-Grounded Multilingual Clinical AI</span>
              <span className="text-muted-foreground/60">•</span>
              <span className="text-accent font-medium">OPD Copilot</span>
            </div>
          </motion.div>

          {/* Majestic Newsreader Headline */}
          <motion.h1 variants={fadeInUp} className="text-display-hero text-foreground tracking-[-0.04em]">
            Your Clinical Workflow.
            <br />
            <span className="text-teal-600 dark:text-teal-400 font-serif italic font-normal">
              Reimagined with
            </span>
            <br />
            <span className="text-teal-600 dark:text-teal-400 font-serif italic font-normal">
              Intelligence.
            </span>
          </motion.h1>

          {/* Subtitle with High Readability */}
          <motion.p
            variants={fadeInUp}
            className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground font-normal"
          >
            An evidence-grounded multilingual copilot for high-volume Indian OPDs. It listens to consultations, reads medical reports, connects patient history and safeguards medication decisions — keeping doctors in complete control.
          </motion.p>

          {/* Action CTAs */}
          <motion.div variants={fadeInUp} className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              variant="teal"
              size="lg"
              onClick={() => navigate("/app")}
              rightIcon={<ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />}
              className="group rounded-full px-7 py-3 text-sm font-semibold shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 transition-all"
            >
              Open Workspace
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleExploreClick}
              rightIcon={<ChevronRight className="size-4" />}
              className="rounded-full px-7 py-3 text-sm font-semibold border-border/90 bg-card hover:bg-muted/80 transition-all"
            >
              Explore Capabilities
            </Button>
          </motion.div>

          {/* Clinical Assurance Strip */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4 text-xs text-muted-foreground font-medium"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-accent shrink-0" />
              Doctor-in-the-loop sign-off
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-accent shrink-0" />
              Kannada, Hindi & English speech
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-accent shrink-0" />
              ABDM-ready structured health records
            </span>
          </motion.div>
        </motion.div>

        {/* Product Interface Preview Mockup with 3D Perspective Scroll Elevation */}
        <motion.div
          className="mt-12 sm:mt-16 lg:mt-20 [perspective:1400px]"
          style={
            shouldReduceMotion
              ? {}
              : {
                  rotateX: previewRotateX,
                  scale: previewScale,
                  y: previewY,
                }
          }
          initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="relative rounded-3xl sm:rounded-4xl p-2 sm:p-3 bg-gradient-to-b from-border/70 via-border/30 to-transparent shadow-2xl transition-shadow duration-500 hover:shadow-teal/20">
            <ProductPreviewDashboard />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
