/**
 * AAROGYA MITHRA / COLOSSUS — Workflow Visualization Service Layer
 *
 * Data structures, node presets, initial directed acyclic graph (DAG),
 * and export/import helpers for the interactive clinical workflow orchestrator.
 */

import type { Node, Edge } from "@xyflow/react";
import { workflowSteps, type WorkflowStep } from "@/components/landing/interactive-workflow-section";

export type WorkflowNodeCategory =
  | "Trigger"
  | "AI Processing"
  | "Safety"
  | "Review"
  | "Delivery";

export type WorkflowNodeStatus =
  | "Operational"
  | "Streaming"
  | "Transcribing"
  | "Processed"
  | "Synced"
  | "Gated (Hard-Stop Active)"
  | "Awaiting Physician Sign-Off"
  | "Delivered & Locked"
  | "Custom Idle";

export interface ClinicalNodeTemplate {
  label: string;
  code: string;
  stage: string;
  category: WorkflowNodeCategory;
  actor: string;
  summary: string;
  processingType: string;
  inputs: string[];
  outputs: string[];
  copilotProcessing: string[];
  safetyGate: string;
  status: WorkflowNodeStatus;
  routeLink: string;
  routeLabel: string;
}

export interface ClinicalNodeData extends ClinicalNodeTemplate, Record<string, unknown> {
  id: string;
  stepId: number;
  isCustom?: boolean;
}

export type ClinicalNode = Node<ClinicalNodeData, "clinicalNode">;

/**
 * Canonical 8-Node Orchestration Topology
 */
export const initialWorkflowNodes: ClinicalNode[] = [
  {
    id: "node-1",
    type: "clinicalNode",
    position: { x: 50, y: 160 },
    data: {
      id: "node-1",
      stepId: 1,
      label: "Patient Check-in",
      code: "CHECKIN",
      stage: "OPD Triage",
      category: "Trigger",
      actor: "Nurse / Frontdesk",
      summary: "Patient arrives at outpatient department, receives digital queue token, and nursing staff logs baseline vital signs.",
      processingType: "Trigger Event • Queue Management & Demographic Ingestion",
      inputs: [
        "National Health ID / Hospital MRN",
        "Current Blood Pressure, Pulse, SpO2",
        "Self-reported primary chief complaint",
      ],
      outputs: [
        "Active OPD queue token",
        "Linked baseline vitals card",
        "Encounter session ID",
      ],
      copilotProcessing: [
        "Initializes patient encounter session",
        "Retrieves historical record links from central hospital registry",
      ],
      safetyGate: "Nurse verification of patient identity and emergency triage threshold (red/yellow/green).",
      status: "Operational",
      routeLink: "/app/patients",
      routeLabel: "View Patient Directory",
    },
  },
  {
    id: "node-2",
    type: "clinicalNode",
    position: { x: 420, y: 60 },
    data: {
      id: "node-2",
      stepId: 2,
      label: "Consultation Capture",
      code: "CAPTURE",
      stage: "Ambient Stream",
      category: "AI Processing",
      actor: "Ambient AI",
      summary: "Doctor initiates visit. Ambient dual-microphone array captures doctor-patient conversation unobtrusively.",
      processingType: "AI Processing • Dual-Channel Acoustic Beamforming & Noise Filtration",
      inputs: [
        "Ambient spoken consultation audio",
        "Doctor physical examination remarks",
        "Doctor verbal instructions to patient",
      ],
      outputs: [
        "Encrypted dual-channel 44.1 kHz PCM audio stream",
        "Speaker diarization boundaries (Doctor vs. Patient)",
      ],
      copilotProcessing: [
        "Acoustic echo cancellation and ambient OPD room noise filtration",
        "Speaker diarization isolating physician queries from patient responses",
      ],
      safetyGate: "Visual recording indicator light in consultation room for transparent patient awareness and consent.",
      status: "Streaming",
      routeLink: "/app/consultations",
      routeLabel: "Open Consultation Scribe",
    },
  },
  {
    id: "node-3",
    type: "clinicalNode",
    position: { x: 790, y: 60 },
    data: {
      id: "node-3",
      stepId: 3,
      label: "Multilingual Speech Transcription",
      code: "LISTEN",
      stage: "Speech-to-Clinical",
      category: "AI Processing",
      actor: "Copilot Engine",
      summary: "Processes spoken Kannada, Hindi, and English into clinical terminology with full code-mixing comprehension.",
      processingType: "AI Processing • Dialect-Aware Whisper-Large-v3 + Indian Medical NER",
      inputs: [
        "Spoken dialogue across mixed regional Indian dialects (Kannada, Hindi, English)",
        "Colloquial symptom phrases (e.g. 'Hotte uri', 'Chhati mein jalan')",
      ],
      outputs: [
        "Normalized clinical dialogue transcript",
        "Extracted clinical symptom tags & ICD-10 suggestions",
        "Explicit patient negation markers",
      ],
      copilotProcessing: [
        "Dialect-aware Automatic Speech Recognition (ASR) tuned on Indian medical phonemes",
        "Clinical Named Entity Recognition (NER) mapping vernacular to SNOMED CT",
        "Negation & uncertainty extraction (e.g., 'No chest pain', 'vomiting absent')",
      ],
      safetyGate: "Preserves exact symptom duration, temporal anchors, and patient-negated complaints without LLM hallucination.",
      status: "Transcribing",
      routeLink: "/app/consultations",
      routeLabel: "Open Multilingual Scribe",
    },
  },
  {
    id: "node-4",
    type: "clinicalNode",
    position: { x: 420, y: 340 },
    data: {
      id: "node-4",
      stepId: 4,
      label: "Medical Document Extraction",
      code: "READ",
      stage: "Multimodal OCR",
      category: "AI Processing",
      actor: "Copilot Engine",
      summary: "Ingests scanned physical paper prescriptions, external pathology PDFs, and laboratory result sheets.",
      processingType: "AI Processing • Multimodal Optical Character Recognition (OCR) & Reference Parsing",
      inputs: [
        "Camera captures of physical paper lab slips",
        "NABL-accredited diagnostic PDF uploads",
        "Previous handwritten doctor prescriptions",
      ],
      outputs: [
        "Structured discrete laboratory biomarkers (HbA1c, eGFR, Lipid profile)",
        "Standardized reference intervals & high/low flags",
        "Extracted prior medication list",
      ],
      copilotProcessing: [
        "Optical Character Recognition (OCR) with character-level confidence scoring",
        "Reference range normalization & out-of-bounds biomarker tagging",
        "Generic molecule resolution from Indian brand trade names",
      ],
      safetyGate: "Every extracted number links back to the exact pixel coordinates on the source document for instant clinician verification.",
      status: "Processed",
      routeLink: "/app/reports",
      routeLabel: "Open Medical Report Intelligence",
    },
  },
  {
    id: "node-5",
    type: "clinicalNode",
    position: { x: 1160, y: 180 },
    data: {
      id: "node-5",
      stepId: 5,
      label: "Patient Context Engine",
      code: "CONNECT",
      stage: "Longitudinal Graph",
      category: "AI Processing",
      actor: "Copilot Engine",
      summary: "Synthesizes today's symptoms with past clinic visits, known allergies, chronic histories, and external lab results.",
      processingType: "AI Processing • Longitudinal Graph Synthesis & Conflict Resolver",
      inputs: [
        "Current consultation entities & symptom timeline",
        "Extracted diagnostic report values & trend lines",
        "Historical hospital encounters & recorded allergy profile",
      ],
      outputs: [
        "Unified chronological patient timeline",
        "Cross-visit clinical discrepancy alerts",
        "Aggregated active medication baseline",
      ],
      copilotProcessing: [
        "Timeline alignment across disparate health sources into a unified patient graph",
        "Information conflict detection (e.g., patient stopped drug due to side effects vs old chart)",
      ],
      safetyGate: "Flags discrepancies between patient verbal statements and historical medical records before medication selection.",
      status: "Synced",
      routeLink: "/app/patients",
      routeLabel: "Open Patient Context Panel",
    },
  },
  {
    id: "node-6",
    type: "clinicalNode",
    position: { x: 1530, y: 180 },
    data: {
      id: "node-6",
      stepId: 6,
      label: "Medication Safety Engine",
      code: "SAFEGUARD",
      stage: "Deterministic Check",
      category: "Safety",
      actor: "Copilot Engine",
      summary: "Evaluates proposed treatment against drug interactions, allergy cross-reactivity, renal dosing, and therapeutic duplication.",
      processingType: "Safety Gate • Deterministic Pharmacology Rules Matrix (CDSCO, BNF, FDA)",
      inputs: [
        "Proposed prescription molecules & target dosages",
        "Active medications from prior visits",
        "Documented drug allergies & eGFR / LFT biomarkers",
      ],
      outputs: [
        "Pre-signing safety verification matrix",
        "Allergy hard-stop alerts (Penicillin, Aspirin)",
        "Evidence citations & safe alternative recommendations",
      ],
      copilotProcessing: [
        "Deterministic rules engine checking 14,280 CDSCO & BNF pharmacopeia signatures",
        "Allergy cross-reactivity tree screening (beta-lactam ring, NSAID hypersensitivity)",
        "Renal dosage threshold and polyvalent chelation calculations",
      ],
      safetyGate: "Hard-stop warning on life-threatening contraindications; evidence references supplied for every alert. Zero LLM hallucination.",
      status: "Gated (Hard-Stop Active)",
      routeLink: "/app/safety",
      routeLabel: "Open Medication Safety Engine",
    },
  },
  {
    id: "node-7",
    type: "clinicalNode",
    position: { x: 1900, y: 180 },
    data: {
      id: "node-7",
      stepId: 7,
      label: "Doctor Review",
      code: "REVIEW",
      stage: "Human Oversight Gate",
      category: "Review",
      actor: "Treating Physician",
      summary: "The doctor reviews the comprehensive SOAP draft, adjusts medication choices, modifies instructions, and verifies accuracy.",
      processingType: "Review Gate • Mandatory Human-in-the-Loop Clinical Verification",
      inputs: [
        "AAROGYA MITHRA synthesized draft SOAP note",
        "Prescription recommendations & active safety alerts",
        "Treating physician's clinical judgment & examination findings",
      ],
      outputs: [
        "Clinician-authenticated consultation summary",
        "Approved and finalized prescription items",
        "Doctor review rationale notes",
      ],
      copilotProcessing: [
        "Real-time structured document editing interface",
        "Instant recalculation if doctor updates prescribed molecules",
      ],
      safetyGate: "MANDATORY HUMAN GATE: No output is finalized or committed to medical records without explicit doctor sign-off.",
      status: "Awaiting Physician Sign-Off",
      routeLink: "/app/consultations",
      routeLabel: "Open Review Workspace",
    },
  },
  {
    id: "node-8",
    type: "clinicalNode",
    position: { x: 2270, y: 180 },
    data: {
      id: "node-8",
      stepId: 8,
      label: "Approved Clinical Note",
      code: "APPROVE",
      stage: "Final Documentation",
      category: "Delivery",
      actor: "Hospital System",
      summary: "Final authenticated note is committed to the hospital EMR, transmitted to the hospital pharmacy, and printed for the patient.",
      processingType: "Delivery • ABDM-Compliant FHIR Export & Multilingual Patient Care Slip",
      inputs: [
        "Doctor cryptographic electronic signature stamp",
        "Approved SOAP record & diagnosis codes",
        "Patient discharge instructions & follow-up timeline",
      ],
      outputs: [
        "Signed EMR record committed to hospital database",
        "Direct pharmacy dispensing order",
        "Patient care slip in Kannada / Hindi for home adherence",
      ],
      copilotProcessing: [
        "FHIR-compliant JSON export bundle for ABDM compliance",
        "Patient vernacular summary generation in Kannada/Hindi for home care",
      ],
      safetyGate: "Cryptographically signed clinical record adhering to ABDM guidelines and hospital audit standards.",
      status: "Delivered & Locked",
      routeLink: "/app/consultations",
      routeLabel: "View Signed Record",
    },
  },
];

/**
 * Initial Connection Edges with Animated Flow & Markers
 */
export const initialWorkflowEdges: Edge[] = [
  {
    id: "e1-2",
    source: "node-1",
    target: "node-2",
    animated: true,
    label: "Triage Intake",
    style: { stroke: "#0D9488", strokeWidth: 2 },
  },
  {
    id: "e1-4",
    source: "node-1",
    target: "node-4",
    animated: true,
    label: "Physical Slips",
    style: { stroke: "#0D9488", strokeWidth: 2 },
  },
  {
    id: "e2-3",
    source: "node-2",
    target: "node-3",
    animated: true,
    label: "Audio Stream (44.1kHz)",
    style: { stroke: "#0D9488", strokeWidth: 2 },
  },
  {
    id: "e3-5",
    source: "node-3",
    target: "node-5",
    animated: true,
    label: "Spoken Entities (NER)",
    style: { stroke: "#0D9488", strokeWidth: 2 },
  },
  {
    id: "e4-5",
    source: "node-4",
    target: "node-5",
    animated: true,
    label: "Discrete Biomarkers",
    style: { stroke: "#0D9488", strokeWidth: 2 },
  },
  {
    id: "e5-6",
    source: "node-5",
    target: "node-6",
    animated: true,
    label: "Patient Timeline & Rx",
    style: { stroke: "#F59E0B", strokeWidth: 2.5 },
  },
  {
    id: "e6-7",
    source: "node-6",
    target: "node-7",
    animated: true,
    label: "Safety Matrix Gated",
    style: { stroke: "#102A43", strokeWidth: 2.5 },
  },
  {
    id: "e7-8",
    source: "node-7",
    target: "node-8",
    animated: true,
    label: "Doctor E-Signature",
    style: { stroke: "#16A34A", strokeWidth: 2.5 },
  },
];

/**
 * Templates for adding a custom workflow node
 */
export const customNodeTemplates: ClinicalNodeTemplate[] = [
  {
    label: "Telehealth Audio/Video Relay",
    code: "TELEHEALTH",
    stage: "Remote Consultation",
    category: "AI Processing",
    actor: "Ambient AI",
    summary: "Captures remote video consultation stream via WebRTC with live packet loss concealment.",
    processingType: "AI Processing • WebRTC Stream Demuxing & Low-Latency Buffer",
    inputs: ["Remote patient video feed", "WebRTC Opus audio stream"],
    outputs: ["Diarized audio chunks", "Remote clinical examination snapshots"],
    copilotProcessing: ["Audio stream demuxing", "Bandwidth-adaptive voice sampling"],
    safetyGate: "Patient informed consent prompt before video recording commences.",
    status: "Custom Idle",
    routeLink: "/app/consultations",
    routeLabel: "Open Telehealth Workspace",
  },
  {
    label: "External Laboratory Dispatch",
    code: "LABORDER",
    stage: "Diagnostic Order",
    category: "Delivery",
    actor: "Hospital System",
    summary: "Dispatches requested pathology orders directly to central hospital LIMS with test codes.",
    processingType: "Delivery • HL7 / FHIR Diagnostic Order Messaging",
    inputs: ["Physician lab test selections", "Fasting condition prerequisites"],
    outputs: ["LIMS laboratory requisition order", "Patient phlebotomy barcode token"],
    copilotProcessing: ["HL7 ORM message formatting", "Phlebotomy queue assignment"],
    safetyGate: "Confirmation that required patient prep (e.g. 12-hour fasting) is verified.",
    status: "Custom Idle",
    routeLink: "/app/reports",
    routeLabel: "View Diagnostic Orders",
  },
  {
    label: "ABDM Health Locker Sync",
    code: "ABDM",
    stage: "National Health Stack",
    category: "Delivery",
    actor: "Hospital System",
    summary: "Publishes signed encounter milestone to Ayushman Bharat Digital Mission (ABDM) Personal Health Record.",
    processingType: "Delivery • ABDM M3 Milestone HIP Gateway Serialization",
    inputs: ["Signed FHIR diagnostic report bundle", "Patient ABHA ID"],
    outputs: ["ABDM encrypted health record artifact", "Consent artifact acknowledgement"],
    copilotProcessing: ["HIP payload encryption", "National registry verification"],
    safetyGate: "Active patient consent artifact validation prior to record federation.",
    status: "Custom Idle",
    routeLink: "/app/patients",
    routeLabel: "View ABDM Sync Status",
  },
];
