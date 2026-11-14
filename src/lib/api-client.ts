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

// Attach authenticated physician Bearer JWT token to every request
apiClient.interceptors.request.use((config) => {
  try {
    const token =
      localStorage.getItem("aarogya_auth_token") ||
      sessionStorage.getItem("aarogya_auth_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    // Graceful fallback in non-browser environments
  }
  return config;
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

export interface NoteDraftUpdateRequest {
  edited_soap: SOAPPayload;
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
 * Save draft amendments to an existing clinical SOAP note without approving.
 * Persists modifications to SQLite backend and re-evaluates medication safety.
 */
export async function saveClinicalSOAPNoteDraft(
  noteId: string,
  draftUpdate: NoteDraftUpdateRequest,
): Promise<ClinicalSOAPNoteResponse> {
  const response = await apiClient.patch<ClinicalSOAPNoteResponse>(
    `/api/v1/clinical-notes/${noteId}/draft`,
    draftUpdate,
  );
  return response.data;
}

/**
 * List clinical SOAP notes with optional status and patient filtering.
 */
export async function listClinicalSOAPNotes(
  statusFilter?: string,
  patientId?: string,
): Promise<ClinicalSOAPNoteResponse[]> {
  try {
    const params: Record<string, string> = {};
    if (statusFilter) params.status_filter = statusFilter;
    if (patientId) params.patient_id = patientId;
    const response = await apiClient.get<ClinicalSOAPNoteResponse[]>(
      "/api/v1/clinical-notes",
      { params },
    );
    return response.data;
  } catch (err) {
    console.warn("Unable to fetch clinical notes from backend", err);
    return [];
  }
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

export interface BackendPatientCreate {
  full_name: string;
  age?: number;
  gender?: string;
  phone_number?: string;
  preferred_language?: string;
  patient_id?: string;
  is_synthetic?: boolean;
}

/**
 * Register a new patient in the SQLite backend database.
 */
export async function createBackendPatient(
  patient: BackendPatientCreate,
): Promise<BackendPatient> {
  const response = await apiClient.post<BackendPatient>(
    "/api/v1/patients",
    patient,
  );
  return response.data;
}

export interface BackendPatientUpdate {
  full_name?: string;
  age?: number;
  date_of_birth?: string;
  gender?: string;
  phone_number?: string;
  preferred_language?: string;
}

/**
 * Update an existing patient's demographic details in the SQLite backend database.
 */
export async function updateBackendPatient(
  patientId: string,
  updates: BackendPatientUpdate,
): Promise<BackendPatient> {
  const response = await apiClient.patch<BackendPatient>(
    `/api/v1/patients/${patientId}`,
    updates,
  );
  return response.data;
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

export interface DirectInteractionCheckRequest {
  drug_a: string;
  drug_b: string;
}

export interface DirectInteractionCheckResponse {
  matched: boolean;
  title: string;
  severity: string;
  evidence: string;
  drug_a_normalized?: string | null;
  drug_b_normalized?: string | null;
  interacting_ingredients: string[];
}

/**
 * Deterministically check direct drug-drug interactions between two queried medications.
 */
export async function checkDirectMedicationInteraction(
  req: DirectInteractionCheckRequest,
): Promise<DirectInteractionCheckResponse> {
  const response = await apiClient.post<DirectInteractionCheckResponse>(
    "/api/v1/medications/interaction-check",
    req,
  );
  return response.data;
}

export interface ExtractedBiomarker {
  test_name: string;
  result: string;
  unit: string;
  reference_range: string;
  flag: string;
  confidence: number;
  source_section: string;
}

export interface DocumentUploadResponse {
  document_id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  content_type: string;
  document_type: string;
  patient_id?: string | null;
  upload_timestamp: string;
  extraction_status: string;
  ocr_confidence?: number | null;
  extracted_biomarkers: ExtractedBiomarker[];
  storage_path: string;
  disclaimer: string;
}

export interface DocumentSummary {
  document_id: string;
  filename: string;
  original_filename: string;
  file_size_bytes: number;
  content_type: string;
  document_type: string;
  patient_id?: string | null;
  upload_timestamp: string;
  biomarker_count: number;
  extraction_status: string;
  ocr_confidence?: number | null;
}

export interface DocumentDetailResponse extends DocumentUploadResponse {
  extracted_text?: string | null;
}

/**
 * Upload a clinical lab report scan or prescription document to the backend.
 */
export async function uploadClinicalDocument(
  file: File,
  patientId?: string,
  documentType: string = "Laboratory Report",
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (patientId) formData.append("patient_id", patientId);
  formData.append("document_type", documentType);

  const response = await apiClient.post<DocumentUploadResponse>(
    "/api/v1/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data;
}

/**
 * List uploaded clinical documents from the FastAPI backend.
 */
export async function listClinicalDocuments(patientId?: string): Promise<DocumentSummary[]> {
  const params: any = {};
  if (patientId) params.patient_id = patientId;
  const response = await apiClient.get<DocumentSummary[]>("/api/v1/documents", { params });
  return response.data;
}

/**
 * Get detailed extraction results and text for a specific document.
 */
export async function getClinicalDocument(documentId: string): Promise<DocumentDetailResponse> {
  const response = await apiClient.get<DocumentDetailResponse>(`/api/v1/documents/${documentId}`);
  return response.data;
}

/**
 * Trigger reprocessing of an uploaded document with enhanced text/OCR extraction.
 */
export async function reprocessClinicalDocument(documentId: string): Promise<DocumentDetailResponse> {
  const response = await apiClient.post<DocumentDetailResponse>(`/api/v1/documents/${documentId}/reprocess`);
  return response.data;
}

/**
 * Generate stream URL for inline browser preview (PDF/images).
 */
export function getDocumentFileUrl(documentId: string): string {
  const baseURL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";
  return `${baseURL}/api/v1/documents/${documentId}/file`;
}

export interface ClinicalStatsResponse {
  total_patients: number;
  total_encounters: number;
  pending_notes: number;
  approved_notes: number;
  llm_provider?: string;
  llm_model?: string;
}

/**
 * Fetch live system and clinical database statistics from the FastAPI backend.
 */
export async function getClinicalStats(): Promise<ClinicalStatsResponse> {
  const response = await apiClient.get<ClinicalStatsResponse>("/api/v1/stats");
  return response.data;
}

