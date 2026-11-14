import { useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  HeartPulse,
  Languages,
  Mic,
  Pill,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
  Volume2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PreviewTab = "scribe" | "reports" | "safety";

export function ProductPreviewDashboard() {
  const [activeTab, setActiveTab] = useState<PreviewTab>("scribe");
  const [noteApproved, setNoteApproved] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<"kannada" | "hindi">("kannada");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = `AAROGYA MITHRA CLINICAL ENCOUNTER NOTE
Patient: Rajesh Kumar | 54y M | UHID: #AM-2026-94021
Date: 14-Nov-2026 | OPD General Medicine Room 04
Physician: Dr. Anika Rao, MBBS, MD (KMC #74921)

[S] Burning epigastric pain x 3 days, postprandial exacerbation with pyrosis. Denies vomiting, hematemesis, or melena. Compliant with Metformin & Telmisartan.
[O] BP 138/88 mmHg, HR 76 bpm regular. Abdomen: Soft, mild epigastric tenderness, no guarding/rebound. Fasting Glucose: 182 mg/dL, HbA1c: 9.2%.
[A] 1. Acute Dyspepsia / GERD (ICD-10: K21.9)
    2. Type 2 Diabetes Mellitus, suboptimally controlled (ICD-10: E11.65)
[P] • Tab. Pantoprazole 40 mg — 1 tab OD 30min before breakfast x 14d
    • Continue Tab. Metformin 500 mg — 1 tab BD post meals
    • Dietary counselling; repeat fasting blood sugar in 2 weeks.`;

    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-white/40 dark:border-white/10 glass-morph shadow-2xl backdrop-blur-xl transition-all">
      {/* Hospital System Header Bar - Authentic Enterprise EHR Chrome */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-border/70 bg-card/60 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-xs font-semibold tracking-tight text-foreground">
              AAROGYA MITHRA EHR
            </span>
          </div>
          <span className="hidden sm:inline text-xs text-muted-foreground/60">•</span>
          <span className="hidden sm:inline text-xs text-muted-foreground">
            General Medicine OPD — Consultation Suite 04
          </span>
          <Badge variant="outline" size="sm" className="hidden lg:inline-flex text-[11px] font-mono">
            Encrypted In-Memory Buffer
          </Badge>
        </div>

        {/* Tab Module Switcher */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/50 self-start md:self-auto overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setActiveTab("scribe")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0",
              activeTab === "scribe"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Mic className="size-3.5 text-accent shrink-0" />
            <span>Ambient Scribe</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0",
              activeTab === "reports"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FileText className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Lab OCR & Biomarkers</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("safety")}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all shrink-0",
              activeTab === "safety"
                ? "bg-card text-foreground shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Prescription Safety</span>
          </button>
        </div>
      </div>

      {/* Patient Master Encounter Banner */}
      <div className="border-b border-border/70 bg-card/40 px-4 py-3 sm:px-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
          {/* Patient Bio & UHID */}
          <div className="flex items-start sm:items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-sm shrink-0 border border-teal-500/20">
              RK
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-foreground text-sm">Rajesh Kumar</span>
                <span className="text-xs text-muted-foreground font-mono">54y / Male</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">
                  UHID: AM-2026-94021
                </span>
                <Badge variant="teal" size="sm">OPD Regular</Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1">
                <span className="text-muted-foreground">
                  Comorbidities: <strong className="text-foreground">Type 2 DM, HTN</strong>
                </span>
                <span className="text-muted-foreground/60">•</span>
                <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
                  <ShieldAlert className="size-3.5 shrink-0" />
                  Known Allergy: Penicillin (Severe Anaphylaxis)
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Vital Signs Bar */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium pt-1 lg:pt-0">
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 shadow-2xs">
              <span className="text-muted-foreground">BP:</span>
              <strong className="text-foreground font-mono">138/88</strong>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Stage 1</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 shadow-2xs">
              <span className="text-muted-foreground">Pulse:</span>
              <strong className="text-foreground font-mono">76</strong>
              <span className="text-[10px] text-muted-foreground">bpm</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 shadow-2xs">
              <span className="text-muted-foreground">SpO₂:</span>
              <strong className="text-foreground font-mono">98%</strong>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">RA</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 shadow-2xs">
              <span className="text-muted-foreground">RBS:</span>
              <strong className="text-amber-700 dark:text-amber-300 font-mono">178</strong>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">Elevated</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/80 px-2.5 py-1.5 shadow-2xs">
              <span className="text-muted-foreground">eGFR:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono">&gt;85</strong>
              <span className="text-[10px] text-muted-foreground">mL/min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Clinical Split View */}
      <div className="grid gap-0 lg:grid-cols-12 min-h-[500px]">
        {/* Left Column: Clinical Encounter / Data Stream */}
        <div className="border-b lg:border-b-0 lg:border-r border-border/70 p-4 sm:p-5 lg:col-span-6 space-y-4 bg-muted/20">
          {activeTab === "scribe" && (
            <div className="space-y-4">
              {/* Telemetry Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/70 p-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <span className="relative flex size-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Ambient Microphone Feed Active
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      Beamforming OPD Array • 16 kHz PCM • Zero Cloud Audio Storage
                    </span>
                  </div>
                </div>

                {/* Vernacular Language Switcher */}
                <div className="flex items-center gap-1 rounded-lg bg-muted/80 p-0.5 border border-border/60">
                  <Languages className="size-3 text-muted-foreground ml-1.5" />
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("kannada")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                      selectedLanguage === "kannada"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    ಕನ್ನಡ (Kannada)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedLanguage("hindi")}
                    className={cn(
                      "px-2 py-0.5 rounded text-[11px] font-semibold transition-colors",
                      selectedLanguage === "hindi"
                        ? "bg-card text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    हिंदी (Hindi)
                  </button>
                </div>
              </div>

              {/* Consultation Dialogue Feed */}
              <div className="space-y-3 font-sans text-xs">
                {selectedLanguage === "kannada" ? (
                  <>
                    {/* Patient Turn 1 */}
                    <div className="rounded-xl border border-border/80 bg-card/85 p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-teal-500" />
                          Patient (Kannada)
                        </span>
                        <span className="font-mono text-[10px]">00:15</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed font-normal">
                        &quot;ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ತೀವ್ರ ಹೊಟ್ಟೆ ನೋವು ಇದೆ ಡಾಕ್ಟರೇ, ಊಟ ಮಾಡಿದ ಮೇಲೆ ಎದೆಯುರಿ ಜಾಸ್ತಿ ಆಗುತ್ತೆ.&quot;
                      </p>
                      <div className="rounded-md bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[11px] text-teal-800 dark:text-teal-200">
                        <strong className="font-semibold text-teal-700 dark:text-teal-300">Clinical English:</strong> Severe burning epigastric discomfort x 3 days, exacerbated postprandially with heartburn.
                      </div>
                    </div>

                    {/* Doctor Turn */}
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Stethoscope className="size-3.5 text-accent" />
                          Dr. Anika Rao (MD)
                        </span>
                        <span className="font-mono text-[10px]">00:42</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed">
                        &quot;ನೀವು ಬೆಳಿಗ್ಗೆ ಮೆಟ್‌ಫಾರ್ಮಿನ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ? ವಾಂತಿ ಅಥವಾ ತಲೆಸುತ್ತು ಇದೆಯಾ?&quot;
                      </p>
                    </div>

                    {/* Patient Turn 2 */}
                    <div className="rounded-xl border border-border/80 bg-card/85 p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-teal-500" />
                          Patient (Kannada + English)
                        </span>
                        <span className="font-mono text-[10px]">01:10</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed">
                        &quot;ವಾಂತಿ ಇಲ್ಲ ಡಾಕ್ಟರೇ. Metformin regular ಆಗಿ ತಗೊಳ್ತಿದ್ದೀನಿ, ಆದರೆ ನೋವು ತಡೆಯೋಕೆ ಆಗ್ತಿಲ್ಲ.&quot;
                      </p>
                      <div className="rounded-md bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[11px] text-teal-800 dark:text-teal-200">
                        <strong className="font-semibold text-teal-700 dark:text-teal-300">Clinical English:</strong> Vomiting denied (Negated). Compliant with daily Metformin. Epigastric pain persistent.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Patient Turn Hindi */}
                    <div className="rounded-xl border border-border/80 bg-card/85 p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-teal-500" />
                          Patient (Hindi)
                        </span>
                        <span className="font-mono text-[10px]">00:15</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed">
                        &quot;डॉक्टर साहब, तीन दिन से पेट के ऊपरी हिस्से में बहुत जलन और दर्द है, खाना खाने के बाद बढ़ जाता है।&quot;
                      </p>
                      <div className="rounded-md bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[11px] text-teal-800 dark:text-teal-200">
                        <strong className="font-semibold text-teal-700 dark:text-teal-300">Clinical English:</strong> Burning epigastric pain x 3 days, worsens postprandially with pyrosis.
                      </div>
                    </div>

                    {/* Doctor Turn Hindi */}
                    <div className="rounded-xl border border-border/60 bg-muted/40 p-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <Stethoscope className="size-3.5 text-accent" />
                          Dr. Anika Rao (MD)
                        </span>
                        <span className="font-mono text-[10px]">00:40</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed">
                        &quot;क्या आपको उल्टी या चक्कर आ रहे हैं? मेटफॉर्मिन नियमित ले रहे हैं?&quot;
                      </p>
                    </div>

                    {/* Patient Turn 2 Hindi */}
                    <div className="rounded-xl border border-border/80 bg-card/85 p-3.5 space-y-1.5 shadow-2xs">
                      <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                        <span className="font-semibold text-foreground flex items-center gap-1.5">
                          <span className="size-1.5 rounded-full bg-teal-500" />
                          Patient (Hindi)
                        </span>
                        <span className="font-mono text-[10px]">01:05</span>
                      </div>
                      <p className="text-foreground text-xs leading-relaxed">
                        &quot;उल्टी नहीं है। दवा समय पर ले रहा हूँ पर जलन कम नहीं हो रही।&quot;
                      </p>
                      <div className="rounded-md bg-teal-500/10 border border-teal-500/20 px-2.5 py-1.5 text-[11px] text-teal-800 dark:text-teal-200">
                        <strong className="font-semibold text-teal-700 dark:text-teal-300">Clinical English:</strong> Emesis absent. Metformin compliance confirmed. Dyspeptic pain persisting.
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Verified Clinical Entities Extraction Bar */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Extracted Clinical Findings (ICD-10 & SNOMED CT)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:text-teal-200">
                    Epigastric Distress <span className="font-mono text-[10px] opacity-75">(R10.13)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-teal-500/15 border border-teal-500/30 px-2 py-0.5 text-[11px] font-medium text-teal-800 dark:text-teal-200">
                    Pyrosis / Heartburn <span className="font-mono text-[10px] opacity-75">(R12)</span>
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200">
                    <Check className="size-3" /> Vomiting Denied
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Duration: 3 Days
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-card border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Rx Adherence: Metformin
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                    Diagnostic Lab Report Integration
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Thyrocare Diagnostic Services • Sample ID: TC-849201
                  </span>
                </div>
                <Badge variant="teal" size="sm">OCR Confidence: 99.1%</Badge>
              </div>

              {/* Authentic Lab Value Grid */}
              <div className="rounded-xl border border-border bg-card/90 overflow-hidden shadow-2xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-muted/60 border-b border-border text-[11px] text-muted-foreground uppercase font-semibold">
                    <tr>
                      <th className="p-2.5">Biomarker / Assay</th>
                      <th className="p-2.5">Result</th>
                      <th className="p-2.5">Biological Reference</th>
                      <th className="p-2.5">Clinical Evaluation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    <tr className="bg-amber-500/5">
                      <td className="p-2.5 font-medium text-foreground">HbA1c (Glycated Hemoglobin)</td>
                      <td className="p-2.5 font-bold font-mono text-amber-700 dark:text-amber-300">9.2 %</td>
                      <td className="p-2.5 text-muted-foreground font-mono">&lt; 5.7 %</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Poor Control (Prior: 7.8%)
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-amber-500/5">
                      <td className="p-2.5 font-medium text-foreground">Fasting Blood Sugar (FBS)</td>
                      <td className="p-2.5 font-bold font-mono text-amber-700 dark:text-amber-300">182 mg/dL</td>
                      <td className="p-2.5 text-muted-foreground font-mono">70 – 100 mg/dL</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                          Marked Hyperglycemia
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">Serum Creatinine</td>
                      <td className="p-2.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">0.92 mg/dL</td>
                      <td className="p-2.5 text-muted-foreground font-mono">0.7 – 1.3 mg/dL</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Normal Kidney Function
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium text-foreground">eGFR (CKD-EPI 2021)</td>
                      <td className="p-2.5 font-bold font-mono text-emerald-600 dark:text-emerald-400">&gt; 85 mL/min</td>
                      <td className="p-2.5 text-muted-foreground font-mono">&gt; 60 mL/min</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                          Metformin Safe
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-900 dark:text-teal-100 flex items-start gap-2.5">
                <Sparkles className="size-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Longitudinal Context Synthesis:</strong> HbA1c has worsened from 7.8% (Aug 2026) to 9.2%. Patient requires antidiabetic regimen intensification once acute epigastric symptoms subside.
                </p>
              </div>
            </div>
          )}

          {activeTab === "safety" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                    Prescription Safety & Interaction Matrix
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Real-time verification against CDSCO, BNF & FDA Drug Databases
                  </span>
                </div>
                <Badge variant="success" size="sm">0 Safety Alerts Pending</Badge>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* Allergy Screen */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Patient Allergy Screen: PASSED</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Patient has documented severe allergy to Penicillin. Proposed medications (Pantoprazole, Metformin) share zero beta-lactam core structures.
                    </p>
                  </div>
                </div>

                {/* Drug-Drug Interaction Screen */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Drug-Drug Interaction Screen: PASSED</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Pantoprazole 40 mg + Metformin 500 mg: No significant pharmacokinetic interference or CYP2C19 competitive inhibition.
                    </p>
                  </div>
                </div>

                {/* Renal Organ Safety */}
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-3">
                  <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-foreground">Renal Safety & Dosing Threshold: PASSED</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Calculated eGFR &gt;85 mL/min/1.73m² safely clears standard Metformin dosing (contraindicated only if eGFR &lt;30 mL/min).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Structured EMR SOAP Note & Prescription */}
        <div className="p-4 sm:p-5 lg:col-span-6 flex flex-col justify-between space-y-4 bg-card/90">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/60">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-foreground block">
                  Encounter Note (SOAP Structure)
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Generated from Ambient Capture • Awaiting Clinician Sign-off
                </span>
              </div>
              <Badge variant={noteApproved ? "success" : "warning"} dot pulse={!noteApproved} size="sm">
                {noteApproved ? "Digitally Signed & Committed" : "Draft Advisory"}
              </Badge>
            </div>

            {/* Authentic Clinical SOAP Fields */}
            <div className="space-y-3 text-xs leading-relaxed">
              {/* Subjective */}
              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground text-[11px] tracking-wide uppercase">
                    Subjective (S)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Chief Complaints</span>
                </div>
                <p className="text-foreground/90 text-[11px]">
                  54-year-old male with known T2DM and hypertension presents with severe burning epigastric discomfort x 3 days, aggravated 30-45 minutes after meals. Denies hematemesis, melena, vomiting, or dyspnea. Current medications: Metformin 500 mg BD, Telmisartan 40 mg OD.
                </p>
              </div>

              {/* Objective */}
              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground text-[11px] tracking-wide uppercase">
                    Objective (O)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">Physical & Lab</span>
                </div>
                <p className="text-foreground/90 text-[11px]">
                  Vitals: BP 138/88 mmHg, HR 76 regular, SpO₂ 98% room air. Abdominal Exam: Soft, localized epigastric tenderness on deep palpation, no guarding or rebound rigidity. Lab Review: Fasting Glucose 182 mg/dL, HbA1c 9.2%, Serum Creatinine 0.92 mg/dL.
                </p>
              </div>

              {/* Assessment */}
              <div className="rounded-lg border border-border/70 bg-background/60 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground text-[11px] tracking-wide uppercase">
                    Assessment (A)
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">ICD-10 Differential</span>
                </div>
                <div className="space-y-1 text-[11px] text-foreground/90">
                  <div className="flex items-center justify-between">
                    <span>1. Acute Dyspepsia / Gastroesophageal Reflux Disease</span>
                    <span className="font-mono text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded">
                      ICD-10: K21.9
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>2. Type 2 Diabetes Mellitus, Suboptimally Controlled</span>
                    <span className="font-mono text-[10px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-500/10 px-1.5 py-0.5 rounded">
                      ICD-10: E11.65
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan & Structured Prescription Table */}
              <div className="rounded-lg border border-border/70 bg-background/60 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground text-[11px] tracking-wide uppercase">
                    Plan & Medication Orders (P)
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ Verified Allergy Safe
                  </span>
                </div>

                <div className="rounded-md border border-border bg-card overflow-hidden">
                  <table className="w-full text-[11px] text-left">
                    <thead className="bg-muted/50 border-b border-border text-[10px] text-muted-foreground uppercase">
                      <tr>
                        <th className="p-2">Medication</th>
                        <th className="p-2">Dosage & Regimen</th>
                        <th className="p-2">Duration</th>
                        <th className="p-2">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="p-2 font-medium text-foreground">
                          Tab. Pantoprazole 40 mg
                        </td>
                        <td className="p-2 font-mono">1 - 0 - 0</td>
                        <td className="p-2 text-muted-foreground">14 Days</td>
                        <td className="p-2 text-muted-foreground">30 min before breakfast</td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium text-foreground">
                          Tab. Metformin HCl 500 mg
                        </td>
                        <td className="p-2 font-mono">1 - 0 - 1</td>
                        <td className="p-2 text-muted-foreground">Continue</td>
                        <td className="p-2 text-muted-foreground">Post meals (breakfast & dinner)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="text-[10px] text-muted-foreground leading-normal pt-0.5">
                  <strong>Advice:</strong> Avoid late-night eating, caffeine, and NSAIDs. Diabetes clinic follow-up in 2 weeks with repeat fasting glucose.
                </p>
              </div>
            </div>
          </div>

          {/* Clinician Signature & Governance Action Bar */}
          <div className="pt-3 border-t border-border/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <span className="font-medium text-foreground block text-[11px]">
                  Dr. Anika Rao, MBBS, MD
                </span>
                <span className="text-[10px] font-mono">
                  KMC Reg #74921 • NMC India
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                leftIcon={copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                className="text-xs"
              >
                {copied ? "Copied" : "Copy Note"}
              </Button>
              <Button
                variant={noteApproved ? "outline" : "teal"}
                size="sm"
                onClick={() => setNoteApproved(!noteApproved)}
                leftIcon={noteApproved ? <CheckCircle2 className="size-3.5 text-emerald-600" /> : <FileCheck2 className="size-3.5" />}
                className={cn("text-xs font-semibold", noteApproved && "border-emerald-500/50 text-emerald-700 dark:text-emerald-300")}
              >
                {noteApproved ? "Signed (KMC-74921)" : "Digitally Sign & Commit"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
