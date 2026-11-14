import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FileCheck2,
  Lock,
  Scale,
  ShieldCheck,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const safetyPillars = [
  {
    icon: Scale,
    title: "Deterministic Verification",
    badge: "Rule-Based Core",
    description:
      "Unlike generative AI models that can hallucinate dosages, AAROGYA MITHRA checks medications against hard-coded deterministic rules compiled from CDSCO, BNF, and Indian National Formularies.",
  },
  {
    icon: BookOpen,
    title: "Evidence-Linked Alerts",
    badge: "Traceable Citations",
    description:
      "Every warning, interaction flag, or dosage recommendation includes direct reference citations from peer-reviewed clinical literature and official statutory health guidelines.",
  },
  {
    icon: AlertTriangle,
    title: "Allergy Cross-Reactivity",
    badge: "Structural Grouping",
    description:
      "Automated pharmacological class screening catches indirect allergy risks — preventing cephalosporins or carbapenems in patients with severe beta-lactam hypersensitivities.",
  },
  {
    icon: UserCheck,
    title: "The Mandatory Doctor Gate",
    badge: "Human In The Loop",
    description:
      "No note is committed, no prescription is ordered, and no recommendation is finalized without the treating physician actively reviewing, editing, and digitally signing off.",
  },
];

export function ClinicalSafetySection() {
  return (
    <section id="safety" className="relative border-y border-border/80 bg-muted/20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <Badge variant="navy" size="md">CLINICAL SAFETY ARCHITECTURE</Badge>
          <h2 className="text-display-1 text-foreground">
            AI assists the doctor.
            <br />
            <span className="text-teal-600 dark:text-teal-400 font-serif italic">
              The doctor makes the decision.
            </span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            AAROGYA MITHRA is not an autonomous AI diagnostic tool. It is an intelligent clinical shield designed to support the physician while keeping authority where it belongs: with the doctor.
          </p>
        </div>

        {/* 4 Pillars Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {safetyPillars.map((pillar) => (
            <Card
              key={pillar.title}
              className="flex flex-col justify-between border-border/80 bg-card/90 backdrop-blur-xl p-6 transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md"
            >
              <div className="space-y-4">
                <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent dark:bg-accent/20">
                  <pillar.icon className="size-6" />
                </span>
                <div className="space-y-1">
                  <h3 className="font-display text-xl font-semibold text-foreground">
                    {pillar.title}
                  </h3>
                  <Badge variant="teal" size="sm">{pillar.badge}</Badge>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {pillar.description}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-border/70 flex items-center gap-2 text-[11px] font-semibold text-accent">
                <ShieldCheck className="size-3.5" />
                <span>Zero Autonomous Gating</span>
              </div>
            </Card>
          ))}
        </div>

        {/* Clinical Declaration Callout */}
        <div className="rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground shrink-0 mt-1">
              <Stethoscope className="size-6" />
            </span>
            <div className="space-y-1">
              <h4 className="font-display text-2xl font-bold text-foreground">
                Physician Autonomy is Non-Negotiable.
              </h4>
              <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                AAROGYA MITHRA presents clean drafts, highlights missed lab trends, and warns about interactions. The clinician can override, adjust, or discard any AI recommendation with a single click.
              </p>
            </div>
          </div>
          <Badge variant="success" size="lg" className="shrink-0 px-4 py-2 text-sm font-semibold">
            Active Clinician Oversight
          </Badge>
        </div>
      </div>
    </section>
  );
}

