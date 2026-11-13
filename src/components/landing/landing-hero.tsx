import { useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle2, ChevronRight, Mic, ShieldAlert, Sparkles, Stethoscope } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductPreviewDashboard } from "./product-preview-dashboard";

export function LandingHero() {
  const navigate = useNavigate();

  const handleExploreClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.querySelector("#capabilities");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section id="hero" className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
      {/* Background radial gradients & subtle clinical dot canvas */}
      <div className="pointer-events-none absolute inset-0 surface-dots opacity-35 dark:opacity-20" />
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-[650px] rounded-full bg-accent/10 blur-[130px] dark:bg-accent/15" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Editorial Heading Stack */}
        <div className="mx-auto max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center gap-2">
            <Badge variant="teal" size="md" dot pulse>
              EVIDENCE-GROUNDED CLINICAL AI • HIGH-VOLUME OPDS
            </Badge>
          </div>

          <h1 className="text-display-hero text-foreground">
            Your Clinical Workflow.
            <br />
            <span className="text-teal-600 dark:text-teal-400 font-serif italic">
              Reimagined with Intelligence.
            </span>
          </h1>

          <p className="mx-auto max-w-2xl text-base sm:text-lg leading-relaxed text-muted-foreground font-normal">
            An evidence-grounded multilingual clinical copilot that listens to consultations, reads medical reports, connects patient history and safeguards medication decisions — keeping doctors in complete control.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Button
              variant="teal"
              size="lg"
              onClick={() => navigate("/app")}
              rightIcon={<ArrowRight className="size-4" />}
            >
              Open Workspace
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleExploreClick}
              rightIcon={<ChevronRight className="size-4" />}
            >
              Explore Capabilities
            </Button>
          </div>

          {/* Healthcare Assurance Strip */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 pt-4 text-xs text-muted-foreground font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-accent" />
              Doctor-in-the-loop sign-off
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-accent" />
              Kannada, Hindi & English speech
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="size-4 text-accent" />
              ABDM-ready structured health records
            </span>
          </div>
        </div>

        {/* Product Interface Preview Mockup */}
        <div className="mt-14 sm:mt-18">
          <ProductPreviewDashboard />
        </div>
      </div>
    </section>
  );
}

