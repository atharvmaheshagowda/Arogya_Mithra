import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Languages,
  Mic,
  Network,
  Pill,
  ScanLine,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function CoreCapabilitiesSection() {
  const [activeSpeechSample, setActiveSpeechSample] = useState<"kannada" | "hindi" | "english">("kannada");

  return (
    <section id="capabilities" className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-28">
        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4">
          <Badge variant="teal" size="md">THE FOUR PILLARS OF AAROGYA MITHRA</Badge>
          <h2 className="text-display-1 text-foreground">
            A comprehensive clinical copilot for outpatient care.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            Four specialized engines working in continuous harmony to lift the administrative burden off physicians while safeguarding clinical decisions.
          </p>
        </div>

        {/* ====================================================================
            MODULE 1: LISTEN — Multilingual Clinical Scribe
           ==================================================================== */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="space-y-6 lg:col-span-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:bg-accent/20 shrink-0">
                <Mic className="size-7" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 shadow-xs size-14 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=240&q=80"
                  alt="Doctor patient outpatient consultation"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">MODULE 01 • LISTEN</span>
              <h3 className="text-display-2 text-foreground">
                Multilingual Clinical Scribe.
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Captures ambient doctor-patient conversations in Kannada, Hindi, and English. Handles natural Indian code-mixing effortlessly without interrupting the natural flow of OPD consultations.
            </p>

            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Tri-lingual understanding:</strong> Seamlessly transcribes Kannada, Hindi, and Indian English in real time.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Clinical entity extraction:</strong> Accurately isolates chief symptoms, duration, triggers, and severity.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Negation & uncertainty preservation:</strong> Retains vital nuances like &quot;no chest pain&quot; and &quot;suspected allergy&quot;.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Instant SOAP note drafting:</strong> Automatically formats messy dialogue into clean clinical documentation.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Scribe UI Showcase */}
          <div className="lg:col-span-7">
            <Card className="overflow-hidden border-border/80 bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-xs font-semibold text-foreground">Live Ambient Stream</span>
                </div>
                {/* Language Switcher */}
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                  {(["kannada", "hindi", "english"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveSpeechSample(lang)}
                      className={cn(
                        "rounded px-2.5 py-0.5 text-xs font-medium capitalize transition-colors",
                        activeSpeechSample === lang
                          ? "bg-card text-foreground shadow-xs font-semibold"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-6 space-y-4">
                {activeSpeechSample === "kannada" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5">
                      <p className="text-xs text-muted-foreground font-mono font-semibold">PATIENT SPEECH (KANNADA):</p>
                      <p className="text-sm text-foreground font-medium">
                        &quot;ಡಾಕ್ಟರೇ, ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ತೀವ್ರ ಹೊಟ್ಟೆ ಉರಿ ಮತ್ತು ಎದೆಬಡಿತ ಜಾಸ್ತಿ ಆಗ್ತಿದೆ. ರಾತ್ರಿ ಊಟ ಆದ್ಮೇಲೆ ಮಲಗೋಕೆ ಆಗ್ತಿಲ್ಲ.&quot;
                      </p>
                    </div>
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1.5">
                      <p className="text-xs text-accent font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5" />
                        CLINICAL GROUNDING & EXTRACTION:
                      </p>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        • <strong>Chief Complaint:</strong> Severe epigastric burning (Dyspepsia/GERD) x 3 days.<br />
                        • <strong>Associated:</strong> Palpitations post-meal; nocturnal orthopneic discomfort.<br />
                        • <strong>Negation check:</strong> No vomiting or hematemesis reported.
                      </p>
                    </div>
                  </div>
                )}

                {activeSpeechSample === "hindi" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5">
                      <p className="text-xs text-muted-foreground font-mono font-semibold">PATIENT SPEECH (HINDI):</p>
                      <p className="text-sm text-foreground font-medium">
                        &quot;मुझे चार दिन से दोनों घुटनों में बहुत दर्द है, सुबह उठते वक्त अकड़न रहती है और सीढ़ियां चढ़ना मुश्किल हो गया है।&quot;
                      </p>
                    </div>
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1.5">
                      <p className="text-xs text-accent font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5" />
                        CLINICAL GROUNDING & EXTRACTION:
                      </p>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        • <strong>Chief Complaint:</strong> Bilateral knee joint pain x 4 days.<br />
                        • <strong>Aggravating:</strong> Stair climbing, weight-bearing.<br />
                        • <strong>Clinical Signs:</strong> Morning joint stiffness &lt; 30 minutes (Osteoarthritis suspicion).
                      </p>
                    </div>
                  </div>
                )}

                {activeSpeechSample === "english" && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-1.5">
                      <p className="text-xs text-muted-foreground font-mono font-semibold">PATIENT SPEECH (INDIAN CODE-MIX):</p>
                      <p className="text-sm text-foreground font-medium">
                        &quot;Doctor, from last one week sugar check kiya toh fasting 190 aa raha hai, and I have mild giddiness also when standing up.&quot;
                      </p>
                    </div>
                    <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-1.5">
                      <p className="text-xs text-accent font-semibold flex items-center gap-1.5">
                        <Sparkles className="size-3.5" />
                        CLINICAL GROUNDING & EXTRACTION:
                      </p>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        • <strong>Metabolic:</strong> Uncontrolled Fasting Blood Sugar (190 mg/dL).<br />
                        • <strong>Symptom:</strong> Postural dizziness / orthostasis.<br />
                        • <strong>Action Needed:</strong> Check current antidiabetic regimen and standing BP.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ====================================================================
            MODULE 2: READ — Medical Report Intelligence
           ==================================================================== */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Interactive OCR & Report Visualizer */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            <Card className="overflow-hidden border-border/80 bg-card shadow-xl">
              <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3">
                <div className="flex items-center gap-2">
                  <ScanLine className="size-4 text-accent" />
                  <span className="text-xs font-semibold text-foreground">Multi-Page Lab & Rx Ingestion</span>
                </div>
                <Badge variant="teal" size="sm">Extraction Confidence: 99.1%</Badge>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Document Type</p>
                    <p className="text-xs font-bold text-foreground mt-1">Liver & Kidney Panel</p>
                    <p className="text-[10px] text-accent mt-0.5">Scanned PDF (300 DPI)</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Lab Source</p>
                    <p className="text-xs font-bold text-foreground mt-1">Dr. Lal PathLabs</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Dated 10-Nov-2026</p>
                  </div>
                  <div className="rounded-xl border border-border bg-card p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Extracted Entities</p>
                    <p className="text-xs font-bold text-success mt-1">14 Parameters</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">All Units Standardized</p>
                  </div>
                </div>

                {/* Extracted Biomarker Table */}
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="grid grid-cols-4 bg-muted/50 px-4 py-2 text-[10px] font-bold uppercase text-muted-foreground">
                    <span>Biomarker</span>
                    <span>Result</span>
                    <span>Reference Range</span>
                    <span className="text-right">Clinical Status</span>
                  </div>
                  <div className="divide-y divide-border/60 text-xs font-medium">
                    <div className="grid grid-cols-4 px-4 py-2.5 items-center">
                      <span className="text-foreground">Serum Creatinine</span>
                      <span className="font-mono text-foreground font-semibold">1.42 mg/dL</span>
                      <span className="text-muted-foreground text-[11px]">0.7 - 1.2</span>
                      <span className="text-right">
                        <Badge variant="warning" size="sm">Elevated</Badge>
                      </span>
                    </div>
                    <div className="grid grid-cols-4 px-4 py-2.5 items-center">
                      <span className="text-foreground">eGFR (CKD-EPI)</span>
                      <span className="font-mono text-warning font-semibold">54 mL/min</span>
                      <span className="text-muted-foreground text-[11px]">&gt; 60</span>
                      <span className="text-right">
                        <Badge variant="warning" size="sm">Stage 3a CKD</Badge>
                      </span>
                    </div>
                    <div className="grid grid-cols-4 px-4 py-2.5 items-center">
                      <span className="text-foreground">Serum Potassium (K+)</span>
                      <span className="font-mono text-foreground font-semibold">4.6 mEq/L</span>
                      <span className="text-muted-foreground text-[11px]">3.5 - 5.0</span>
                      <span className="text-right">
                        <Badge variant="success" size="sm">Normal</Badge>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-warning mt-0.5 shrink-0" />
                  <span>
                    <strong>Copilot Flag:</strong> Creatinine increased from 1.1 mg/dL to 1.42 mg/dL. Prompting medication review for NSAIDs and ACE inhibitors before prescribing.
                  </span>
                </div>
              </div>
            </Card>
          </div>

          <div className="order-1 lg:order-2 space-y-6 lg:col-span-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-teal-400 shrink-0">
                <FileSearch className="size-7" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 shadow-xs size-14 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=240&q=80"
                  alt="Medical laboratory reports and pathology diagnostics"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-teal-400">
                MODULE 02 • READ
              </span>
              <h3 className="text-display-2 text-foreground">
                Medical Report Intelligence.
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Digitizes crumpled physical prescriptions, lab PDFs, and photographic reports from any pathology center in India. Automatically extracts biomarkers, units, and dates with verified confidence levels.
            </p>

            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Pathology OCR:</strong> Extracts lab values, standard units, and reference intervals in seconds.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Prescription Digitizer:</strong> Converts doctor handwriting and brand trade names to standardized generic equivalents.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Abnormality Detection:</strong> Proactively highlights out-of-range clinical parameters with visual badges.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Source Verification:</strong> Allows doctors to click any extracted number to jump to the exact pixel location on the original report.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* ====================================================================
            MODULE 3: CONNECT — Patient Context Engine
           ==================================================================== */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          <div className="space-y-6 lg:col-span-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-accent/10 text-accent dark:bg-accent/20 shrink-0">
                <Network className="size-7" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 shadow-xs size-14 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=240&q=80"
                  alt="Doctor reviewing connected digital patient health records"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-accent">MODULE 03 • CONNECT</span>
              <h3 className="text-display-2 text-foreground">
                Patient Context Engine.
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              Weaves fragmented consultations, old prescriptions, and external lab reports into one continuous longitudinal medical timeline. Automatically detects conflicting information and missing chronic check-ups.
            </p>

            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Unified Patient Timeline:</strong> Consolidates 5+ visits across departments into a chronological storyline.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Conflict Detection:</strong> Flags discrepancies between patient self-reports and past electronic prescriptions.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Allergy Centralization:</strong> Guarantees past recorded drug allergies follow the patient into every encounter.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Chronic Disease Trajectory:</strong> Plots biomarker trends (HbA1c, BP, creatinine) over months and years.</span>
              </li>
            </ul>
          </div>

          {/* Interactive Timeline Preview */}
          <div className="lg:col-span-7">
            <Card className="overflow-hidden border-border/80 bg-card shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Longitudinal Patient Timeline
                </span>
                <Badge variant="teal" size="sm">Cross-Encounter Linked</Badge>
              </div>

              {/* Chronological Spine */}
              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {/* Event 1 */}
                <div className="relative space-y-1">
                  <span className="absolute -left-6 top-1 size-3 rounded-full border-2 border-card bg-accent" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Today&apos;s Consultation (OPD General)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">13-Nov-2026</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Chief complaint: Epigastric burning. Active Rx: Pantoprazole 40mg added. Metformin maintained.
                  </p>
                </div>

                {/* Event 2 */}
                <div className="relative space-y-1">
                  <span className="absolute -left-6 top-1 size-3 rounded-full border-2 border-card bg-primary dark:bg-teal-400" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">External Diagnostic Report (Thyrocare)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">10-Nov-2026</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    HbA1c: 9.2% (Uncontrolled). Fasting Sugar: 182 mg/dL. Creatinine: 0.92 mg/dL.
                  </p>
                </div>

                {/* Event 3 with Conflict Alert */}
                <div className="relative space-y-1">
                  <span className="absolute -left-6 top-1 size-3 rounded-full border-2 border-card bg-warning" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Cardiology Review (Dr. K. Mehta)</span>
                    <span className="text-[10px] text-muted-foreground font-mono">14-Aug-2026</span>
                  </div>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-2 text-[11px] text-muted-foreground">
                    <span className="font-bold text-warning">Conflict Detected:</span> Ramipril discontinued due to persistent dry cough. Replaced with Telmisartan 40mg OD.
                  </div>
                </div>

                {/* Event 4 */}
                <div className="relative space-y-1">
                  <span className="absolute -left-6 top-1 size-3 rounded-full border-2 border-card bg-muted-foreground" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Initial Diabetic Workup</span>
                    <span className="text-[10px] text-muted-foreground font-mono">12-Jan-2025</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allergy documented: Severe cutaneous rash with Amoxicillin (Penicillin class).
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* ====================================================================
            MODULE 4: SAFEGUARD — Medication Safety Engine
           ==================================================================== */}
        <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
          {/* Interactive Safeguard Preview */}
          <div className="order-2 lg:order-1 lg:col-span-7">
            <Card className="overflow-hidden border-border/80 bg-card shadow-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/80 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" />
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                    Real-time Prescription Gating
                  </span>
                </div>
                <Badge variant="success" size="sm">Evidence-Linked: CDSCO / BNF</Badge>
              </div>

              {/* Medication Verification Cards */}
              <div className="space-y-3">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="size-4 text-destructive" />
                      <span className="text-xs font-bold text-destructive">Allergy Conflict Intercepted</span>
                    </div>
                    <Badge variant="danger" size="sm">Hard Stop Alert</Badge>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Attempted Rx: <strong>Amoxicillin-Clavulanate 625mg</strong> flagged against documented <strong>Penicillin allergy</strong> (cutaneous urticaria, Jan 2025).
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Evidence source: CDSCO Drug Safety Alert #4412 • Cross-reactivity: Beta-lactam group.
                  </p>
                </div>

                <div className="rounded-xl border border-warning/25 bg-warning/5 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-warning" />
                      <span className="text-xs font-bold text-warning">Drug-Drug Interaction Advisory</span>
                    </div>
                    <Badge variant="warning" size="sm">Moderate Risk</Badge>
                  </div>
                  <p className="text-xs text-foreground/90 leading-relaxed">
                    Attempted co-prescription: <strong>Ciprofloxacin + Antacid (Pantoprazole/Sucralfate)</strong>. Chelation reduces fluoroquinolone absorption by up to 50%.
                  </p>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Recommendation: Space administration by at least 2 hours.
                  </p>
                </div>

                <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-success">
                    <CheckCircle2 className="size-4" />
                    <span className="text-xs font-bold">Approved Alternative Safe</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Doctor switched therapy to <strong>Azithromycin 500mg OD x 3 days</strong>. Fully compatible with patient allergy and metabolic profile.
                  </p>
                </div>
              </div>
            </Card>
          </div>

          <div className="order-1 lg:order-2 space-y-6 lg:col-span-5">
            <div className="flex items-center gap-3">
              <div className="inline-flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive dark:bg-destructive/20 shrink-0">
                <ShieldAlert className="size-7" />
              </div>
              <div className="overflow-hidden rounded-2xl border border-border/80 shadow-xs size-14 shrink-0">
                <img
                  src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=240&q=80"
                  alt="Pharmacological medication safety verification"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-destructive">
                MODULE 04 • SAFEGUARD
              </span>
              <h3 className="text-display-2 text-foreground">
                Medication Safety Engine.
              </h3>
            </div>

            <p className="text-sm leading-relaxed text-muted-foreground">
              A clinical safety net engineered to intercept contraindications, severe drug interactions, and duplicate therapies in the final seconds before a prescription is signed.
            </p>

            <ul className="space-y-3 text-sm text-foreground/90">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Deterministic Verification:</strong> Rule-based medical safety logic grounded in official pharmacopeias.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Allergy Cross-Reactivity:</strong> Automatically groups drug families to stop cephalosporins in high-risk penicillin allergies.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Duplicate Therapy Interception:</strong> Prevents inadvertent double dosing when patients switch between brand names.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="size-4 text-accent mt-0.5 shrink-0" />
                <span><strong>Doctor Approval Authority:</strong> Alerts present evidence clearly without ever overriding the treating physician.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

