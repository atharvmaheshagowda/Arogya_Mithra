import { useState, useEffect, useMemo, useRef } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  Info,
  Languages,
  Lock,
  Mic,
  MicOff,
  Pause,
  Pill,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Stethoscope,
  Upload,
  User,
  Users,
  Volume2,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ClinicalCalloutCard,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { useAuth } from "@/lib/auth";
import {
  getPatientById,
  getPatients,
  type PatientProfile,
} from "@/lib/patient-service";
import {
  getConsultationSession,
  type ConsultationSession,
  type SpeechTurn,
  type StructuredClinicalNote,
} from "@/lib/consultation-service";
import { cn } from "@/lib/utils";

type WorkflowState =
  | "started"
  | "recording"
  | "transcribed"
  | "draft_generated"
  | "awaiting_review"
  | "approved";

export function ConsultationWorkspacePage() {
  const { consultationId } = useParams<{ consultationId: string }>();
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const { toast } = useToast();

  // Load session or fallback to CS-101
  const session = useMemo(() => {
    return getConsultationSession(consultationId || "CS-101")!;
  }, [consultationId]);

  // Selected patient from session or patient store
  const [selectedPatientId, setSelectedPatientId] = useState<string>(
    session.patientId || "AM-94021",
  );
  const patient = useMemo(() => {
    return getPatientById(selectedPatientId) || getPatientById("AM-94021")!;
  }, [selectedPatientId]);

  const allPatients = useMemo(() => getPatients(), []);

  // Workflow Progression State
  const [workflowState, setWorkflowState] = useState<WorkflowState>("recording");

  // Audio Recording & Scribe State
  const [isRecording, setIsRecording] = useState(true);
  const [recordingSeconds, setRecordingSeconds] = useState(258); // 04:18
  const [selectedLanguage, setSelectedLanguage] = useState<
    "Kannada" | "Hindi" | "English" | "Code-Mixed"
  >("Code-Mixed");

  // Center Panel View Mode: "stream" | "manual" | "upload"
  const [listenMode, setListenMode] = useState<"stream" | "manual" | "upload">(
    "stream",
  );
  const [manualTranscriptInput, setManualTranscriptInput] = useState("");
  const [transcriptTurns, setTranscriptTurns] = useState<SpeechTurn[]>(
    session.transcript,
  );

  // Right Panel Clinical Note State
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [clinicalNote, setClinicalNote] = useState<StructuredClinicalNote>(
    session.draftNote,
  );

  // Safety Panel Collapse State
  const [isSafetyOpen, setIsSafetyOpen] = useState(true);

  // Active Tab for Mobile Viewports
  const [activeMobilePanel, setActiveMobilePanel] = useState<
    "context" | "listen" | "notes"
  >("listen");

  // Recording Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  // Format Timer string
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Recording Controls
  const handleStartRecording = () => {
    setIsRecording(true);
    setWorkflowState("recording");
    toast.info("Ambient Scribe Active", {
      description: `Listening in ${selectedLanguage}. Dual-channel acoustic array engaged.`,
    });
  };

  const handlePauseRecording = () => {
    setIsRecording(false);
    toast.info("Recording Paused", {
      description: "Audio capture paused. Click resume to continue dialogue.",
    });
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setWorkflowState("transcribed");
    toast.success("Transcription Completed", {
      description: `Captured ${formatTimer(recordingSeconds)} of multilingual dialogue.`,
    });
  };

  const handleResetRecording = () => {
    setIsRecording(false);
    setRecordingSeconds(0);
    setWorkflowState("started");
    toast.info("Scribe Reset", {
      description: "Recording buffer reset. Ready for new consultation.",
    });
  };

  // Generate Structured Clinical Note with AI
  const handleGenerateNote = () => {
    setIsGeneratingNote(true);
    setTimeout(() => {
      setIsGeneratingNote(false);
      setWorkflowState("draft_generated");
      toast.success("Clinical Note Generated", {
        description: "Symptoms, duration, negations, and draft treatment plan extracted.",
      });
      setTimeout(() => {
        setWorkflowState("awaiting_review");
      }, 600);
    }, 1200);
  };

  // Save Draft Note
  const handleSaveDraft = () => {
    setIsEditingNote(false);
    toast.success("Draft Note Saved", {
      description: "Edits stored locally. Remains a draft until doctor signature.",
    });
  };

  // Doctor Approval Sign-off
  const handleApproveNote = () => {
    const doctorName = doctor?.name || "Dr. Anika Rao, MBBS, MD";
    setClinicalNote((prev) => ({
      ...prev,
      status: "Doctor Approved & Signed",
      signedBy: doctorName,
      signedAt: "Just now",
    }));
    setWorkflowState("approved");
    setIsEditingNote(false);
    toast.success("Clinical Note Approved & Signed", {
      description: `Signed by ${doctorName}. Committed to hospital EHR repository.`,
    });
  };

  // Manual Transcript Submission
  const handleManualTranscriptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTranscriptInput.trim()) return;

    const newTurn: SpeechTurn = {
      id: `turn-${Date.now()}`,
      speaker: "doctor",
      speakerName: doctor?.name || "Dr. Anika Rao",
      timestamp: formatTimer(recordingSeconds),
      originalText: manualTranscriptInput,
      language: selectedLanguage,
      translation: manualTranscriptInput,
    };

    setTranscriptTurns((prev) => [...prev, newTurn]);
    setManualTranscriptInput("");
    setListenMode("stream");
    toast.success("Transcript Appended", {
      description: "Manual clinical dictation processed into dialogue stream.",
    });
  };

  // Audio File Upload Simulation
  const handleAudioFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.info("Ingesting Audio File", {
        description: `Processing ${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)...`,
      });
      setTimeout(() => {
        setListenMode("stream");
        setWorkflowState("transcribed");
        toast.success("Audio File Ingested", {
          description: "Multilingual transcription generated with 98.6% speech confidence.",
        });
      }, 1500);
    }
  };

  const hasCriticalAllergy = patient.allergies.some((a) => a.critical);

  // Workflow Step Definitions
  const workflowSteps = [
    { key: "started", label: "Consultation Started" },
    { key: "recording", label: "Recording" },
    { key: "transcribed", label: "Transcription Completed" },
    { key: "draft_generated", label: "Draft Generated" },
    { key: "awaiting_review", label: "Awaiting Doctor Review" },
    { key: "approved", label: "Approved" },
  ];

  const currentStepIndex = workflowSteps.findIndex((s) => s.key === workflowState);

  return (
    <div className="space-y-4">
      {/* ====================================================================
          TOP WORKFLOW PROGRESSION STEPPER & ACTION BAR
          ==================================================================== */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-xs">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          {/* Left: Consultation ID & Encounter Context */}
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-accent/15 text-accent font-bold text-sm">
              <Stethoscope className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold text-foreground">
                  Clinical Consultation Workspace
                </span>
                <span className="font-mono text-xs text-muted-foreground font-semibold">
                  #{session.id}
                </span>
                <Badge variant="teal" size="sm">
                  {session.room}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Attending: {doctor?.name || session.doctorName} • Department: {session.department} • Started: {session.startedAt}
              </p>
            </div>
          </div>

          {/* Right: Quick Patient Switcher & Status */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Active Patient:
            </span>
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              aria-label="Switch active patient for consultation"
              className="h-8 rounded-lg border border-border bg-input px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {allPatients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (#{p.id}) — {p.age}y {p.gender}
                </option>
              ))}
            </select>

            <Badge
              variant={
                workflowState === "approved"
                  ? "success"
                  : workflowState === "recording"
                    ? "teal"
                    : "warning"
              }
              size="sm"
              dot={workflowState === "recording"}
              pulse={workflowState === "recording"}
            >
              {workflowState === "approved"
                ? "Signed & EHR Committed"
                : workflowState === "recording"
                  ? "Live Ambient Audio"
                  : "Review Pending"}
            </Badge>
          </div>
        </div>

        {/* Workflow Progression Stepper */}
        <div className="mt-4 border-t border-border/70 pt-3">
          <div className="flex items-center justify-between overflow-x-auto gap-2 pb-1 scrollbar-none">
            {workflowSteps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div key={step.key} className="flex items-center gap-2 shrink-0">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all",
                      isCurrent
                        ? "bg-accent text-accent-foreground ring-2 ring-accent/30 shadow-xs"
                        : isPast
                          ? "bg-success/15 text-success font-medium"
                          : "bg-muted/40 text-muted-foreground font-normal",
                    )}
                  >
                    {isPast ? (
                      <Check className="size-3.5 stroke-[2.5]" />
                    ) : (
                      <span className="font-mono text-[11px]">{idx + 1}.</span>
                    )}
                    <span>{step.label}</span>
                  </div>
                  {idx < workflowSteps.length - 1 && (
                    <ChevronRight className="size-3 text-muted-foreground/40 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="flex rounded-lg border border-border bg-muted/40 p-1 text-xs font-semibold lg:hidden">
        <button
          type="button"
          onClick={() => setActiveMobilePanel("context")}
          className={cn(
            "flex-1 py-1.5 rounded-md text-center transition-colors",
            activeMobilePanel === "context"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground",
          )}
        >
          Patient Context
        </button>
        <button
          type="button"
          onClick={() => setActiveMobilePanel("listen")}
          className={cn(
            "flex-1 py-1.5 rounded-md text-center transition-colors",
            activeMobilePanel === "listen"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground",
          )}
        >
          LISTEN Scribe
        </button>
        <button
          type="button"
          onClick={() => setActiveMobilePanel("notes")}
          className={cn(
            "flex-1 py-1.5 rounded-md text-center transition-colors",
            activeMobilePanel === "notes"
              ? "bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground",
          )}
        >
          Clinical Notes
        </button>
      </div>

      {/* ====================================================================
          THREE-PANEL CLINICAL WORKSPACE
          1. LEFT PANEL: Patient Context (3 cols)
          2. CENTRE PANEL: LISTEN Scribe (5 cols)
          3. RIGHT PANEL: Clinical Notes & Safety (4 cols)
          ==================================================================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 items-start">
        {/* ==================================================================
            PANEL 1: PATIENT CONTEXT (LEFT PANEL — 3 COLS)
            ================================================================== */}
        <div
          className={cn(
            "space-y-4 lg:col-span-3",
            activeMobilePanel !== "context" && "hidden lg:block",
          )}
        >
          {/* Patient Identity & Demographics */}
          <Card>
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{patient.name}</CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    MRN: <span className="font-mono font-bold text-accent">#{patient.id}</span>
                  </CardDescription>
                </div>
                <Badge variant="outline" size="sm">
                  {patient.age}y • {patient.gender}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground">Blood Group</span>
                  <p className="font-bold text-foreground">{patient.bloodGroup}</p>
                </div>
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  <span className="text-[10px] text-muted-foreground">Language</span>
                  <p className="font-bold text-foreground truncate">{patient.preferredLanguage}</p>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground">Phone & Contact:</span>
                <p className="font-medium text-foreground">{patient.phone}</p>
              </div>

              <div>
                <span className="text-[11px] text-muted-foreground">Baseline Vitals:</span>
                <p className="font-mono text-[11px] text-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
                  {patient.vitals}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Allergies Card (Prominent Safety Highlight) */}
          <Card className={cn(hasCriticalAllergy && "border-destructive/40 bg-destructive/5")}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldAlert
                    className={cn(
                      "size-4",
                      hasCriticalAllergy ? "text-destructive" : "text-muted-foreground",
                    )}
                  />
                  <CardTitle className="text-xs uppercase tracking-wider">
                    Documented Allergies
                  </CardTitle>
                </div>
                <Badge variant={hasCriticalAllergy ? "danger" : "outline"} size="sm">
                  {patient.allergies.length > 0 ? `${patient.allergies.length} Gated` : "NKDA"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {patient.allergies.length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  No Known Drug Allergies (NKDA) recorded.
                </p>
              ) : (
                patient.allergies.map((alg) => (
                  <div
                    key={alg.id}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive space-y-0.5"
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span>{alg.allergen}</span>
                      <span className="text-[10px] uppercase font-mono">[{alg.severity}]</span>
                    </div>
                    <p className="text-[11px] text-destructive/90">{alg.reaction}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Active Medications */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Pill className="size-4 text-accent" />
                <CardTitle className="text-xs uppercase tracking-wider">
                  Active Medications
                </CardTitle>
              </div>
              <Badge variant="teal" size="sm">
                {patient.medications.filter((m) => m.status === "active").length}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {patient.medications.filter((m) => m.status === "active").length === 0 ? (
                <p className="text-[11px] text-muted-foreground italic">
                  No active prescriptions on file.
                </p>
              ) : (
                patient.medications.filter((m) => m.status === "active").map((med) => (
                  <div
                    key={med.id}
                    className="rounded-lg border border-border p-2 bg-muted/20 space-y-0.5"
                  >
                    <div className="font-semibold text-foreground text-xs">{med.name}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {med.dosage} • {med.frequency}
                    </div>
                    <div className="text-[10px] text-accent font-medium">{med.indication}</div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Previous Diagnoses */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-1.5">
                <Activity className="size-4 text-muted-foreground" />
                <CardTitle className="text-xs uppercase tracking-wider">
                  Previous Diagnoses
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {patient.diagnoses.map((diag) => (
                <div key={diag.id} className="rounded-lg border border-border p-2 bg-muted/10 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{diag.condition}</span>
                    <span className="font-mono text-[10px] text-muted-foreground">{diag.code}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Onset: {diag.onset}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recent Laboratory Results */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileSpreadsheet className="size-4 text-accent" />
                <CardTitle className="text-xs uppercase tracking-wider">
                  Recent Lab Results
                </CardTitle>
              </div>
              <Badge variant="navy" size="sm">Thyrocare</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              {patient.labReports[0] ? (
                <div className="space-y-1.5">
                  {patient.labReports[0].parameters.slice(0, 4).map((param, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded border border-border/70 p-1.5 text-xs bg-card"
                    >
                      <span className="text-muted-foreground text-[11px] truncate max-w-[120px]">
                        {param.name.split("(")[0]}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-foreground">
                          {param.value} {param.unit}
                        </span>
                        {param.flag === "high" && (
                          <Badge variant="danger" size="sm" className="text-[9px] px-1 py-0">
                            HI
                          </Badge>
                        )}
                        {param.flag === "normal" && (
                          <Badge variant="success" size="sm" className="text-[9px] px-1 py-0">
                            NL
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-[10px] text-muted-foreground text-right pt-1">
                    Ingested: {patient.labReports[0].date}
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground italic">No recent lab panels.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ==================================================================
            PANEL 2: LISTEN (CENTRE PANEL — 5 COLS)
            ================================================================== */}
        <div
          className={cn(
            "space-y-4 lg:col-span-5",
            activeMobilePanel !== "listen" && "hidden lg:block",
          )}
        >
          <Card className="border-accent/30 shadow-xs">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Mic className="size-4.5 text-accent animate-pulse" />
                    <CardTitle className="text-base font-bold text-foreground">
                      LISTEN — Multilingual Clinical Scribe
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Real-time ambient consultation capture with speech-to-clinical entity extraction.
                  </CardDescription>
                </div>

                {/* Recording Status & Live Timer */}
                <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-muted/40 px-3 py-1.5">
                  <span
                    className={cn(
                      "size-2.5 rounded-full",
                      isRecording ? "bg-red-500 animate-ping" : "bg-muted-foreground",
                    )}
                  />
                  <span className="font-mono font-bold text-sm text-foreground">
                    {formatTimer(recordingSeconds)}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {isRecording ? "Live" : "Paused"}
                  </span>
                </div>
              </div>

              {/* Language Selector Strip */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Languages className="size-3.5 text-accent" />
                  <span className="font-medium text-foreground">Target Language:</span>
                </div>

                <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5 text-xs">
                  {(["Kannada", "Hindi", "English", "Code-Mixed"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={cn(
                        "rounded px-2.5 py-1 font-medium transition-colors text-xs",
                        selectedLanguage === lang
                          ? "bg-card text-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {lang === "Kannada" ? "ಕನ್ನಡ" : lang === "Hindi" ? "हिंदी" : lang}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Audio Visualizer Waveform Bar */}
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <Volume2 className="size-3.5 text-accent" />
                    Acoustic Input Spectrum (Dual Channel Array)
                  </span>
                  <span className="font-mono text-[10px]">Sampling: 44.1 kHz PCM</span>
                </div>

                {/* Animated Waveform Bars */}
                <div className="flex h-10 items-end justify-between gap-1 px-1">
                  {[
                    30, 65, 80, 45, 95, 55, 75, 90, 40, 85, 90, 35, 60, 75, 90,
                    50, 70, 85, 40, 60, 95, 80, 50, 35, 65, 80, 45, 90, 60, 75,
                    85, 40, 70, 90, 55, 35, 65, 80, 50, 95,
                  ].map((height, i) => (
                    <span
                      key={i}
                      style={{
                        height: isRecording ? `${height}%` : "18%",
                      }}
                      className={cn(
                        "w-1 rounded-full transition-all duration-200",
                        isRecording
                          ? "bg-accent/80 hover:bg-accent"
                          : "bg-muted-foreground/30",
                      )}
                    />
                  ))}
                </div>
              </div>

              {/* Primary Recording Controls */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 p-2.5">
                <div className="flex items-center gap-2">
                  {isRecording ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePauseRecording}
                      leftIcon={<Pause className="size-4 text-warning" />}
                    >
                      Pause
                    </Button>
                  ) : (
                    <Button
                      variant="teal"
                      size="sm"
                      onClick={handleStartRecording}
                      leftIcon={<Play className="size-4" />}
                    >
                      Resume Scribe
                    </Button>
                  )}

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleStopRecording}
                    leftIcon={<Square className="size-3.5" />}
                  >
                    Stop & Process
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetRecording}
                    leftIcon={<RotateCcw className="size-3.5" />}
                  >
                    Reset
                  </Button>
                </div>

                {/* Scribe Input Mode Selector */}
                <div className="flex rounded-lg border border-border bg-card p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setListenMode("stream")}
                    className={cn(
                      "px-2.5 py-1 rounded font-medium transition-colors",
                      listenMode === "stream"
                        ? "bg-muted text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Live Speech
                  </button>
                  <button
                    type="button"
                    onClick={() => setListenMode("manual")}
                    className={cn(
                      "px-2.5 py-1 rounded font-medium transition-colors",
                      listenMode === "manual"
                        ? "bg-muted text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Manual Note
                  </button>
                  <button
                    type="button"
                    onClick={() => setListenMode("upload")}
                    className={cn(
                      "px-2.5 py-1 rounded font-medium transition-colors",
                      listenMode === "upload"
                        ? "bg-muted text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    Upload Audio
                  </button>
                </div>
              </div>

              {/* Simulation Disclaimer Callout */}
              <div className="rounded-lg border border-border/80 bg-muted/40 p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
                <Info className="size-4 shrink-0 text-accent" />
                <span>
                  <strong>Interactive Simulation:</strong> Ambient speech playback demonstrating real-time Kannada-English code mixing and clinical extraction. Zero live external audio recorded.
                </span>
              </div>

              {/* MODE 1: LIVE SPEECH DIALOGUE STREAM */}
              {listenMode === "stream" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Multi-turn Transcription Stream ({transcriptTurns.length} turns)</span>
                    <Badge variant="teal" size="sm">Code-Mixed ASR</Badge>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto space-y-3 pr-1 text-xs">
                    {transcriptTurns.map((turn) => {
                      const isDoc = turn.speaker === "doctor";
                      return (
                        <div
                          key={turn.id}
                          className={cn(
                            "rounded-xl border p-3 space-y-1.5 transition-colors",
                            isDoc
                              ? "border-border/80 bg-muted/30 ml-4"
                              : "border-accent/30 bg-card mr-4",
                          )}
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={cn(
                                  "font-bold",
                                  isDoc ? "text-foreground" : "text-accent",
                                )}
                              >
                                {turn.speakerName}
                              </span>
                              <span className="text-muted-foreground">({turn.language})</span>
                            </div>
                            <span className="font-mono text-muted-foreground text-[10px]">
                              {turn.timestamp}
                            </span>
                          </div>

                          {/* Original Native Speech */}
                          <p className="text-foreground leading-relaxed font-normal">
                            &quot;{turn.originalText}&quot;
                          </p>

                          {/* Clinical Translation */}
                          {turn.translation && turn.translation !== turn.originalText && (
                            <div className="rounded-md bg-accent/5 p-2 text-[11px] text-accent border border-accent/15 leading-relaxed">
                              <span className="font-bold mr-1">[Clinical Translation]:</span>
                              {turn.translation}
                            </div>
                          )}

                          {/* Turn-level Extracted Entities */}
                          {turn.entities && turn.entities.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {turn.entities.map((ent, i) => (
                                <Badge
                                  key={i}
                                  variant={ent.includes("Negated") ? "success" : "teal"}
                                  size="sm"
                                  className="text-[10px]"
                                >
                                  {ent}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Extracted Clinical Concepts Strip */}
                  <div className="pt-2 border-t border-border space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Continuous Concept Extraction (NLP Engine)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {session.extractedEntities.map((ent, idx) => (
                        <Badge
                          key={idx}
                          variant={
                            ent.category === "Contraindication"
                              ? "danger"
                              : ent.category === "Negation"
                                ? "success"
                                : ent.category === "Symptom"
                                  ? "teal"
                                  : "outline"
                          }
                          size="sm"
                          className="text-[10px]"
                        >
                          {ent.text} {ent.code && `(${ent.code})`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: MANUAL TRANSCRIPT / DICTATION INPUT */}
              {listenMode === "manual" && (
                <form onSubmit={handleManualTranscriptSubmit} className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Manual Clinician Input / Dictation</span>
                    <span className="text-muted-foreground text-[11px]">Type or paste transcript</span>
                  </div>

                  <textarea
                    rows={6}
                    value={manualTranscriptInput}
                    onChange={(e) => setManualTranscriptInput(e.target.value)}
                    placeholder="Type or paste doctor-patient conversation here in Kannada, Hindi, or English..."
                    className="w-full rounded-xl border border-border bg-input p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent leading-relaxed"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Will append as timestamped clinician turn in active transcript.
                    </span>
                    <Button
                      type="submit"
                      variant="teal"
                      size="sm"
                      leftIcon={<Plus className="size-3.5" />}
                    >
                      Append to Dialogue
                    </Button>
                  </div>
                </form>
              )}

              {/* MODE 3: AUDIO UPLOAD SIMULATOR */}
              {listenMode === "upload" && (
                <div className="rounded-xl border border-dashed border-border p-6 text-center space-y-3">
                  <Upload className="mx-auto size-8 text-muted-foreground" />
                  <div>
                    <h4 className="font-semibold text-xs text-foreground">
                      Upload Audio Consultation File
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Supports WAV, MP3, M4A, OGG up to 25 MB.
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                    <span>Choose Audio File</span>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ==================================================================
            PANEL 3: CLINICAL NOTES & SAFETY (RIGHT PANEL — 4 COLS)
            ================================================================== */}
        <div
          className={cn(
            "space-y-4 lg:col-span-4",
            activeMobilePanel !== "notes" && "hidden lg:block",
          )}
        >
          {/* SAFETY AUDIT PANEL (Collapsible Card) */}
          <Card className="border-warning/30 bg-card">
            <CardHeader className="pb-2.5 cursor-pointer" onClick={() => setIsSafetyOpen(!isSafetyOpen)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="size-4 text-warning" />
                  <CardTitle className="text-xs uppercase tracking-wider font-bold">
                    SAFEGUARD Consultation Audit
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">
                    {session.safetyAudit.allergyAlerts.length +
                      session.safetyAudit.patientHistoryInconsistencies.length}{" "}
                    Flags
                  </Badge>
                  <ChevronRight
                    className={cn(
                      "size-3.5 text-muted-foreground transition-transform",
                      isSafetyOpen && "rotate-90",
                    )}
                  />
                </div>
              </div>
            </CardHeader>

            {isSafetyOpen && (
              <CardContent className="space-y-2.5 pt-1 text-xs border-t border-border/50">
                {/* 1. Allergy Alerts */}
                {session.safetyAudit.allergyAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-xs text-destructive space-y-1"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <AlertTriangle className="size-3.5 shrink-0" />
                      {alert.title}
                    </span>
                    <p className="text-[11px] leading-relaxed text-destructive/90">
                      {alert.description}
                    </p>
                    <span className="block text-[10px] text-muted-foreground">
                      Ref: {alert.ruleSource}
                    </span>
                  </div>
                ))}

                {/* 2. Patient History Inconsistencies */}
                {session.safetyAudit.patientHistoryInconsistencies.map((inc, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300 space-y-0.5"
                  >
                    <span className="font-bold flex items-center gap-1">
                      <AlertCircle className="size-3.5 shrink-0" />
                      History Inconsistency Detected
                    </span>
                    <p className="text-[11px] leading-relaxed">{inc}</p>
                  </div>
                ))}

                {/* 3. Missing Information */}
                {session.safetyAudit.missingInformation.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs space-y-1">
                    <span className="font-semibold text-muted-foreground text-[11px] uppercase tracking-wider">
                      Information Gap / Clarification Needed
                    </span>
                    <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5">
                      {session.safetyAudit.missingInformation.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* STRUCTURED CLINICAL NOTE DOCUMENT */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b border-border/70">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-1.5">
                    <FileText className="size-4 text-accent" />
                    <CardTitle className="text-base font-bold text-foreground">
                      Structured Clinical Note
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Evidence-grounded draft generated from LISTEN audio transcription.
                  </CardDescription>
                </div>

                <Badge
                  variant={clinicalNote.status === "Doctor Approved & Signed" ? "success" : "warning"}
                  size="sm"
                >
                  {clinicalNote.status}
                </Badge>
              </div>

              {/* Action Toolbar */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2.5">
                <Button
                  variant="teal"
                  size="xs"
                  onClick={handleGenerateNote}
                  loading={isGeneratingNote}
                  leftIcon={<Sparkles className="size-3.5" />}
                >
                  Generate Note
                </Button>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setIsEditingNote(!isEditingNote)}
                    leftIcon={<Edit3 className="size-3" />}
                  >
                    {isEditingNote ? "Preview View" : "Edit Note"}
                  </Button>

                  {isEditingNote ? (
                    <Button
                      variant="teal"
                      size="xs"
                      onClick={handleSaveDraft}
                      leftIcon={<Save className="size-3" />}
                    >
                      Save Draft
                    </Button>
                  ) : (
                    <Button
                      variant="teal"
                      size="xs"
                      onClick={handleApproveNote}
                      disabled={clinicalNote.status === "Doctor Approved & Signed"}
                      leftIcon={<Check className="size-3" />}
                    >
                      {clinicalNote.status === "Doctor Approved & Signed"
                        ? "Approved"
                        : "Approve & Sign"}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {/* Document Paper Container */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-2xs font-sans">
                {/* Hospital & Note Header */}
                <div className="border-b border-border pb-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <div>
                    <span className="font-bold text-foreground uppercase tracking-wider block">
                      Apollo Hospitals Bengaluru • Outpatient Clinical Record
                    </span>
                    <span>Date: {clinicalNote.generatedAt}</span>
                  </div>
                  <span className="font-mono text-[10px] text-accent font-semibold">
                    {clinicalNote.evidenceConfidence}
                  </span>
                </div>

                {/* FIELD 1: Chief Complaint */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                    1. Chief Complaint
                  </span>
                  {isEditingNote ? (
                    <textarea
                      rows={2}
                      value={clinicalNote.chiefComplaint}
                      onChange={(e) =>
                        setClinicalNote({ ...clinicalNote, chiefComplaint: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-input p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed font-medium">
                      {clinicalNote.chiefComplaint}
                    </p>
                  )}
                </div>

                {/* FIELD 2 & 3: Symptoms & Duration */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                      2. Extracted Symptoms
                    </span>
                    <ul className="list-disc pl-4 text-foreground/90 space-y-0.5 leading-relaxed">
                      {clinicalNote.symptoms.map((sym, i) => (
                        <li key={i}>{sym}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                      3. Duration & Onset
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {clinicalNote.duration}
                    </p>
                  </div>
                </div>

                {/* FIELD 4: Relevant Medical History */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                    4. Relevant Medical History
                  </span>
                  {isEditingNote ? (
                    <textarea
                      rows={2}
                      value={clinicalNote.relevantHistory}
                      onChange={(e) =>
                        setClinicalNote({ ...clinicalNote, relevantHistory: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-input p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed">
                      {clinicalNote.relevantHistory}
                    </p>
                  )}
                </div>

                {/* FIELD 5: Observations (Physical Exam & Vitals) */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                    5. Clinical Observations & Physical Exam
                  </span>
                  {isEditingNote ? (
                    <textarea
                      rows={2}
                      value={clinicalNote.observations}
                      onChange={(e) =>
                        setClinicalNote({ ...clinicalNote, observations: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-input p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/40 font-mono text-[11px]">
                      {clinicalNote.observations}
                    </p>
                  )}
                </div>

                {/* FIELD 6: Clinician Assessment */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                    6. Clinician Assessment & Differential
                  </span>
                  {isEditingNote ? (
                    <textarea
                      rows={3}
                      value={clinicalNote.clinicianAssessment}
                      onChange={(e) =>
                        setClinicalNote({ ...clinicalNote, clinicianAssessment: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-input p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  ) : (
                    <p className="text-foreground leading-relaxed whitespace-pre-line font-medium">
                      {clinicalNote.clinicianAssessment}
                    </p>
                  )}
                </div>

                {/* FIELD 7: Treatment Plan & Prescriptions */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider">
                    7. Treatment Plan & Prescriptions
                  </span>
                  {isEditingNote ? (
                    <textarea
                      rows={4}
                      value={clinicalNote.treatmentPlan}
                      onChange={(e) =>
                        setClinicalNote({ ...clinicalNote, treatmentPlan: e.target.value })
                      }
                      className="w-full rounded-lg border border-border bg-input p-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    />
                  ) : (
                    <div className="rounded-lg border border-teal-500/20 bg-teal-500/5 p-2.5 text-foreground whitespace-pre-line leading-relaxed font-mono text-[11px]">
                      {clinicalNote.treatmentPlan}
                    </div>
                  )}
                </div>

                {/* FIELD 8: Uncertainties & Preserved Negations */}
                <div className="space-y-1 rounded-lg border border-border bg-muted/20 p-2.5">
                  <span className="font-bold text-foreground text-[11px] uppercase tracking-wider flex items-center gap-1">
                    <Info className="size-3 text-accent" />
                    8. Preserved Uncertainties & Explicit Negations
                  </span>
                  <ul className="list-disc pl-4 text-muted-foreground text-[11px] space-y-0.5 leading-relaxed">
                    {clinicalNote.uncertaintiesAndNegations.map((unc, i) => (
                      <li key={i}>{unc}</li>
                    ))}
                  </ul>
                </div>

                {/* Electronic Doctor Signature Stamp */}
                {clinicalNote.status === "Doctor Approved & Signed" ? (
                  <div className="rounded-xl border border-success/30 bg-success/10 p-3 flex items-center justify-between text-xs text-success">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="size-5 shrink-0" />
                      <div>
                        <span className="font-bold block">
                          Electronically Approved & Signed
                        </span>
                        <span className="text-[11px] text-success/80">
                          {clinicalNote.signedBy}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-success/80">
                      {clinicalNote.signedAt}
                    </span>
                  </div>
                ) : (
                  <div className="pt-2 text-center text-[11px] text-muted-foreground italic border-t border-border/50">
                    AI assists the doctor. The doctor makes the decision. Review and sign to commit to EHR.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Re-export as ConsultationsPage for backwards compatibility
export { ConsultationWorkspacePage as ConsultationsPage };
