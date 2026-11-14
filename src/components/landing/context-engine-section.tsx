import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Filter,
  GitMerge,
  History,
  Layers,
  Pill,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type RecordCategory = "all" | "rx" | "labs" | "consultations" | "allergies";

export function ContextEngineSection() {
  const [filter, setFilter] = useState<RecordCategory>("all");

  return (
    <section id="context-engine" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <Badge variant="teal" size="md">DEEP DIVE • PATIENT CONTEXT ENGINE</Badge>
          <h2 className="text-display-1 text-foreground">
            From fragmented paperwork to one continuous patient story.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Indian patients frequently visit multiple independent clinics and diagnostic labs. AAROGYA MITHRA connects these scattered dots so doctors never prescribe in the dark.
          </p>
        </div>

        {/* 5 Input Streams to 1 Unified Timeline Diagram */}
        <div className="rounded-2xl glass-morph-card p-6 sm:p-10 shadow-2xl border border-white/60 dark:border-white/15 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div>
              <h3 className="font-display text-2xl font-bold text-foreground">
                Synthesized Clinical Record: Rajesh Kumar (54y M)
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Aggregating 4 distinct hospital encounters, 3 diagnostic lab PDFs, and 6 active prescriptions.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-muted/60 p-1.5 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors",
                  filter === "all" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                All Sources (7)
              </button>
              <button
                type="button"
                onClick={() => setFilter("rx")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors",
                  filter === "rx" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Past Prescriptions
              </button>
              <button
                type="button"
                onClick={() => setFilter("labs")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors",
                  filter === "labs" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Lab Results
              </button>
              <button
                type="button"
                onClick={() => setFilter("allergies")}
                className={cn(
                  "px-3 py-1 rounded-lg transition-colors",
                  filter === "allergies" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                Documented Allergies
              </button>
            </div>
          </div>

          {/* Timeline Feed */}
          <div className="space-y-4">
            {/* Record Item 1: Documented Allergy */}
            {(filter === "all" || filter === "allergies") && (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-destructive/15 text-destructive shrink-0 mt-0.5">
                    <ShieldAlert className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">Critical Allergy: Penicillin &amp; Amoxicillin</span>
                      <Badge variant="danger" size="sm">Severe Anaphylactoid Risk</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recorded at Manipal Hospital Emergency OPD during acute pharyngitis treatment. Patient developed severe cutaneous urticaria and periorbital edema.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0 self-end sm:self-start">
                  12-Jan-2025
                </span>
              </div>
            )}

            {/* Record Item 2: Lab Report */}
            {(filter === "all" || filter === "labs") && (
              <div className="rounded-xl border border-warning/25 bg-warning/5 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-warning/15 text-warning shrink-0 mt-0.5">
                    <Activity className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">Laboratory Report: Glycemic &amp; Renal Profile</span>
                      <Badge variant="warning" size="sm">HbA1c: 9.2% (Elevated)</Badge>
                      <Badge variant="outline" size="sm">Creatinine: 0.92 mg/dL</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Thyrocare Diagnostic Center PDF. Demonstrates a steady glycemic rise from 7.8% (3 months ago) to 9.2%. Fasting sugar 182 mg/dL.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0 self-end sm:self-start">
                  10-Nov-2026
                </span>
              </div>
            )}

            {/* Record Item 3: Conflict Detection & Past Rx */}
            {(filter === "all" || filter === "rx") && (
              <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-accent/15 text-accent shrink-0 mt-0.5">
                    <Pill className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">Prescription History: Antihypertensive Transition</span>
                      <Badge variant="teal" size="sm">Conflict Detected &amp; Resolved</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cardiology OPD (Dr. K. Mehta). Patient reported persistent dry cough on Ramipril 5mg. Discontinued and transitioned to Telmisartan 40mg OD. Blood pressure normalized to 134/84 mmHg.
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0 self-end sm:self-start">
                  14-Aug-2026
                </span>
              </div>
            )}

            {/* Record Item 4: Previous Consultation Record */}
            {(filter === "all" || filter === "consultations") && (
              <div className="rounded-xl border border-border bg-card p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-muted text-muted-foreground shrink-0 mt-0.5">
                    <FileText className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">Diabetic Follow-up Consultation</span>
                      <Badge variant="navy" size="sm">Routine OPD Review</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Northstar Clinic (Dr. Anika Rao). Diet counseling provided. Metformin increased to 500mg BD after meals. Ophthalmologist fundoscopy recommended (overdue by 8 months).
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono text-muted-foreground shrink-0 self-end sm:self-start">
                  04-May-2026
                </span>
              </div>
            )}
          </div>

          {/* Context Engine Summary Box */}
          <div className="rounded-xl border border-accent/30 bg-accent/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="font-semibold text-sm text-foreground flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="size-4 text-accent" />
                Contextual Insight for Today&apos;s Physician:
              </span>
              <p className="text-xs text-muted-foreground max-w-2xl">
                Patient is diabetic with rising HbA1c, stable renal function, and severe penicillin allergy. Telmisartan is active; do not restart ACE inhibitors. Fundoscopy is overdue.
              </p>
            </div>
            <Badge variant="teal" size="lg" className="shrink-0">
              Full History Synthesized
            </Badge>
          </div>
        </div>
      </div>
    </section>
  );
}

