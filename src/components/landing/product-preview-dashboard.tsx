import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileCheck2,
  FileText,
  HeartPulse,
  Languages,
  Mic,
  Pill,
  ShieldCheck,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PreviewTab = "scribe" | "reports" | "safety";

export function ProductPreviewDashboard() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("scribe");
  const [noteApproved, setNoteApproved] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"kannada" | "hindi">("kannada");

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-3xl border border-border/80 bg-card shadow-2xl backdrop-blur-xl">
      {/* OS-Style Window Bar & Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-muted/40 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="size-3 rounded-full bg-destructive/60" />
            <span className="size-3 rounded-full bg-warning/60" />
            <span className="size-3 rounded-full bg-success/60" />
          </div>
          <span className="ml-2 font-mono text-xs font-semibold text-muted-foreground">
            AAROGYA MITHRA • OPD Workspace (Room 04)
          </span>
        </div>

        {/* Live Interactive Tab Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/80 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("scribe")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              activeTab === "scribe"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Mic className="size-3.5 text-accent" />
            <span>1. Scribe (LISTEN)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              activeTab === "reports"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="size-3.5 text-primary dark:text-teal-400" />
            <span>2. Reports (READ)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("safety")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold transition-all",
              activeTab === "safety"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="size-3.5 text-success" />
            <span>3. Safety (SAFEGUARD)</span>
          </button>
        </div>
      </div>

      {/* Patient Vital Context Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/70 bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent font-bold text-sm">
            RK
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">Rajesh Kumar</span>
              <span className="text-xs text-muted-foreground font-mono">54y • M • #AM-94021</span>
              <Badge variant="teal" size="sm">OPD General</Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
              <span>Known: Type 2 Diabetes, HTN</span>
              <span>•</span>
              <span className="text-destructive font-medium">Allergy: Penicillin</span>
            </div>
          </div>
        </div>

        {/* Live Vitals Chips */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          <span className="rounded-lg border border-border bg-muted/40 px-2.5 py-1">
            BP: <strong className="text-foreground">138/88</strong> mmHg
          </span>
          <span className="rounded-lg border border-border bg-muted/40 px-2.5 py-1">
            Pulse: <strong className="text-foreground">76</strong> bpm
          </span>
          <span className="rounded-lg border border-border bg-muted/40 px-2.5 py-1">
            Glucose: <strong className="text-warning">178</strong> mg/dL
          </span>
          <span className="rounded-lg border border-border bg-muted/40 px-2.5 py-1">
            eGFR: <strong className="text-success">&gt;85</strong> mL/min
          </span>
        </div>
      </div>

      {/* Main Preview Work Area */}
      <div className="grid gap-0 lg:grid-cols-12 min-h-[460px]">
        {/* Left Column: Input Source (Ambient Scribe or Lab OCR) */}
        <div className="border-b lg:border-b-0 lg:border-r border-border/70 p-5 lg:col-span-6 space-y-4 bg-muted/10">
          {activeTab === "scribe" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-accent">
                    Ambient Consultation Stream
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Languages className="size-3.5" />
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("kannada")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                      selectedLanguage === "kannada" ? "bg-accent/20 text-accent" : "hover:bg-muted",
                    )}
                  >
                    Kannada
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("hindi")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                      selectedLanguage === "hindi" ? "bg-accent/20 text-accent" : "hover:bg-muted",
                    )}
                  >
                    Hindi
                  </button>
                </div>
              </div>

              {/* Consultation Audio Waves */}
              <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="size-3.5 text-accent" />
                    <span>Microphone: Dual directional OPD array</span>
                  </span>
                  <span className="font-mono text-[10px]">02:14 / 04:30</span>
                </div>
                <div className="flex items-center gap-1 h-6 px-1">
                  {[24, 45, 80, 50, 95, 60, 30, 75, 90, 40, 20, 65, 85, 95, 55, 30, 70, 85, 40, 60, 90, 50, 30, 20].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: `${h}%` }}
                      className="w-1.5 rounded-full bg-accent/60 transition-all duration-300"
                    />
                  ))}
                </div>
              </div>

              {/* Multilingual Transcript Feed */}
              <div className="space-y-3 font-sans text-xs">
                {selectedLanguage === "kannada" ? (
                  <>
                    <div className="rounded-xl bg-card p-3 border border-border/80 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-semibold text-primary dark:text-primary-foreground">Patient (Kannada)</span>
                        <span>00:15</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        &quot;ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ತೀವ್ರ ಹೊಟ್ಟೆ ನೋವು ಇದೆ ಡಾಕ್ಟರೇ, ಊಟ ಮಾಡಿದ ಮೇಲೆ ಎದೆಯುರಿ ಜಾಸ್ತಿ ಆಗುತ್ತೆ.&quot;
                      </p>
                      <p className="text-accent text-[11px] font-medium leading-relaxed">
                        [Clinical translation]: Severe epigastric pain x 3 days, aggravated by meals with heartburn.
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3 border border-border/60 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-semibold text-primary dark:text-primary-foreground">Dr. Anika Rao</span>
                        <span>00:42</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        &quot;ನೀವು ಬೆಳಿಗ್ಗೆ ಮೆಟ್‌ಫಾರ್ಮಿನ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ? ವಾಂತಿ ಅಥವಾ ತಲೆಸುತ್ತು ಇದೆಯಾ?&quot;
                      </p>
                    </div>

                    <div className="rounded-xl bg-card p-3 border border-border/80 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-semibold text-primary dark:text-primary-foreground">Patient (Kannada + English)</span>
                        <span>01:10</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        &quot;ವಾಂತಿ ಇಲ್ಲ ಡಾಕ್ಟರೇ. Metformin regular ಆಗಿ ತಗೊಳ್ತಿದ್ದೀನಿ, ಆದರೆ ನೋವು ತಡೆಯೋಕೆ ಆಗ್ತಿಲ್ಲ.&quot;
                      </p>
                      <p className="text-accent text-[11px] font-medium leading-relaxed">
                        [Clinical translation]: No vomiting (Negated). Compliant with Metformin. Pain is persistent.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl bg-card p-3 border border-border/80 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-semibold text-primary dark:text-primary-foreground">Patient (Hindi)</span>
                        <span>00:15</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        &quot;डॉक्टर साहब, तीन दिन से पेट के ऊपरी हिस्से में बहुत जलन और दर्द है, खाना खाने के बाद बढ़ जाता है।&quot;
                      </p>
                      <p className="text-accent text-[11px] font-medium leading-relaxed">
                        [Clinical translation]: Burning epigastric pain x 3 days, worsens postprandially.
                      </p>
                    </div>

                    <div className="rounded-xl bg-muted/40 p-3 border border-border/60 space-y-1">
                      <div className="flex items-center justify-between text-muted-foreground text-[10px]">
                        <span className="font-semibold text-primary dark:text-primary-foreground">Dr. Anika Rao</span>
                        <span>00:40</span>
                      </div>
                      <p className="text-foreground leading-relaxed">
                        &quot;क्या आपको उल्टी या चक्कर आ रहे हैं? बीपी की दवा ले रहे हैं?&quot;
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Real-time Extracted Clinical Entities */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Detected Clinical Entities (ICD-10 / SNOMED)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="teal" size="sm">Epigastric Pain (R10.13)</Badge>
                  <Badge variant="navy" size="sm">Heartburn (R12)</Badge>
                  <Badge variant="outline" size="sm">Duration: 3 Days</Badge>
                  <Badge variant="success" size="sm">Vomiting: Absent (Negated)</Badge>
                  <Badge variant="teal" size="sm">Metformin Compliant</Badge>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-primary dark:text-teal-400">
                  Medical Report OCR & Entity Extraction
                </span>
                <Badge variant="teal" size="sm">OCR Confidence: 98.4%</Badge>
              </div>

              {/* Scanned Lab Report Snippet */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/70 pb-2">
                  <div className="text-xs">
                    <p className="font-semibold text-foreground">Thyrocare Comprehensive Metabolic Panel</p>
                    <p className="text-[10px] text-muted-foreground">Date: 12-Nov-2026 • Specimen: Serum</p>
                  </div>
                  <Badge variant="outline" size="sm">Verified PDF</Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10 border border-warning/20">
                    <span className="font-medium text-foreground">HbA1c (Glycosylated Hemoglobin)</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-warning">9.2%</strong>
                      <span className="text-[10px] text-muted-foreground">(Ref: &lt;5.7%)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-warning/10 border border-warning/20">
                    <span className="font-medium text-foreground">Fasting Blood Glucose</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-warning">182 mg/dL</strong>
                      <span className="text-[10px] text-muted-foreground">(Ref: 70-100)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                    <span className="font-medium text-foreground">Serum Creatinine</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-success">0.92 mg/dL</strong>
                      <span className="text-[10px] text-muted-foreground">(Ref: 0.7-1.3)</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                    <span className="font-medium text-foreground">Estimated GFR (CKD-EPI)</span>
                    <div className="flex items-center gap-2">
                      <strong className="text-success">&gt;85 mL/min/1.73m²</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Context synthesis alert:</span> HbA1c elevated from 7.8% (3 months ago) to 9.2%. Medication adjustment recommended for diabetes review.
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-success">
                  Medication Safeguard Verification Matrix
                </span>
                <Badge variant="success" size="sm">Zero Unreviewed Alerts</Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Allergy Check */}
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Patient Allergy Screen: Clear</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      No beta-lactam or penicillin antibiotics prescribed. Pantoprazole and Metformin are allergy-safe.
                    </p>
                  </div>
                </div>

                {/* Drug-Drug Check */}
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Drug-Drug Interaction: Negligible</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pantoprazole 40mg + Metformin 500mg verified against CDSCO & BNF formularies. No metabolic CYP450 inhibition detected.
                    </p>
                  </div>
                </div>

                {/* Duplicate Therapy Check */}
                <div className="rounded-xl border border-success/30 bg-success/5 p-3 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-success mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Therapeutic Duplication: None</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      No redundant PPI or antacid regimens found in active prescription history.
                    </p>
                  </div>
                </div>

                {/* Renal Adjustment */}
                <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
                  <Activity className="size-4 text-accent mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Renal Function Dosing: Appropriate</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      eGFR &gt; 85 mL/min qualifies for full standard Metformin dosing without lactic acidosis contraindications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Draft SOAP Clinical Note */}
        <div className="p-5 lg:col-span-6 flex flex-col justify-between space-y-4 bg-card">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Structured Clinical Note (SOAP)
              </span>
              <Badge variant={noteApproved ? "success" : "warning"} dot pulse={!noteApproved} size="sm">
                {noteApproved ? "Note Approved & Signed" : "Draft Advisory • Doctor Sign-off"}
              </Badge>
            </div>

            {/* Note Sections */}
            <div className="rounded-xl border border-border bg-background/50 p-4 font-sans text-xs space-y-3 leading-relaxed">
              <div>
                <strong className="text-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                  Subjective (S)
                </strong>
                <p className="text-muted-foreground">
                  54-year-old male presents with burning epigastric discomfort x 3 days, exacerbated postprandially. Denies vomiting, hematemesis, or melena. Currently compliant with Metformin and Telmisartan.
                </p>
              </div>

              <div>
                <strong className="text-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                  Objective (O)
                </strong>
                <p className="text-muted-foreground">
                  Vitals: BP 138/88 mmHg, HR 76 bpm regular. Abdomen: Soft, mild epigastric tenderness, no guarding or rebound. Recent HbA1c: 9.2% (elevated from 7.8%).
                </p>
              </div>

              <div>
                <strong className="text-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                  Assessment (A)
                </strong>
                <p className="text-muted-foreground">
                  1. Acute Dyspepsia / GERD (K21.9)<br />
                  2. Type 2 Diabetes Mellitus, suboptimally controlled (E11.65)
                </p>
              </div>

              <div>
                <strong className="text-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                  Plan & Rx (P)
                </strong>
                <div className="mt-1 space-y-1 font-mono text-[11px] text-foreground bg-card p-2 rounded-lg border border-border">
                  <p>• Tab. Pantoprazole 40 mg — 1 tab OD, 30 min before breakfast x 14 days</p>
                  <p>• Continue Tab. Metformin 500 mg — 1 tab BD after meals</p>
                  <p>• Advice: Avoid spicy foods, elevate head end, re-check postprandial glucose</p>
                </div>
              </div>
            </div>
          </div>

          {/* Clinician Oversight Action Bar */}
          <div className="pt-2 border-t border-border/80 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-accent" />
              <span>Doctor retains 100% final editorial authority</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard?.writeText("AAROGYA MITHRA SOAP Note...");
                }}
                leftIcon={<Copy className="size-3.5" />}
              >
                Copy
              </Button>
              <Button
                variant={noteApproved ? "outline" : "teal"}
                size="sm"
                onClick={() => setNoteApproved(!noteApproved)}
                leftIcon={noteApproved ? <Check className="size-3.5" /> : <FileCheck2 className="size-3.5" />}
              >
                {noteApproved ? "Signed as Dr. Anika Rao" : "Approve & Sign Note"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

