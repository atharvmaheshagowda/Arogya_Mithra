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
  Download,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  Languages,
  Mic,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  Users,
  Volume2,
  Workflow,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard, ClinicalCalloutCard } from "@/components/ui/card";
import { Input, SearchInput } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/navigation";
import { InteractiveWorkflowSection } from "@/components/landing/interactive-workflow-section";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/* ==========================================================================
   1. DASHBOARD PAGE
   ========================================================================== */

export function DashboardPage() {
  const navigate = useNavigate();
  const { doctor } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-eyebrow">Doctor-Led Clinical Intelligence</span>
            <Badge variant="teal" size="sm" dot pulse>
              Live OPD Session • Room 04
            </Badge>
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Good morning, {doctor?.name || "Doctor"}.
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {doctor?.clinic} • {doctor?.department}. Every AAROGYA MITHRA output remains a draft until you review and approve it.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate("/app/patients")}
            leftIcon={<Users className="size-4" />}
          >
            Patient Queue (28)
          </Button>
          <Button
            variant="teal"
            size="md"
            onClick={() => navigate("/app/consultations")}
            rightIcon={<ArrowRight className="size-4" />}
          >
            Start Consultation
          </Button>
        </div>
      </div>

      {/* OPD Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Patients Today"
          value="28"
          subtitle="18 completed, 10 waiting"
          icon={Users}
          trend={{ value: "+15%", isPositive: true }}
        />
        <MetricCard
          label="Active Consultations"
          value="1"
          subtitle="Room 04 (General Medicine)"
          icon={Activity}
          badge={<Badge variant="teal" size="sm" dot>Listening Active</Badge>}
        />
        <MetricCard
          label="Reports to Review"
          value="6"
          subtitle="4 labs, 2 prescriptions"
          icon={FileText}
          badge={<Badge variant="warning" size="sm">Review Pending</Badge>}
        />
        <MetricCard
          label="Safety Checks"
          value="100%"
          subtitle="Zero unverified alerts"
          icon={ShieldCheck}
          badge={<Badge variant="success" size="sm">All Clear</Badge>}
        />
      </div>

      {/* Clinical Copilot Status Callout */}
      <ClinicalCalloutCard
        variant="teal"
        title="Multilingual Clinical Copilot: Active"
        icon={Sparkles}
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="xs"
              onClick={() => navigate("/app/consultations")}
            >
              Open Consultation Scribe
            </Button>
            <Button
              variant="subtle"
              size="xs"
              onClick={() => navigate("/app/settings")}
            >
              Language Preferences
            </Button>
          </div>
        }
      >
        AAROGYA MITHRA is calibrated for Kannada, Hindi, and Indian English code-mixing. Extracted symptoms and prescribed molecules are automatically cross-checked against documented patient allergies and hospital formularies.
      </ClinicalCalloutCard>

      {/* Core Clinical Modules Quick Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Core Clinical Modules</CardTitle>
              <CardDescription className="mt-1">
                Access the four evidence-grounded capabilities engineered for Indian outpatient departments.
              </CardDescription>
            </div>
            <Badge variant="navy">v0.1 Prototype</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "1. LISTEN",
                module: "Consultation Scribe",
                desc: "Multilingual ambient speech capture in Kannada, Hindi, and English.",
                path: "/app/consultations",
                badge: "Active Scribe",
                icon: Mic,
              },
              {
                title: "2. READ",
                module: "Report Intelligence",
                desc: "OCR extraction for external lab PDFs, scans, and handwritten prescriptions.",
                path: "/app/reports",
                badge: "6 New Labs",
                icon: FileSearch,
              },
              {
                title: "3. CONNECT",
                module: "Patient Context",
                desc: "Longitudinal patient timeline with cross-encounter conflict detection.",
                path: "/app/patients",
                badge: "28 Enrolled",
                icon: Users,
              },
              {
                title: "4. SAFEGUARD",
                module: "Medication Safety",
                desc: "Deterministic drug interaction, allergy gating, and evidence references.",
                path: "/app/medication-safety",
                badge: "All Clear",
                icon: ShieldCheck,
              },
            ].map((item) => (
              <div
                key={item.title}
                onClick={() => navigate(item.path)}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm cursor-pointer"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-xl bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                      <item.icon className="size-4.5" />
                    </span>
                    <Badge variant="teal" size="sm">{item.badge}</Badge>
                  </div>
                  <div>
                    <span className="font-mono text-[10px] font-bold text-accent">{item.title}</span>
                    <h4 className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                      {item.module}
                    </h4>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
                <div className="pt-3 mt-3 border-t border-border/70 flex items-center justify-between text-xs font-semibold text-accent">
                  <span>Open Module</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ==========================================================================
   2. PATIENTS PAGE (CONNECT Module)
   ========================================================================== */

export function PatientsPage() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const patients = [
    {
      mrn: "AM-94021",
      name: "Rajesh Kumar",
      age: 54,
      gender: "Male",
      conditions: ["Type 2 Diabetes", "Hypertension"],
      allergy: "Penicillin (Severe)",
      lastVisit: "Today (Room 04)",
      vitals: "BP: 138/88 • Glucose: 178 mg/dL",
      language: "Kannada / English",
      status: "In Consultation",
      statusVariant: "teal" as const,
    },
    {
      mrn: "AM-93112",
      name: "Lakshmi Gowda",
      age: 48,
      gender: "Female",
      conditions: ["Hypothyroidism", "Dyslipidemia"],
      allergy: "None documented",
      lastVisit: "10-Nov-2026",
      vitals: "BP: 122/80 • TSH: 4.8 mIU/L",
      language: "Kannada",
      status: "Waiting (Token #11)",
      statusVariant: "warning" as const,
    },
    {
      mrn: "AM-91048",
      name: "Mohammad Farooq",
      age: 62,
      gender: "Male",
      conditions: ["Coronary Artery Disease", "Stage 2 CKD"],
      allergy: "Aspirin (Bronchospasm)",
      lastVisit: "02-Nov-2026",
      vitals: "BP: 144/92 • Creatinine: 1.4 mg/dL",
      language: "Hindi / Urdu",
      status: "Waiting (Token #12)",
      statusVariant: "warning" as const,
    },
    {
      mrn: "AM-89412",
      name: "Ananya Sharma",
      age: 29,
      gender: "Female",
      conditions: ["Migraine with Aura", "Allergic Rhinitis"],
      allergy: "Sulfa drugs",
      lastVisit: "28-Oct-2026",
      vitals: "BP: 116/74 • SpO2: 99%",
      language: "Hindi / English",
      status: "Completed",
      statusVariant: "success" as const,
    },
  ].filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.mrn.toLowerCase().includes(search.toLowerCase()) ||
      p.conditions.some((c) => c.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Patient Context Panel</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            28 registered OPD patients today • Cross-encounter history &amp; allergy records
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <SearchInput
              placeholder="Filter by name, MRN, condition..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClear={() => setSearch("")}
            />
          </div>
          <Button variant="teal" size="sm" leftIcon={<Plus className="size-4" />}>
            Add Patient
          </Button>
        </div>
      </div>

      {/* Patient Table */}
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {patients.map((patient) => (
            <div
              key={patient.mrn}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-start gap-3.5">
                <span className="grid size-11 place-items-center rounded-xl bg-accent/15 text-accent font-bold text-sm shrink-0">
                  {patient.name.split(" ").map((n) => n[0]).join("")}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{patient.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">#{patient.mrn}</span>
                    <span className="text-xs text-muted-foreground">• {patient.age}y, {patient.gender}</span>
                    <Badge variant={patient.statusVariant} size="sm">
                      {patient.status}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Conditions: {patient.conditions.join(", ")}</span>
                    <span>•</span>
                    <span className={cn(patient.allergy !== "None documented" && "text-destructive font-medium")}>
                      Allergy: {patient.allergy}
                    </span>
                  </div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-3 pt-0.5">
                    <span>Vitals: {patient.vitals}</span>
                    <span>•</span>
                    <span>Language: {patient.language}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/app/consultations")}
                >
                  Open Chart
                </Button>
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => navigate("/app/consultations")}
                  rightIcon={<ArrowRight className="size-3.5" />}
                >
                  Consult Scribe
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ==========================================================================
   3. CONSULTATIONS PAGE (LISTEN Module)
   ========================================================================== */

export function ConsultationsPage() {
  const [isRecording, setIsRecording] = useState(true);
  const [selectedLang, setSelectedLang] = useState<"kannada" | "hindi" | "english">("kannada");
  const [noteApproved, setNoteApproved] = useState(false);

  return (
    <div className="space-y-6">
      {/* Patient Encounter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground font-bold text-sm">
            RK
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground text-sm">Rajesh Kumar</span>
              <span className="text-xs text-muted-foreground font-mono">54y M • #AM-94021</span>
              <Badge variant="teal" size="sm">Encounter #442</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Room 04 • Attending: Dr. Anika Rao • Known: Type 2 Diabetes, HTN • <span className="text-destructive font-medium">Penicillin Allergy</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={isRecording ? "teal" : "default"} dot pulse={isRecording}>
            {isRecording ? "Ambient Mic Active" : "Recording Paused"}
          </Badge>
          <Button
            variant={isRecording ? "outline" : "teal"}
            size="sm"
            onClick={() => setIsRecording(!isRecording)}
          >
            {isRecording ? "Pause Scribe" : "Resume Scribe"}
          </Button>
        </div>
      </div>

      {/* Main 2-Column Split: Scribe on Left, Draft SOAP on Right */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Scribe & Audio Transcription */}
        <Card className="lg:col-span-6 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Mic className="size-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Ambient Dialogue Stream (LISTEN)
              </span>
            </div>

            {/* Language Selector */}
            <div className="flex gap-1 bg-muted p-1 rounded-lg text-xs">
              {(["kannada", "hindi", "english"] as const).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => setSelectedLang(lang)}
                  className={cn(
                    "px-2.5 py-0.5 rounded capitalize font-medium transition-colors",
                    selectedLang === lang ? "bg-card text-foreground font-semibold shadow-xs" : "text-muted-foreground",
                  )}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          {/* Waveform Visualizer */}
          <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Dual-channel array active</span>
              <span className="font-mono">03:42 / 05:00</span>
            </div>
            <div className="flex items-center gap-1 h-5 px-1">
              {[30, 60, 90, 40, 80, 50, 70, 95, 30, 40, 85, 90, 45, 65, 80, 50, 30, 70, 85, 40].map((h, i) => (
                <span
                  key={i}
                  style={{ height: `${h}%` }}
                  className="w-1.5 rounded-full bg-accent/60 transition-all duration-300"
                />
              ))}
            </div>
          </div>

          {/* Transcript Feed */}
          <div className="space-y-3 max-h-72 overflow-y-auto text-xs">
            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-bold text-foreground">Patient (Kannada)</span>
                <span>00:12</span>
              </div>
              <p className="text-foreground leading-relaxed">
                &quot;ನನಗೆ ಮೂರು ದಿನಗಳಿಂದ ತೀವ್ರ ಹೊಟ್ಟೆ ಉರಿ ಮತ್ತು ಎದೆಬಡಿತ ಜಾಸ್ತಿ ಆಗ್ತಿದೆ. ರಾತ್ರಿ ಊಟ ಆದ್ಮೇಲೆ ಮಲಗೋಕೆ ಆಗ್ತಿಲ್ಲ.&quot;
              </p>
              <p className="text-accent text-[11px] font-medium">
                [Clinical translation]: Severe epigastric burning x 3 days, aggravated by meals with heartburn.
              </p>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/40 p-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-bold text-foreground">Dr. Anika Rao</span>
                <span>00:35</span>
              </div>
              <p className="text-foreground leading-relaxed">
                &quot;ನೀವು ಬೆಳಿಗ್ಗೆ ಮೆಟ್‌ಫಾರ್ಮಿನ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತಿದ್ದೀರಾ? ವಾಂತಿ ಅಥವಾ ತಲೆಸುತ್ತು ಇದೆಯಾ?&quot;
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-3 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="font-bold text-foreground">Patient (Kannada + English)</span>
                <span>01:05</span>
              </div>
              <p className="text-foreground leading-relaxed">
                &quot;ವಾಂತಿ ಇಲ್ಲ ಡಾಕ್ಟರೇ. Metformin regular ಆಗಿ ತಗೊಳ್ತಿದ್ದೀನಿ, ಆದರೆ ನೋವು ತಡೆಯೋಕೆ ಆಗ್ತಿಲ್ಲ.&quot;
              </p>
              <p className="text-accent text-[11px] font-medium">
                [Clinical translation]: No vomiting (Negated). Compliant with Metformin. Pain is persistent.
              </p>
            </div>
          </div>

          {/* Detected Concepts */}
          <div className="space-y-1.5 pt-2 border-t border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Extracted Clinical Entities
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="teal" size="sm">Epigastric Pain (R10.13)</Badge>
              <Badge variant="navy" size="sm">Heartburn (R12)</Badge>
              <Badge variant="outline" size="sm">Duration: 3 Days</Badge>
              <Badge variant="success" size="sm">Vomiting: Negated</Badge>
              <Badge variant="teal" size="sm">Metformin 500mg Compliant</Badge>
            </div>
          </div>
        </Card>

        {/* Right Column: Draft SOAP Clinical Note */}
        <Card className="lg:col-span-6 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-accent" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Draft SOAP Clinical Note
              </span>
            </div>
            <Badge variant={noteApproved ? "success" : "warning"} dot size="sm">
              {noteApproved ? "Signed as Dr. Anika Rao" : "Draft Advisory"}
            </Badge>
          </div>

          {/* Note Editor Surface */}
          <div className="rounded-xl border border-border bg-muted/20 p-4 font-sans text-xs space-y-3 leading-relaxed">
            <div>
              <strong className="text-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                Subjective (S)
              </strong>
              <p className="text-muted-foreground">
                54-year-old male with known T2D and HTN presents with severe burning epigastric discomfort x 3 days, worse postprandially. Denies vomiting, fever, or melena. Compliant with Metformin and Telmisartan.
              </p>
            </div>

            <div>
              <strong className="text-foreground uppercase text-[10px] tracking-wider block mb-0.5">
                Objective (O)
              </strong>
              <p className="text-muted-foreground">
                BP: 138/88 mmHg, HR 76 bpm. Abdomen: Soft, mild epigastric tenderness, no guarding. HbA1c: 9.2% (elevated from 7.8%).
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
                Plan &amp; Prescription (P)
              </strong>
              <div className="mt-1 space-y-1 font-mono text-[11px] text-foreground bg-card p-2 rounded-lg border border-border">
                <p>• Tab. Pantoprazole 40 mg — 1 tab OD before breakfast x 14 days</p>
                <p>• Continue Tab. Metformin 500 mg — 1 tab BD after meals</p>
                <p>• Advice: Avoid spicy food, recheck fasting sugar next week</p>
              </div>
            </div>
          </div>

          {/* Sign off and export */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-4 text-accent" />
              <span>Doctor review required before EMR commit</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Copy className="size-3.5" />}
                onClick={() => alert("SOAP note copied to clipboard!")}
              >
                Copy
              </Button>
              <Button
                variant={noteApproved ? "outline" : "teal"}
                size="sm"
                onClick={() => setNoteApproved(!noteApproved)}
                leftIcon={noteApproved ? <Check className="size-3.5" /> : <FileCheck2 className="size-3.5" />}
              >
                {noteApproved ? "Approved & Signed" : "Approve & Sign Note"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ==========================================================================
   4. REPORTS PAGE (READ Module)
   ========================================================================== */

export function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState("thyrocare");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Medical Report Intelligence (READ)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            OCR entity extraction, numerical value normalization, and reference interval verification
          </p>
        </div>

        <Button variant="teal" size="sm" leftIcon={<Upload className="size-4" />}>
          Upload New Report
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left: Document List */}
        <Card className="lg:col-span-5 p-5 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ingested Reports Queue (6)
          </span>

          <div className="space-y-2">
            {[
              {
                id: "thyrocare",
                title: "Thyrocare Metabolic Profile",
                patient: "Rajesh Kumar (54y M)",
                date: "10-Nov-2026",
                status: "OCR Complete",
                confidence: "98.4%",
              },
              {
                id: "lal-path",
                title: "Lal PathLabs Lipid & Renal Panel",
                patient: "Mohammad Farooq (62y M)",
                date: "08-Nov-2026",
                status: "OCR Complete",
                confidence: "99.1%",
              },
              {
                id: "manipal-rx",
                title: "Handwritten Cardiology Rx Scan",
                patient: "Lakshmi Gowda (48y F)",
                date: "04-Nov-2026",
                status: "Manual Check Needed",
                confidence: "92.0%",
              },
            ].map((rep) => (
              <div
                key={rep.id}
                onClick={() => setSelectedReport(rep.id)}
                className={cn(
                  "p-3 rounded-xl border text-left cursor-pointer transition-all space-y-1",
                  selectedReport === rep.id
                    ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                    : "border-border hover:bg-muted/30",
                )}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">{rep.title}</span>
                  <Badge variant={rep.status.includes("Complete") ? "teal" : "warning"} size="sm">
                    {rep.status}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">{rep.patient} • {rep.date}</p>
                <p className="text-[10px] text-accent font-mono font-semibold">Confidence: {rep.confidence}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Right: Extracted Biomarker Inspector */}
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div>
              <h3 className="font-semibold text-sm text-foreground">Thyrocare Metabolic Profile (Verified PDF)</h3>
              <p className="text-xs text-muted-foreground">Patient: Rajesh Kumar • Specimen: Serum • 10-Nov-2026</p>
            </div>
            <Badge variant="teal" size="sm">Confidence: 98.4%</Badge>
          </div>

          {/* Biomarkers Table */}
          <div className="rounded-xl border border-border overflow-hidden text-xs">
            <div className="grid grid-cols-4 bg-muted/50 p-2.5 font-bold uppercase text-[10px] text-muted-foreground">
              <span>Test Parameter</span>
              <span>Observed Result</span>
              <span>Biological Ref.</span>
              <span className="text-right">Interpretation</span>
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-4 p-3 items-center bg-warning/5">
                <span className="font-semibold text-foreground">HbA1c</span>
                <span className="font-mono text-warning font-bold">9.2%</span>
                <span className="text-muted-foreground text-[11px]">&lt; 5.7%</span>
                <span className="text-right">
                  <Badge variant="warning" size="sm">High (Poor Control)</Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 p-3 items-center bg-warning/5">
                <span className="font-semibold text-foreground">Fasting Blood Sugar</span>
                <span className="font-mono text-warning font-bold">182 mg/dL</span>
                <span className="text-muted-foreground text-[11px]">70 - 100</span>
                <span className="text-right">
                  <Badge variant="warning" size="sm">Elevated</Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 p-3 items-center">
                <span className="font-semibold text-foreground">Serum Creatinine</span>
                <span className="font-mono text-foreground">0.92 mg/dL</span>
                <span className="text-muted-foreground text-[11px]">0.7 - 1.2</span>
                <span className="text-right">
                  <Badge variant="success" size="sm">Normal</Badge>
                </span>
              </div>
              <div className="grid grid-cols-4 p-3 items-center">
                <span className="font-semibold text-foreground">eGFR (CKD-EPI)</span>
                <span className="font-mono text-success font-bold">&gt;85 mL/min</span>
                <span className="text-muted-foreground text-[11px]">&gt;60</span>
                <span className="text-right">
                  <Badge variant="success" size="sm">Normal</Badge>
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-accent/25 bg-accent/5 p-3 text-xs text-muted-foreground flex items-center justify-between">
            <span>Synthesized into Patient Context Timeline automatically.</span>
            <Button variant="outline" size="xs" leftIcon={<Download className="size-3" />}>
              Download Clean CSV
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ==========================================================================
   5. MEDICATION SAFETY PAGE (SAFEGUARD Module)
   ========================================================================== */

export function MedicationSafetyPage() {
  const [testDrug, setTestDrug] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Medication Safeguard Engine (SAFEGUARD)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deterministic drug-drug interaction matrix, allergy conflict gating, and CDSCO/BNF evidence verification
          </p>
        </div>

        <Badge variant="success" size="md">
          Active Safety Rules: 14,280 molecules
        </Badge>
      </div>

      {/* Safety Interceptor Cards */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        <Card className="lg:col-span-7 p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">
              Current Patient Regimen Audit (Rajesh Kumar)
            </span>
            <Badge variant="teal" size="sm">Real-time Gated</Badge>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-destructive flex items-center gap-1.5">
                  <AlertCircle className="size-4" />
                  Allergy Conflict Intercepted: Beta-Lactam Class
                </span>
                <Badge variant="danger" size="sm">Hard Stop Warning</Badge>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Patient has a recorded severe anaphylactoid/cutaneous rash allergy to <strong>Penicillin &amp; Amoxicillin</strong> (Jan 2025). Attempted prescription of Amoxicillin-Clavulanate was blocked.
              </p>
              <div className="rounded-lg bg-card p-2 text-[11px] font-mono text-muted-foreground border border-border">
                Approved Alternative: Azithromycin 500mg OD x 3 days (Macrolide group).
              </div>
            </div>

            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-warning flex items-center gap-1.5">
                  <AlertTriangle className="size-4" />
                  Drug-Drug Interaction Advisory: Chelation Spacing
                </span>
                <Badge variant="warning" size="sm">Moderate Advisory</Badge>
              </div>
              <p className="text-xs text-foreground/90 leading-relaxed">
                Simultaneous dosing of Fluoroquinolones with oral antacids (Pantoprazole / Magnesium) reduces absorption by ~50%. Space administration by at least 2 hours.
              </p>
            </div>

            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-1">
              <div className="flex items-center gap-2 text-success text-xs font-bold">
                <CheckCircle2 className="size-4" />
                <span>Therapeutic Duplication Screen: Passed</span>
              </div>
              <p className="text-xs text-muted-foreground">
                No redundant PPI, ACE inhibitor, or antidiabetic duplicate regimens detected across all active clinic files.
              </p>
            </div>
          </div>
        </Card>

        {/* Right: Quick Molecule Verifier */}
        <Card className="lg:col-span-5 p-6 space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
            Ad-hoc Pharmacopeia Molecule Lookup
          </span>

          <div className="space-y-3">
            <Input
              placeholder="Type drug name (e.g. Ciprofloxacin, Metformin)..."
              value={testDrug}
              onChange={(e) => setTestDrug(e.target.value)}
            />
            <Button variant="outline" size="sm" className="w-full">
              Run Deterministic Safety Check
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-accent" />
              Evidence Standards
            </span>
            <p className="text-[11px] leading-relaxed">
              Rules grounded in Central Drugs Standard Control Organisation (CDSCO), British National Formulary (BNF), and National Formulary of India (NFI).
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ==========================================================================
   6. WORKFLOW PAGE (Blueprint Component)
   ========================================================================== */

export function WorkflowPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Interactive Clinical Workflow Blueprint</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            End-to-end 8-stage architecture connecting ambient scribing, report ingestion, context timeline, and doctor review
          </p>
        </div>
        <Badge variant="teal">Living Blueprint</Badge>
      </div>

      <InteractiveWorkflowSection />
    </div>
  );
}

/* ==========================================================================
   7. SETTINGS PAGE
   ========================================================================== */

export function SettingsPage() {
  const { doctor } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Workspace Preferences</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure physician identity, OPD department defaults, regional speech models, and safety alert sensitivity
        </p>
      </div>

      <Card className="p-6 space-y-5">
        <h3 className="font-semibold text-sm text-foreground">Physician Profile (Mock Authentication)</h3>
        <div className="grid gap-4 sm:grid-cols-2 text-xs">
          <div>
            <label className="text-muted-foreground uppercase text-[10px] font-bold block mb-1">Doctor Name</label>
            <Input defaultValue={doctor?.name} />
          </div>
          <div>
            <label className="text-muted-foreground uppercase text-[10px] font-bold block mb-1">Email</label>
            <Input defaultValue={doctor?.email} />
          </div>
          <div>
            <label className="text-muted-foreground uppercase text-[10px] font-bold block mb-1">Clinic / Hospital</label>
            <Input defaultValue={doctor?.clinic} />
          </div>
          <div>
            <label className="text-muted-foreground uppercase text-[10px] font-bold block mb-1">Specialty</label>
            <Input defaultValue={doctor?.department} />
          </div>
        </div>
        <Button variant="teal" size="sm">Save Profile Changes</Button>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-semibold text-sm text-foreground">Multilingual Scribe Settings</h3>
        <div className="space-y-2 text-xs text-muted-foreground">
          <label className="flex items-center gap-2 text-foreground cursor-pointer">
            <input type="checkbox" defaultChecked className="size-4 rounded accent-accent" />
            <span>Enable Kannada colloquial speech-to-ICD10 concept translation</span>
          </label>
          <label className="flex items-center gap-2 text-foreground cursor-pointer">
            <input type="checkbox" defaultChecked className="size-4 rounded accent-accent" />
            <span>Enable Hindi / Hinglish clinical entity extraction</span>
          </label>
          <label className="flex items-center gap-2 text-foreground cursor-pointer">
            <input type="checkbox" defaultChecked className="size-4 rounded accent-accent" />
            <span>Preserve negation markers (&quot;no chest pain&quot;, &quot;no fever&quot;)</span>
          </label>
        </div>
      </Card>
    </div>
  );
}
