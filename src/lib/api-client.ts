/**
 * AAROGYA MITHRA — Frontend API Client
 *
 * Connects the React client to the FastAPI clinical backend for:
 * 1. AI-assisted SOAP draft generation (Gemini / Offline Mock)
 * 2. Physician review, edit, and electronic sign-off workflow
 * 3. Synthetic patient and encounter context retrieval
 * 4. Deterministic medication safety alerts and contraindications
 */

import axios from "axios";

// Default to backend on port 8000 (or Vite proxy / environment override)
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 35000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

export interface ExtractedItem {
  text: string;
  source_evidence?: string | null;
  is_negated: boolean;
  uncertainty_qualifier?: string | null;
}

export interface SubjectiveSection {
  chief_complaint: string;
  history_of_present_illness: string;
  reported_symptoms: string[];
  pertinent_negatives: string[];
  evidence?: ExtractedItem[];
}

export interface ObjectiveSection {
  vital_signs_summary?: string | null;
  physical_examination: string[];
  investigations_reviewed: string[];
  evidence?: ExtractedItem[];
}

export interface AssessmentSection {
  primary_impression: string;
  differential_diagnoses: string[];
  chronic_conditions_status: string[];
  evidence?: ExtractedItem[];
}

export interface PlanSection {
  diagnostic_workup: string[];
  proposed_medications: string[];
  patient_instructions: string[];
  red_flag_warnings: string[];
  follow_up?: string | null;
  evidence?: ExtractedItem[];
}

export interface SOAPPatientContext {
  demographics_summary?: string | null;
  allergy_status?: string | null;
  documented_allergies: string[];
  patient_reported_allergies: string[];
  unverified_allergies: string[];
  active_medications: string[];
  historical_or_discontinued_medications: string[];
  chronic_conditions: string[];
  past_medical_history: string[];
  historical_vitals_summary?: string | null;
  clinical_alerts: string[];
  is_synthetic?: boolean;
}

export interface MedicationWarning {
  rule_id: string;
  severity: "critical" | "warning" | "advisory" | "info" | string;
  message?: string;
  explanation?: string;
  affected_medication?: string;
  category?: string;
  clinical_rationale?: string;
  evidence?: string;
  contraindicated_allergen?: string;
  interacting_medication?: string;
}

export interface SOAPMedicationSafetyReport {
  overall_status: "passed" | "warning" | "critical";
  evaluation_timestamp?: string;
  warnings: MedicationWarning[];
  unable_to_verify: string[];
  has_critical_contraindication?: boolean;
  has_warning?: boolean;
  has_unable_to_verify?: boolean;
}

export interface SOAPPayload {
  subjective: SubjectiveSection;
  objective: ObjectiveSection;
  assessment: AssessmentSection;
  plan: PlanSection;
  patient_context?: SOAPPatientContext | null;
  medication_safety?: SOAPMedicationSafetyReport | null;
}

export interface SOAPGenerateRequest {
  consultation_text: string;
  patient_id?: string | null;
  encounter_id?: string | null;
  language_code?: string;
}

export interface NoteReviewRequest {
  reviewing_doctor: string;
  action: "approved" | "reviewed_with_edits" | "rejected";
  edited_soap?: SOAPPayload | null;
  doctor_comments?: string | null;
}

export interface ClinicalSOAPNoteResponse {
  id: number;
  note_id: string;
  status: "draft" | "reviewed_with_edits" | "approved" | "rejected";
  is_ai_generated: boolean;
  disclaimer: string;
  patient_id?: string | null;
  encounter_id?: string | null;
  language_code: string;
  consultation_text: string;
  soap: SOAPPayload;
  unextracted_or_missing: string[];
  confidence_notes?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  reviewing_doctor?: string | null;
  doctor_comments?: string | null;
  edited_soap?: SOAPPayload | null;
  patient_context?: SOAPPatientContext | null;
  medication_safety?: SOAPMedicationSafetyReport | null;
}

export interface BackendPatient {
  id: number;
  patient_id: string;
  full_name: string;
  gender: string;
  age: number;
  preferred_language: string;
  is_synthetic: boolean;
}

export interface BackendEncounter {
  id: number;
  encounter_id: string;
  patient_id: string;
  doctor_name: string;
  chief_complaint: string;
  consultation_date: string;
  status: string;
  is_synthetic: boolean;
}

/**
 * Generate a new clinical SOAP note draft via backend API.
 * Calls either Gemini adapter or deterministic mock depending on backend configuration.
 */
export async function generateClinicalSOAPNote(
  request: SOAPGenerateRequest,
): Promise<ClinicalSOAPNoteResponse> {
  const response = await apiClient.post<ClinicalSOAPNoteResponse>(
    "/api/v1/clinical-notes/generate",
    request,
  );
  return response.data;
}

/**
 * Retrieve an existing clinical SOAP note by its note_id.
 */
export async function getClinicalSOAPNote(
  noteId: string,
): Promise<ClinicalSOAPNoteResponse> {
  const response = await apiClient.get<ClinicalSOAPNoteResponse>(
    `/api/v1/clinical-notes/${noteId}`,
  );
  return response.data;
}

/**
 * Physician review, edit, and sign-off on a clinical SOAP note.
 */
export async function reviewClinicalSOAPNote(
  noteId: string,
  review: NoteReviewRequest,
): Promise<ClinicalSOAPNoteResponse> {
  const response = await apiClient.patch<ClinicalSOAPNoteResponse>(
    `/api/v1/clinical-notes/${noteId}/review`,
    review,
  );
  return response.data;
}

/**
 * Fetch registered synthetic patients from backend API.
 */
export async function fetchBackendPatients(): Promise<BackendPatient[]> {
  try {
    const response = await apiClient.get<BackendPatient[]>("/api/v1/patients");
    return response.data;
  } catch (err) {
    console.warn("Unable to fetch patients from backend; using local synthetic records.", err);
    return [];
  }
}

/**
 * Fetch patient encounters from backend API.
 */
export async function fetchPatientEncounters(patientId: string): Promise<BackendEncounter[]> {
  try {
    const response = await apiClient.get<BackendEncounter[]>(
      `/api/v1/patients/${patientId}/history`,
    );
    return response.data;
  } catch (err) {
    console.warn(`Unable to fetch encounters for patient ${patientId}`, err);
    return [];
  }
}
