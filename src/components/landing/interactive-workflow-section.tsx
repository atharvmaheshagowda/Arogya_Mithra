import { useState } from "react";
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileSearch,
  FileText,
  Lock,
  Mic,
  Network,
  Pill,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface WorkflowStep {
  id: number;
  code: string;
  title: string;
  stage: string;
  actor: "Nurse / Frontdesk" | "Ambient AI" | "Copilot Engine" | "Treating Physician" | "Hospital System";
  summary: string;
  inputs: string[];
  copilotProcessing: string[];
  safetyGate: string;
  outputArtifact: string;
}

const workflowSteps: WorkflowStep[] = [
  {
    id: 1,
    code: "CHECKIN",
    title: "Patient Check-in",
    stage: "OPD Triage",
    actor: "Nurse / Frontdesk",
    summary: "Patient arrives at outpatient department, receives digital queue token, and nursing staff logs baseline vital signs.",
    inputs: ["National Health ID / Hospital MRN", "Current Blood Pressure, Pulse, SpO2", "Self-reported primary chief complaint"],
    copilotProcessing: ["Initializes patient encounter session", "Retrieves historical record links from central registry"],
    safetyGate: "Nurse verification of patient identity and emergency triage threshold (red/yellow/green).",
    outputArtifact: "Active OPD queue token & linked baseline vitals card",
  },
  {
    id: 2,
    code: "CAPTURE",
    title: "Consultation Capture",
    stage: "Ambient Stream",
    actor: "Ambient AI",
    summary: "Doctor initiates visit. Ambient dual-microphone array captures doctor-patient conversation unobtrusively.",
    inputs: ["Ambient spoken consultation", "Doctor physical examination remarks", "Doctor verbal instructions to patient"],
    copilotProcessing: ["Acoustic echo cancellation and noise filtration", "Speaker diarization (Doctor vs. Patient vs. Attendant)"],
    safetyGate: "Visual recording indicator light in consultation room for transparent patient awareness.",
    outputArtifact: "Encrypted dual-channel audio stream (local in-memory buffer)",
  },
  {
    id: 3,
    code: "LISTEN",
    title: "Multilingual Scribe",
    stage: "Speech-to-Clinical",
    actor: "Copilot Engine",
    summary: "Processes spoken Kannada, Hindi, and English into clinical terminology with full code-mixing comprehension.",
    inputs: ["Spoken dialogue across mixed regional Indian dialects", "Colloquial symptom phrases"],
    copilotProcessing: ["Dialect-aware Automatic Speech Recognition (ASR)", "Clinical Named Entity Recognition (NER)", "Negation & uncertainty extraction"],
    safetyGate: "Preserves exact symptom duration, temporal anchors, and patient-negated complaints without hallucination.",
    outputArtifact: "Normalized clinical dialogue transcript & extracted symptom tags",
  },
  {
    id: 4,
    code: "READ",
    title: "Report Intelligence",
    stage: "Multimodal OCR",
    actor: "Copilot Engine",
    summary: "Ingests scanned physical paper prescriptions, external pathology PDFs, and laboratory result sheets.",
    inputs: ["Camera uploads of physical lab slips", "Diagnostic PDF uploads", "Previous handwritten doctor prescriptions"],
    copilotProcessing: ["Optical Character Recognition (OCR) with confidence scoring", "Reference range normalization & out-of-bounds tagging", "Generic molecule resolution from brand names"],
    safetyGate: "Every extracted number links back to the exact pixel coordinates on the source document for instant clinician verification.",
    outputArtifact: "Structured discrete laboratory biomarkers & past medication list",
  },
  {
    id: 5,
    code: "CONNECT",
    title: "Context Synthesis",
    stage: "Longitudinal Graph",
    actor: "Copilot Engine",
    summary: "Synthesizes today's symptoms with past clinic visits, known allergies, chronic histories, and external lab results.",
    inputs: ["Current consultation entities", "Extracted report values", "Historical hospital visits & recorded allergy profile"],
    copilotProcessing: ["Timeline alignment across disparate health sources", "Information conflict detection (e.g., patient stopped drug due to side effects)"],
    safetyGate: "Flags discrepancies between patient statements and historical medical records before medication selection.",
    outputArtifact: "Unified chronological patient timeline & highlighted clinical alerts",
  },
  {
    id: 6,
    code: "SAFEGUARD",
    title: "Medication Safety",
    stage: "Deterministic Check",
    actor: "Copilot Engine",
    summary: "Evaluates proposed treatment against drug interactions, allergy cross-reactivity, renal dosing, and therapeutic duplication.",
    inputs: ["Proposed prescription molecules & dosages", "Active medications from prior visits", "Known drug allergies & eGFR / LFT biomarkers"],
    copilotProcessing: ["Deterministic rules engine checking CDSCO & BNF pharmacopeias", "Allergy cross-reactivity tree screening", "Renal dosage threshold calculations"],
    safetyGate: "Hard-stop warning on life-threatening contraindications; evidence references supplied for every alert.",
    outputArtifact: "Pre-signing safety verification matrix & verified alternative suggestions",
  },
  {
    id: 7,
    code: "REVIEW",
    title: "Doctor Review & Edit",
    stage: "Human Oversight Gate",
    actor: "Treating Physician",
    summary: "The doctor reviews the comprehensive SOAP draft, adjusts medication choices, modifies instructions, and verifies accuracy.",
    inputs: ["AAROGYA MITHRA synthesized draft SOAP note", "Prescription recommendations & safety alerts", "Physician clinical judgment"],
    copilotProcessing: ["Real-time document editing interface", "Instant recalculation if doctor updates prescribed molecules"],
    safetyGate: "MANDATORY HUMAN GATE: No output is finalized or committed to medical records without explicit doctor sign-off.",
    outputArtifact: "Clinician-authenticated consultation summary & approved prescription",
  },
  {
    id: 8,
    code: "APPROVE",
    title: "Approved Clinical Note",
    stage: "Final Documentation",
    actor: "Hospital System",
    summary: "Final authenticated note is committed to the hospital EMR, transmitted to the hospital pharmacy, and printed for the patient.",
    inputs: ["Doctor digital signature", "Approved SOAP record", "Patient discharge advice"],
    copilotProcessing: ["FHIR-compliant export", "Patient vernacular summary generation in Kannada/Hindi for home care"],
    safetyGate: "Cryptographically signed clinical record adhering to ABDM guidelines and hospital audit standards.",
    outputArtifact: "Signed EMR record, Pharmacy dispensing order & Patient vernacular care slip",
  },
];

export function InteractiveWorkflowSection() {
  const [selectedStepId, setSelectedStepId] = useState<number>(3);
  const activeStep = workflowSteps.find((s) => s.id === selectedStepId) ?? workflowSteps[2];

  return (
    <section id="workflow" className="relative border-y border-border/80 bg-muted/20 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <Badge variant="teal" size="md">INTERACTIVE BLUEPRINT</Badge>
          <h2 className="text-display-1 text-foreground">
            The end-to-end clinical workflow.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Follow the 8-stage journey from ambient outpatient consultation capture to verified, doctor-approved clinical documentation.
          </p>
        </div>

        {/* Step Sequence Bar (Clickable) */}
        <div className="rounded-2xl border border-border/80 bg-card p-4 sm:p-6 shadow-xs overflow-x-auto">
          <div className="flex items-center justify-between min-w-[760px] gap-2">
            {workflowSteps.map((step, idx) => {
              const isSelected = step.id === selectedStepId;
              const isPast = step.id < selectedStepId;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => setSelectedStepId(step.id)}
                    className={cn(
                      "group flex flex-col items-center text-center transition-all cursor-pointer p-2 rounded-xl w-full",
                      isSelected && "bg-accent/10 border border-accent/40 shadow-xs",
                      !isSelected && "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-9 place-items-center rounded-xl text-xs font-bold transition-all",
                        isSelected && "bg-accent text-accent-foreground ring-4 ring-accent/20",
                        isPast && "bg-primary/20 text-primary dark:text-teal-300",
                        !isSelected && !isPast && "bg-muted text-muted-foreground",
                      )}
                    >
                      {step.id}
                    </span>
                    <span
                      className={cn(
                        "mt-2 text-xs font-semibold leading-tight line-clamp-1",
                        isSelected ? "text-accent" : "text-foreground",
                      )}
                    >
                      {step.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate w-20">
                      {step.stage}
                    </span>
                  </button>

                  {idx < workflowSteps.length - 1 && (
                    <div
                      className={cn(
                        "h-0.5 w-4 shrink-0 transition-colors",
                        isPast ? "bg-accent" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Step Deep Dive Inspector */}
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          {/* Step Overview Panel */}
          <Card className="lg:col-span-5 p-6 sm:p-8 space-y-6 border-border/80 bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-accent text-accent-foreground font-bold text-sm">
                  0{activeStep.id}
                </span>
                <div>
                  <h3 className="font-display text-2xl font-bold text-foreground">
                    {activeStep.title}
                  </h3>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                    Stage: {activeStep.stage}
                  </p>
                </div>
              </div>
              <Badge variant="navy" size="sm">
                {activeStep.actor}
              </Badge>
            </div>

            <p className="text-sm leading-relaxed text-foreground/90">
              {activeStep.summary}
            </p>

            {/* Inputs & Outputs */}
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Key Stage Inputs
                </span>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {activeStep.inputs.map((inp, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className="size-1 rounded-full bg-accent" />
                      <span>{inp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-border/70">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Resulting Output Artifact
                </span>
                <div className="rounded-xl border border-accent/25 bg-accent/5 p-3 text-xs font-medium text-foreground flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-accent shrink-0" />
                  <span>{activeStep.outputArtifact}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* AI Copilot & Safety Architecture Panel */}
          <Card className="lg:col-span-7 p-6 sm:p-8 space-y-6 border-border/80 bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border/80 pb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-accent" />
                <h4 className="font-display text-xl font-semibold text-foreground">
                  Copilot Intelligence & Safeguards
                </h4>
              </div>
              <Badge variant="teal" size="sm">Deterministic Logic</Badge>
            </div>

            {/* Processing Steps */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                Automated Processing Stream
              </span>
              <div className="space-y-2">
                {activeStep.copilotProcessing.map((proc, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-foreground/90"
                  >
                    <span className="grid size-5 place-items-center rounded-full bg-accent/15 text-accent font-bold text-[10px] shrink-0">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{proc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clinical Safety Barrier */}
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-warning text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="size-4" />
                <span>Clinical Safety & Oversight Gateway</span>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed font-medium">
                {activeStep.safetyGate}
              </p>
            </div>

            {/* Step Navigation Controls */}
            <div className="flex items-center justify-between pt-2 border-t border-border/80">
              <Button
                variant="outline"
                size="sm"
                disabled={activeStep.id === 1}
                onClick={() => setSelectedStepId((prev) => Math.max(1, prev - 1))}
              >
                Previous Stage
              </Button>

              <span className="text-xs font-mono text-muted-foreground">
                Step {activeStep.id} of {workflowSteps.length}
              </span>

              <Button
                variant="teal"
                size="sm"
                disabled={activeStep.id === workflowSteps.length}
                onClick={() => setSelectedStepId((prev) => Math.min(workflowSteps.length, prev + 1))}
                rightIcon={<ChevronRight className="size-4" />}
              >
                Next Stage
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}

