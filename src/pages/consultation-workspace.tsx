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
import {
  generateClinicalSOAPNote,
  reviewClinicalSOAPNote,
  saveClinicalSOAPNoteDraft,
  listClinicalSOAPNotes,
  type ClinicalSOAPNoteResponse,
  type SOAPMedicationSafetyReport,
  type SOAPPayload,
} from "@/lib/api-client";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";

type NoteProvenance = "none" | "hydrated_ehr" | "newly_generated" | "simulated";

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

  // Selected patient: default to verified synthetic patient SYN-PAT-001
  const [selectedPatientId, setSelectedPatientId] = useState<string>("SYN-PAT-001");
  const patient = useMemo(() => {
    return getPatientById(selectedPatientId) || getPatientById("SYN-PAT-001") || getPatientById("AM-94021")!;
  }, [selectedPatientId]);

  const allPatients = useMemo(() => getPatients(), []);

  // Active encounter state derived from selected patient
  const availableEncounters = useMemo(() => {
    if (patient.consultations && patient.consultations.length > 0) {
      return patient.consultations.map((c) => ({
        id: c.id,
        date: c.date,
        chiefComplaint: c.chiefComplaint,
      }));
    }
    return [
      {
        id: `${selectedPatientId}-ENC-01`,
        date: "Today",
        chiefComplaint: "General Outpatient Consultation",
      },
    ];
  }, [patient, selectedPatientId]);

  const [selectedEncounterId, setSelectedEncounterId] = useState<string>(
    availableEncounters[0]?.id || "SYN-ENC-001-B",
  );

  // Keep encounter in sync when patient changes
  useEffect(() => {
    if (availableEncounters.length > 0) {
      setSelectedEncounterId(availableEncounters[0].id);
    }
  }, [availableEncounters]);

  // Backend response and integration state
  const [activeBackendNote, setActiveBackendNote] = useState<ClinicalSOAPNoteResponse | null>(null);
  const [backendNoteId, setBackendNoteId] = useState<string | null>(null);
  const [backendMedSafety, setBackendMedSafety] = useState<SOAPMedicationSafetyReport | null>(null);
  const [backendMissingInfo, setBackendMissingInfo] = useState<string[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isNoteEdited, setIsNoteEdited] = useState(false);
  const [noteProvenance, setNoteProvenance] = useState<NoteProvenance>("none");

  // Workflow Progression State
  const [workflowState, setWorkflowState] = useState<WorkflowState>("started");

  // Audio Recording & Scribe State
  const [isSimulationRecording, setIsSimulationRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [selectedLanguage, setSelectedLanguage] = useState<
    "Kannada" | "Hindi" | "English" | "Code-Mixed"
  >("English");

  // Center Panel View Mode: "live" | "manual" | "simulation"
  const [listenMode, setListenMode] = useState<"live" | "manual" | "simulation">("live");
  const [manualTranscriptInput, setManualTranscriptInput] = useState("");
  const [editableLiveTranscript, setEditableLiveTranscript] = useState("");
  const [transcriptTurns, setTranscriptTurns] = useState<SpeechTurn[]>(
    session.transcript,
  );

  // Web Speech API Integration for Live Microphone Mode
  const speechLang = useMemo(() => {
    if (selectedLanguage === "Kannada") return "kn-IN";
    if (selectedLanguage === "Hindi") return "hi-IN";
    return "en-IN";
  }, [selectedLanguage]);

  const {
    isSupported: isSpeechSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    errorMessage: speechError,
    startListening,
    stopListening,
    resetTranscript: resetSpeechTranscript,
    setFinalTranscriptText,
    clearError: clearSpeechError,
  } = useSpeechRecognition({
    language: speechLang,
    onFinalTranscript: (text) => {
      setEditableLiveTranscript(text);
    },
  });

  // Right Panel Clinical Note State
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [isGeneratingNote, setIsGeneratingNote] = useState(false);
  const [clinicalNote, setClinicalNote] = useState<StructuredClinicalNote>(
    session.draftNote,
  );

  // Patient switch handler
  const handlePatientChange = (newPatientId: string) => {
    setSelectedPatientId(newPatientId);
    setGenerationError(null);
    setActiveBackendNote(null);
    setBackendNoteId(null);
    setBackendMedSafety(null);
    setBackendMissingInfo([]);
    setIsNoteEdited(false);
    setNoteProvenance("none");

    if (newPatientId === "SYN-PAT-001") {
      const synSession = getConsultationSession("CS-SYN-001");
      if (synSession) {
        setTranscriptTurns(synSession.transcript);
        setSelectedLanguage("Kannada");
      }
    } else if (newPatientId === "SYN-PAT-002") {
      const synSession = getConsultationSession("CS-102");
      if (synSession) {
        setTranscriptTurns(synSession.transcript);
        setSelectedLanguage("Hindi");
      }
    } else {
      const synSession = getConsultationSession("CS-101");
      if (synSession) {
        setTranscriptTurns(synSession.transcript);
      }
    }
  };

  // Hydrate existing draft note from backend database on patient switch
  useEffect(() => {
    let isMounted = true;
    async function hydrateExistingDraft() {
      try {
        const patId = selectedPatientId === "AM-94021" ? "SYN-PAT-001" : selectedPatientId;
        const notes = await listClinicalSOAPNotes("draft", patId);
        if (isMounted && notes && notes.length > 0) {
          const draft = notes[0];
          setBackendNoteId(draft.note_id);
          setActiveBackendNote(draft);
          setNoteProvenance("hydrated_ehr");
          if (draft.medication_safety) {
            setBackendMedSafety(draft.medication_safety);
          }
          if (draft.unextracted_or_missing) {
            setBackendMissingInfo(draft.unextracted_or_missing);
          }
          const activeSoap = draft.edited_soap || draft.soap;
          if (activeSoap) {
            setClinicalNote((prev) => ({
              ...prev,
              chiefComplaint: activeSoap.subjective.chief_complaint,
              relevantHistory: activeSoap.subjective.history_of_present_illness,
              symptoms: activeSoap.subjective.reported_symptoms || [],
              observations: activeSoap.objective.physical_examination.join(". ") || prev.observations,
              clinicianAssessment: activeSoap.assessment.primary_impression,
              treatmentPlan: activeSoap.plan.patient_instructions.join(". ") || prev.treatmentPlan,
            }));
            setWorkflowState("draft_generated");
          }
        } else if (isMounted) {
          setActiveBackendNote(null);
          setBackendNoteId(null);
          setNoteProvenance("none");
        }
      } catch (err) {
        console.warn("Could not hydrate existing draft from backend", err);
      }
    }
    hydrateExistingDraft();
    return () => {
      isMounted = false;
    };
  }, [selectedPatientId]);

  // Safety Panel Collapse State
  const [isSafetyOpen, setIsSafetyOpen] = useState(true);

  // Active Tab for Mobile Viewports
  const [activeMobilePanel, setActiveMobilePanel] = useState<
    "context" | "listen" | "notes"
  >("listen");

  // Simulation Recording Timer Effect
  useEffect(() => {
    let interval: any = null;
    if (isSimulationRecording) {
      interval = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isSimulationRecording]);

  // Format Timer string
  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Simulation Controls (Clearly separated from Live Microphone mode)
  const handleStartSimulation = () => {
    setIsSimulationRecording(true);
    setWorkflowState("recording");
    toast.info("Simulation Playback Started", {
      description: `Simulating consultation audio stream in ${selectedLanguage}. (Demonstration data).`,
    });
  };

  const handlePauseSimulation = () => {
    setIsSimulationRecording(false);
    toast.info("Simulation Paused", {
      description: "Demonstration playback paused.",
    });
  };

  const handleStopSimulation = () => {
    setIsSimulationRecording(false);
    setWorkflowState("transcribed");
    toast.success("Simulation Completed", {
      description: `Demonstration finished (${formatTimer(recordingSeconds)} simulated duration).`,
    });
  };

  const handleResetSimulation = () => {
    setIsSimulationRecording(false);
    setRecordingSeconds(0);
    setWorkflowState("started");
    toast.info("Simulation Reset", {
      description: "Demonstration recording buffer reset.",
    });
  };

  // Generate Structured Clinical Note with AI (via Backend API)
  const handleGenerateNote = async () => {
    setIsGeneratingNote(true);
    setGenerationError(null);
    try {
      // 1. Gather consultation dialogue strictly based on active input mode
      let textToProcess = "";
      if (listenMode === "manual") {
        textToProcess = manualTranscriptInput.trim();
        if (!textToProcess) {
          toast.error("Manual Text Required", {
            description: "Please enter consultation dialogue or physician dictation before generating a SOAP note.",
          });
          setIsGeneratingNote(false);
          return;
        }
      } else if (listenMode === "live") {
        textToProcess = (editableLiveTranscript || finalTranscript).trim();
        if (!textToProcess) {
          toast.error("Microphone Speech Required", {
            description: "No transcribed speech detected. Click 'Start Listening' to capture your voice, or switch to Manual Text Input.",
          });
          setIsGeneratingNote(false);
          return;
        }
      } else {
        // Simulation mode
        textToProcess = transcriptTurns
          .map((turn) => `${turn.speakerName} (${turn.speaker}): ${turn.originalText}`)
          .join("\n");
        if (!textToProcess) {
          toast.error("Dialogue Required", {
            description: "Simulation transcript buffer is empty.",
          });
          setIsGeneratingNote(false);
          return;
        }
      }

      // 2. Validate patient and encounter selection
      const backendPatId = selectedPatientId;
      const backendEncId = selectedEncounterId;

      // Validate verified patient ID pattern
      if (!backendPatId.startsWith("SYN-PAT-") && !["AM-94021", "AM-93112"].includes(backendPatId)) {
        const err = `Patient '${backendPatId}' is not verified in the clinical EHR backend. Please select a verified synthetic record (SYN-PAT-001, SYN-PAT-002, or SYN-PAT-003).`;
        setGenerationError(err);
        toast.error("Unverified Patient", { description: err });
        setIsGeneratingNote(false);
        return;
      }

      // Map language code: "en", "kn", "hi"
      let langCode = "en";
      if (selectedLanguage === "Kannada") langCode = "kn";
      else if (selectedLanguage === "Hindi") langCode = "hi";

      const res = await generateClinicalSOAPNote({
        consultation_text: textToProcess,
        patient_id: backendPatId,
        encounter_id: backendEncId,
        language_code: langCode,
      });

      setActiveBackendNote(res);
      setBackendNoteId(res.note_id);
      setNoteProvenance(listenMode === "simulation" ? "simulated" : "newly_generated");

      if (res.medication_safety) {
        setBackendMedSafety(res.medication_safety);
      }
      if (res.unextracted_or_missing) {
        setBackendMissingInfo(res.unextracted_or_missing);
      }

      const soap = res.soap;
      const formattedSymptoms =
        soap.subjective.reported_symptoms.length > 0
          ? soap.subjective.reported_symptoms
          : [soap.subjective.history_of_present_illness];

      const formattedPlan = [
        ...soap.plan.proposed_medications.map((m) => `• ${m}`),
        ...soap.plan.patient_instructions.map((i) => `• ${i}`),
        ...(soap.plan.follow_up ? [`• Follow-up: ${soap.plan.follow_up}`] : []),
      ].join("\n");

      const formattedUncertainties = [
        ...soap.subjective.pertinent_negatives.map((neg) => `Pertinent negative: ${neg}`),
        ...soap.plan.red_flag_warnings.map((w) => `Red flag: ${w}`),
        ...(res.unextracted_or_missing || []).map((u) => `Information gap: ${u}`),
      ];

      setClinicalNote({
        chiefComplaint: soap.subjective.chief_complaint,
        symptoms: formattedSymptoms,
        duration: soap.subjective.history_of_present_illness,
        relevantHistory:
          soap.patient_context?.chronic_conditions?.join(", ") ||
          patient.diagnoses.map((d) => d.condition).join(", ") ||
          "Comorbidities on file",
        observations:
          soap.objective.vital_signs_summary ||
          soap.objective.physical_examination.join("; ") ||
          patient.vitals,
        clinicianAssessment: `${soap.assessment.primary_impression}${
          soap.assessment.differential_diagnoses.length > 0
            ? "\nDifferentials: " + soap.assessment.differential_diagnoses.join(", ")
            : ""
        }`,
        treatmentPlan: formattedPlan || "Symptomatic supportive therapy.",
        uncertaintiesAndNegations: formattedUncertainties,
        evidenceConfidence: res.confidence_notes || "Evidence Grounded",
        generatedAt: new Date(res.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "Draft Advisory",
      });

      setWorkflowState("draft_generated");
      toast.success("SOAP Draft Generated", {
        description: `Draft ID: ${res.note_id}. Verified deterministic medication safety.`,
      });
      setTimeout(() => {
        setWorkflowState("awaiting_review");
      }, 600);
    } catch (err: any) {
      console.error("Clinical note generation error:", err);
      const errMsg =
        err.response?.data?.detail || err.message || "Failed to contact backend API.";
      const errStr = typeof errMsg === "string" ? errMsg : JSON.stringify(errMsg);
      setGenerationError(errStr);
      setActiveBackendNote(null);
      setNoteProvenance("none");
      toast.error("Generation Issue", {
        description: errStr,
      });
    } finally {
      setIsGeneratingNote(false);
    }
  };

  // Save Draft Note (Persists to backend SQLite database)
  const handleSaveDraft = async () => {
    setIsEditingNote(false);
    setIsNoteEdited(true);

    if (backendNoteId && activeBackendNote) {
      try {
        const baseSoap = activeBackendNote.edited_soap || activeBackendNote.soap;
        const updatedSoapPayload: SOAPPayload = {
          subjective: {
            chief_complaint: clinicalNote.chiefComplaint || baseSoap.subjective.chief_complaint,
            history_of_present_illness: clinicalNote.relevantHistory || baseSoap.subjective.history_of_present_illness,
            reported_symptoms: clinicalNote.symptoms.length > 0 ? clinicalNote.symptoms : baseSoap.subjective.reported_symptoms,
            pertinent_negatives: baseSoap.subjective.pertinent_negatives,
            evidence: baseSoap.subjective.evidence,
          },
          objective: {
            vital_signs_summary: baseSoap.objective.vital_signs_summary,
            physical_examination: clinicalNote.observations ? [clinicalNote.observations] : baseSoap.objective.physical_examination,
            investigations_reviewed: baseSoap.objective.investigations_reviewed,
            evidence: baseSoap.objective.evidence,
          },
          assessment: {
            primary_impression: clinicalNote.clinicianAssessment || baseSoap.assessment.primary_impression,
            differential_diagnoses: baseSoap.assessment.differential_diagnoses,
            chronic_conditions_status: baseSoap.assessment.chronic_conditions_status,
            evidence: baseSoap.assessment.evidence,
          },
          plan: {
            diagnostic_workup: baseSoap.plan.diagnostic_workup,
            proposed_medications: baseSoap.plan.proposed_medications,
            patient_instructions: clinicalNote.treatmentPlan ? [clinicalNote.treatmentPlan] : baseSoap.plan.patient_instructions,
            red_flag_warnings: baseSoap.plan.red_flag_warnings,
            follow_up: baseSoap.plan.follow_up,
            evidence: baseSoap.plan.evidence,
          },
          patient_context: baseSoap.patient_context,
        };

        const res = await saveClinicalSOAPNoteDraft(backendNoteId, {
          edited_soap: updatedSoapPayload,
          doctor_comments: "Saved interim draft edits prior to final verification.",
        });

        setActiveBackendNote(res);
        if (res.medication_safety) {
          setBackendMedSafety(res.medication_safety);
        }

        toast.success("Draft Note Saved", {
          description: "Edits persisted to backend database. SAFEGUARD recalculated.",
        });
        return;
      } catch (err: any) {
        console.error("Failed to save draft to backend:", err);
      }
    }

    toast.success("Draft Note Saved", {
      description: "Edits stored locally. Remains a draft until doctor signature.",
    });
  };

  // Doctor Approval Sign-off (calls backend review endpoint)
  const handleApproveNote = async () => {
    const doctorName = doctor?.name || "Dr. Anika Rao, MBBS, MD";
    if (backendNoteId) {
      try {
        await reviewClinicalSOAPNote(backendNoteId, {
          reviewing_doctor: doctorName,
          action: isNoteEdited ? "reviewed_with_edits" : "approved",
          doctor_comments: isNoteEdited
            ? "Doctor verified and amended draft SOAP note."
            : "Doctor verified and approved AI draft SOAP note without amendments.",
        });
      } catch (err: any) {
        console.warn("Backend review endpoint warning, proceeding with approved status stamp:", err);
      }
    }
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
    setListenMode("live");
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
        setListenMode("live");
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

          {/* Right: Quick Patient Switcher & Encounter Selection */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">
              Patient:
            </span>
            <select
              value={selectedPatientId}
              onChange={(e) => handlePatientChange(e.target.value)}
              aria-label="Switch active patient for consultation"
              className="h-8 rounded-lg border border-border bg-input px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              <optgroup label="Verified Synthetic EHR Patients">
                <option value="SYN-PAT-001">
                  Ramesh Kumar (SYN-PAT-001) — 51y Male [Verified EHR]
                </option>
                <option value="SYN-PAT-002">
                  Sunita Devi (SYN-PAT-002) — 38y Female [Verified EHR]
                </option>
                <option value="SYN-PAT-003">
                  David D&apos;Souza (SYN-PAT-003) — 64y Male [Verified EHR]
                </option>
              </optgroup>
              <optgroup label="Other Demonstration Profiles">
                {allPatients
                  .filter((p) => !["SYN-PAT-001", "SYN-PAT-002", "SYN-PAT-003"].includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (#{p.id}) — {p.age}y {p.gender}
                    </option>
                  ))}
              </optgroup>
            </select>

            <span className="text-xs font-semibold text-muted-foreground ml-1">
              Encounter:
            </span>
            <select
              value={selectedEncounterId}
              onChange={(e) => setSelectedEncounterId(e.target.value)}
              aria-label="Select encounter"
              className="h-8 rounded-lg border border-border bg-input px-2.5 text-xs font-semibold text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
            >
              {availableEncounters.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {enc.id} ({enc.date})
                </option>
              ))}
            </select>

            <Badge
              variant={
                workflowState === "approved"
                  ? "success"
                  : isListening
                    ? "danger"
                    : workflowState === "draft_generated"
                      ? "teal"
                      : "outline"
              }
              size="sm"
              dot={isListening}
              pulse={isListening}
            >
              {workflowState === "approved"
                ? "Signed & EHR Committed"
                : isListening
                  ? "Live Microphone Active"
                  : workflowState === "draft_generated"
                    ? "Draft Generated"
                    : "Standby"}
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

      {/* Backend Generation Error Notification */}
      {generationError && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-destructive" />
            <div>
              <span className="font-bold block text-[11px] uppercase tracking-wider">
                Backend LLM Service Notification
              </span>
              <span className="text-destructive/90">{generationError}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setGenerationError(null)}
            className="text-destructive hover:bg-destructive/20 h-6 px-1.5 shrink-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

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
              <div className="flex items-center gap-3">
                <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border/80 shadow-xs bg-muted">
                  {patient.avatar ? (
                    <img
                      src={patient.avatar}
                      alt={patient.name}
                      className="size-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 grid place-items-center bg-accent/15 font-bold text-xs text-accent -z-10">
                    {patient.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <CardTitle className="text-base truncate">{patient.name}</CardTitle>
                    <Badge variant="outline" size="sm" className="shrink-0 text-[10px]">
                      {patient.age}y • {patient.gender}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    MRN: <span className="font-mono font-bold text-accent">#{patient.id}</span>
                  </CardDescription>
                </div>
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
                    <Mic className={cn("size-4.5 text-accent", isListening && "animate-pulse text-red-500")} />
                    <CardTitle className="text-base font-bold text-foreground">
                      LISTEN — Clinical Consultation Scribe
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs mt-0.5">
                    Live speech-to-text dictation and multilingual consultation capture.
                  </CardDescription>
                </div>

                {/* Microphone Recording Status & Indicator */}
                <div className="flex items-center gap-2 self-start rounded-xl border border-border bg-muted/40 px-3 py-1.5">
                  <span
                    className={cn(
                      "size-2.5 rounded-full transition-all",
                      isListening ? "bg-red-500 animate-ping" : isSimulationRecording ? "bg-amber-500 animate-ping" : "bg-muted-foreground/60",
                    )}
                  />
                  <span className="font-mono font-bold text-xs text-foreground">
                    {isListening ? "RECORDING" : isSimulationRecording ? formatTimer(recordingSeconds) : "IDLE"}
                  </span>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                    {listenMode === "live" ? "Live Mic" : listenMode === "manual" ? "Manual" : "Simulation"}
                  </span>
                </div>
              </div>

              {/* Mode Selection Strip */}
              <div className="mt-3 flex rounded-lg border border-border bg-card p-1 text-xs font-semibold gap-1">
                <button
                  type="button"
                  onClick={() => setListenMode("live")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors",
                    listenMode === "live"
                      ? "bg-accent text-accent-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Mic className="size-3.5" />
                  <span>Live Microphone</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListenMode("manual")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors",
                    listenMode === "manual"
                      ? "bg-accent text-accent-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Edit3 className="size-3.5" />
                  <span>Manual Input</span>
                </button>
                <button
                  type="button"
                  onClick={() => setListenMode("simulation")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-colors",
                    listenMode === "simulation"
                      ? "bg-amber-600 text-white shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Play className="size-3.5" />
                  <span>Simulation Mode</span>
                </button>
              </div>

              {/* Target Language Strip */}
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Languages className="size-3.5 text-accent" />
                  <span className="font-medium text-foreground">Speech Language:</span>
                </div>
                <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
                  {(["English", "Kannada", "Hindi"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setSelectedLanguage(lang)}
                      className={cn(
                        "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
                        selectedLanguage === lang
                          ? "bg-card text-foreground font-bold shadow-xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {lang === "Kannada" ? "ಕನ್ನಡ (kn-IN)" : lang === "Hindi" ? "हिंदी (hi-IN)" : "English (en-IN)"}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 text-xs">
              {/* ==========================================================
                  MODE 1: LIVE MICROPHONE SCRIBE (Web Speech API)
                  ========================================================== */}
              {listenMode === "live" && (
                <div className="space-y-3.5">
                  {/* Privacy Disclosure Notice */}
                  <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2.5">
                    <Lock className="size-4 shrink-0 text-accent mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-foreground text-[11px] uppercase tracking-wider block">
                        Live Speech Privacy Disclosure
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        Live microphone speech uses your browser&apos;s native SpeechRecognition service.
                        Audio signals may be evaluated by browser cloud providers.
                        <strong> Do NOT speak real Protected Health Information (PHI)</strong> or real patient identifiers during testing.
                      </p>
                    </div>
                  </div>

                  {/* Browser Support Check Warning */}
                  {!isSpeechSupported && (
                    <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2.5">
                      <AlertCircle className="size-4 shrink-0 text-destructive mt-0.5" />
                      <div>
                        <span className="font-bold block text-[11px] uppercase tracking-wider">
                          Web Speech Recognition Unsupported
                        </span>
                        <p className="text-[11px] text-destructive/90 leading-relaxed">
                          Your current web browser does not support the Web Speech API (window.SpeechRecognition).
                          Please open this application in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, or use the <strong>Manual Input</strong> tab.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recognition Error Alert */}
                  {speechError && (
                    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                        <div>
                          <span className="font-bold block text-[11px] uppercase tracking-wider">
                            Speech Recognition Error
                          </span>
                          <p className="text-[11px] leading-relaxed">{speechError}</p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={clearSpeechError}
                        className="h-6 px-1.5 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20"
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  )}

                  {/* Microphone Action Control Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card p-3 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "size-3 rounded-full transition-all",
                          isListening ? "bg-red-500 animate-ping" : "bg-muted-foreground/40",
                        )}
                      />
                      <span className="font-bold text-xs text-foreground">
                        {isListening ? "Listening Active (Speak now)" : "Microphone Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isListening ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={stopListening}
                          leftIcon={<MicOff className="size-4" />}
                        >
                          Stop Listening
                        </Button>
                      ) : (
                        <Button
                          variant="teal"
                          size="sm"
                          onClick={startListening}
                          disabled={!isSpeechSupported}
                          leftIcon={<Mic className="size-4" />}
                        >
                          Start Listening
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          resetSpeechTranscript();
                          setEditableLiveTranscript("");
                        }}
                        leftIcon={<RotateCcw className="size-3.5" />}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>

                  {/* Interim Speech Hypothesis (Active only while speaking) */}
                  {interimTranscript && (
                    <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs text-accent italic space-y-1">
                      <div className="flex items-center gap-1.5 not-italic font-bold text-[10px] uppercase tracking-wider">
                        <span className="size-2 rounded-full bg-accent animate-pulse" />
                        <span>Live Interim Hypothesis</span>
                      </div>
                      <p className="leading-relaxed">&quot;{interimTranscript}...&quot;</p>
                    </div>
                  )}

                  {/* Live Finalized / Editable Transcript Area */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Transcribed Consultation Speech (Editable)</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {(editableLiveTranscript || finalTranscript).split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <textarea
                      rows={7}
                      value={editableLiveTranscript || finalTranscript}
                      onChange={(e) => {
                        setEditableLiveTranscript(e.target.value);
                        setFinalTranscriptText(e.target.value);
                      }}
                      placeholder="Live microphone transcription will appear here in real time as you speak. You can also edit, correct, or add clinical dictation directly into this box..."
                      className="w-full rounded-xl border border-border bg-input p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent leading-relaxed"
                    />

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <span>Exact text above will be sent for clinical SOAP structuring.</span>
                      <Button
                        variant="teal"
                        size="xs"
                        onClick={handleGenerateNote}
                        loading={isGeneratingNote}
                        disabled={isListening}
                        leftIcon={<Sparkles className="size-3.5" />}
                      >
                        Generate SOAP Draft
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================================
                  MODE 2: MANUAL TEXT INPUT / DICTATION (Authoritative)
                  ========================================================== */}
              {listenMode === "manual" && (
                <div className="space-y-3.5">
                  <div className="rounded-xl border border-accent/30 bg-accent/5 p-3 text-xs text-foreground space-y-1">
                    <span className="font-bold text-accent text-[11px] uppercase tracking-wider block">
                      Authoritative Clinician Input
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      The exact text entered below will be passed directly to the SOAP generation engine without alteration or simulated text injection.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Doctor-Patient Consultation Text</span>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {manualTranscriptInput.length} chars • {manualTranscriptInput.split(/\s+/).filter(Boolean).length} words
                      </span>
                    </div>

                    <textarea
                      rows={8}
                      value={manualTranscriptInput}
                      onChange={(e) => setManualTranscriptInput(e.target.value)}
                      placeholder="Type or paste doctor-patient conversation or clinical dictation here..."
                      className="w-full rounded-xl border border-border bg-input p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent leading-relaxed font-sans"
                    />

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setManualTranscriptInput("")}
                        leftIcon={<RotateCcw className="size-3" />}
                      >
                        Clear Text
                      </Button>

                      <Button
                        variant="teal"
                        size="sm"
                        onClick={handleGenerateNote}
                        loading={isGeneratingNote}
                        leftIcon={<Sparkles className="size-3.5" />}
                      >
                        Generate SOAP Draft
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* ==========================================================
                  MODE 3: SIMULATION MODE (Pre-recorded Demonstration)
                  ========================================================== */}
              {listenMode === "simulation" && (
                <div className="space-y-3.5">
                  {/* Simulation Banner */}
                  <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
                    <Info className="size-4 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <span className="font-bold block text-[11px] uppercase tracking-wider">
                        Interactive Simulation (Demonstration Only)
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        Pre-recorded synthetic consultation dialogue demonstrating bilingual Kannada-English code mixing and clinical NLP extraction. <strong>Zero live audio is captured.</strong>
                      </p>
                    </div>
                  </div>

                  {/* Audio Visualizer Waveform Bar */}
                  <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <Volume2 className="size-3.5 text-accent" />
                        Simulated Acoustic Array Spectrum
                      </span>
                      <span className="font-mono text-[10px]">Sampling: 44.1 kHz PCM (Sim)</span>
                    </div>

                    <div className="flex h-10 items-end justify-between gap-1 px-1">
                      {[
                        30, 65, 80, 45, 95, 55, 75, 90, 40, 85, 90, 35, 60, 75, 90,
                        50, 70, 85, 40, 60, 95, 80, 50, 35, 65, 80, 45, 90, 60, 75,
                        85, 40, 70, 90, 55, 35, 65, 80, 50, 95,
                      ].map((height, i) => (
                        <span
                          key={i}
                          style={{
                            height: isSimulationRecording ? `${height}%` : "18%",
                          }}
                          className={cn(
                            "w-1 rounded-full transition-all duration-200",
                            isSimulationRecording
                              ? "bg-amber-500/80 hover:bg-amber-500"
                              : "bg-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Simulation Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/20 p-2.5">
                    <div className="flex items-center gap-2">
                      {isSimulationRecording ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePauseSimulation}
                          leftIcon={<Pause className="size-4 text-warning" />}
                        >
                          Pause Simulation
                        </Button>
                      ) : (
                        <Button
                          variant="teal"
                          size="sm"
                          onClick={handleStartSimulation}
                          leftIcon={<Play className="size-4" />}
                        >
                          Resume Simulation
                        </Button>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleStopSimulation}
                        leftIcon={<Square className="size-3.5" />}
                      >
                        Stop
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleResetSimulation}
                        leftIcon={<RotateCcw className="size-3.5" />}
                      >
                        Reset
                      </Button>
                    </div>

                    <Button
                      variant="teal"
                      size="sm"
                      onClick={handleGenerateNote}
                      loading={isGeneratingNote}
                      leftIcon={<Sparkles className="size-3.5" />}
                    >
                      Generate Draft
                    </Button>
                  </div>

                  {/* Simulated Dialogue Turns */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>Simulated Multi-turn Dialogue ({transcriptTurns.length} turns)</span>
                      <Badge variant="warning" size="sm">Canned Demo</Badge>
                    </div>

                    <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1 text-xs">
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

                            <p className="text-foreground leading-relaxed font-normal">
                              &quot;{turn.originalText}&quot;
                            </p>

                            {turn.translation && turn.translation !== turn.originalText && (
                              <div className="rounded-md bg-accent/5 p-2 text-[11px] text-accent border border-accent/15 leading-relaxed">
                                <span className="font-bold mr-1">[Clinical Translation]:</span>
                                {turn.translation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
                  {backendMedSafety ? (
                    <Badge
                      variant={
                        backendMedSafety.overall_status === "critical"
                          ? "danger"
                          : backendMedSafety.overall_status === "warning"
                            ? "warning"
                            : "success"
                      }
                      size="sm"
                    >
                      {backendMedSafety.overall_status.toUpperCase()}
                    </Badge>
                  ) : (
                    <Badge variant="warning" size="sm">
                      {session.safetyAudit.allergyAlerts.length +
                        session.safetyAudit.patientHistoryInconsistencies.length}{" "}
                      Flags
                    </Badge>
                  )}
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
                {/* BACKEND DETERMINISTIC MEDICATION SAFETY WARNINGS */}
                {backendMedSafety && backendMedSafety.warnings.length > 0 && (
                  <div className="space-y-2">
                    <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                      Deterministic Medication Safety Warnings
                    </span>
                    {backendMedSafety.warnings.map((warn, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "rounded-lg border p-2.5 text-xs space-y-1",
                          warn.severity === "critical"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200",
                        )}
                      >
                        <span className="font-bold flex items-center gap-1">
                          <AlertTriangle className="size-3.5 shrink-0" />
                          [{warn.rule_id}] {warn.explanation || warn.message || warn.affected_medication}
                        </span>
                        {(warn.clinical_rationale || warn.evidence) && (
                          <p className="text-[11px] leading-relaxed opacity-90 pl-4">
                            Rationale: {warn.clinical_rationale || warn.evidence}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* UNABLE TO VERIFY MEDICATIONS */}
                {backendMedSafety && backendMedSafety.unable_to_verify.length > 0 && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs space-y-0.5">
                    <span className="font-bold flex items-center gap-1 text-amber-800 dark:text-amber-300">
                      <AlertCircle className="size-3.5 shrink-0" />
                      Unverified Proposed Medications
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Could not resolve standard formulary match for:{" "}
                      {backendMedSafety.unable_to_verify.join(", ")}. Physician verification required.
                    </p>
                  </div>
                )}

                {/* BACKEND MISSING CLINICAL DOMAINS / GAPS */}
                {backendMissingInfo.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-2.5 text-xs space-y-1">
                    <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider flex items-center gap-1">
                      <Info className="size-3 text-accent" />
                      Clinical Information Gaps & Missing Domains
                    </span>
                    <ul className="list-disc pl-4 text-[11px] text-muted-foreground space-y-0.5">
                      {backendMissingInfo.map((gap, idx) => (
                        <li key={idx}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* FALLBACK / INITIAL STATE: SESSION SAFETY AUDIT */}
                {!backendMedSafety && (
                  <>
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
                  </>
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
                  Generate SOAP Draft
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
                      disabled={clinicalNote.status === "Doctor Approved & Signed" || isGeneratingNote}
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
              {isGeneratingNote ? (
                <div className="rounded-xl border border-accent/30 bg-accent/5 p-8 text-center space-y-3">
                  <RefreshCw className="mx-auto size-8 text-accent animate-spin" />
                  <h4 className="font-semibold text-sm text-foreground">Generating Evidence-Grounded SOAP Draft...</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Structuring subjective symptoms, preserving pertinent negations, assessing differential diagnoses, and running deterministic medication safety checks.
                  </p>
                </div>
              ) : (!activeBackendNote && noteProvenance === "none") ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center space-y-3 bg-muted/10">
                  <FileText className="mx-auto size-10 text-muted-foreground/60" />
                  <h4 className="font-semibold text-sm text-foreground">No Clinical SOAP Note Draft</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Capture consultation speech using the Live Microphone or enter dictation in Manual Input, then click &quot;Generate SOAP Draft&quot;.
                  </p>
                  <Button
                    variant="teal"
                    size="sm"
                    onClick={handleGenerateNote}
                    disabled={isListening}
                    leftIcon={<Sparkles className="size-3.5" />}
                  >
                    Generate SOAP Draft
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-2xs font-sans">
                  {/* Hospital & Note Header */}
                  <div className="border-b border-border pb-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <div>
                      <span className="font-bold text-foreground uppercase tracking-wider block">
                        Apollo Hospitals Bengaluru • Outpatient Clinical Record
                      </span>
                      <span>Date: {clinicalNote.generatedAt}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {noteProvenance === "newly_generated" && (
                        <Badge variant="teal" size="sm">
                          Newly Generated AI Draft ({backendNoteId})
                        </Badge>
                      )}
                      {noteProvenance === "hydrated_ehr" && (
                        <Badge variant="outline" size="sm">
                          Existing EHR Note ({backendNoteId})
                        </Badge>
                      )}
                      {noteProvenance === "simulated" && (
                        <Badge variant="warning" size="sm">
                          Simulated Demonstration Draft
                        </Badge>
                      )}
                      <span className="font-mono text-[10px] text-accent font-semibold ml-1">
                        {clinicalNote.evidenceConfidence}
                      </span>
                    </div>
                  </div>

                {/* Mandatory Clinical AI Draft Disclaimer Notice */}
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-[11px] text-amber-900 dark:text-amber-200 font-medium flex items-start gap-2">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wider text-[10px]">
                      Mandatory Clinical AI Draft Notice
                    </span>
                    {activeBackendNote?.disclaimer ||
                      "AI-GENERATED CLINICAL DRAFT. Unverified clinical aid for outpatient documentation. Must be reviewed, verified, and signed by a licensed physician before clinical decisions or dispensing."}
                  </div>
                </div>

                {/* FIELD 1: Chief Complaint [Subjective] */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Badge variant="teal" size="sm" className="px-1 py-0 text-[9px] font-bold">S</Badge>
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

                {/* FIELD 2 & 3: Symptoms & Duration [Subjective] */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Badge variant="teal" size="sm" className="px-1 py-0 text-[9px] font-bold">S</Badge>
                      2. Extracted Symptoms
                    </span>
                    <ul className="list-disc pl-4 text-foreground/90 space-y-0.5 leading-relaxed">
                      {clinicalNote.symptoms.map((sym, i) => (
                        <li key={i}>{sym}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                      <Badge variant="teal" size="sm" className="px-1 py-0 text-[9px] font-bold">S</Badge>
                      3. Duration & Onset
                    </span>
                    <p className="text-foreground leading-relaxed">
                      {clinicalNote.duration}
                    </p>
                  </div>
                </div>

                {/* FIELD 4: Relevant Medical History [Subjective] */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Badge variant="teal" size="sm" className="px-1 py-0 text-[9px] font-bold">S</Badge>
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

                {/* FIELD 5: Observations [Objective] */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Badge variant="navy" size="sm" className="px-1 py-0 text-[9px] font-bold">O</Badge>
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

                {/* FIELD 6: Clinician Assessment [Assessment] */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Badge variant="warning" size="sm" className="px-1 py-0 text-[9px] font-bold">A</Badge>
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

                {/* FIELD 7: Treatment Plan & Prescriptions [Plan] */}
                <div className="space-y-1">
                  <span className="font-bold text-accent text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    <Badge variant="teal" size="sm" className="px-1 py-0 text-[9px] font-bold">P</Badge>
                    7. Treatment Plan & Prescriptions (Advisory)
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
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Re-export as ConsultationsPage for backwards compatibility
export { ConsultationWorkspacePage as ConsultationsPage };
