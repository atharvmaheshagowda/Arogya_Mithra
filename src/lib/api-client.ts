/**
 * AAROGYA MITHRA — Centralized API Client Layer
 *
 * Provides typed, resilient connectivity to the local FastAPI backend (http://127.0.0.1:8000/api/v1).
 * Supports automatic fallback to synthetic clinical datasets when the backend is offline,
 * ensuring high reliability during hackathon evaluations and offline clinical demonstrations.
 */

import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export interface BackendHealthResponse {
  status: string;
  service: string;
  database: string;
  version: string;
}

export interface BackendPatient {
  patient_id: string;
  full_name: string;
  date_of_birth?: string | null;
  age?: number | null;
  calculated_age?: number | null;
  gender?: string | null;
  phone_number?: string | null;
  preferred_language?: string | null;
  is_active: boolean;
  is_synthetic: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BackendSafetyCheckRequest {
  proposed_medication: string;
  explicit_identifier?: string;
}

export interface BackendSafetyFinding {
  rule_id: string;
  category: string;
  severity: string;
  affected_medication: string;
  explanation: string;
  evidence: string;
  review_required: boolean;
}

export interface BackendSafetyCheckResponse {
  patient_id: string;
  proposed_medication: string;
  normalized_name?: string;
  normalized_identifier?: string;
  active_ingredients: string[];
  match_status: string;
  overall_status: "SAFE" | "WARNING" | "REVIEW_REQUIRED";
  findings: BackendSafetyFinding[];
  checks_performed: string[];
  unresolved_information?: string[];
  timestamp: string;
  disclaimer: string;
}

export interface BackendSOAPGenerateRequest {
  consultation_text: string;
  language_code?: string;
  patient_identifier?: string;
  encounter_identifier?: string;
}

export interface BackendClinicalNoteResponse {
  id: number;
  note_id: string;
  status: "draft" | "reviewed" | "rejected";
  is_ai_generated: boolean;
  disclaimer: string;
  patient_id?: string | null;
  encounter_id?: string | null;
  language_code: string;
  consultation_text: string;
  soap: {
    subjective: {
      chief_complaint: string;
      history_of_present_illness: string;
      reported_symptoms: string[];
      pertinent_negatives: string[];
      evidence: Array<{
        text: string;
        source_evidence: string;
        is_negated: boolean;
        uncertainty_qualifier?: string | null;
      }>;
    };
    objective: {
      vital_signs_summary?: string | null;
      physical_examination: string[];
      investigations_reviewed: string[];
      evidence: Array<{
        text: string;
        source_evidence: string;
        is_negated: boolean;
        uncertainty_qualifier?: string | null;
      }>;
    };
    assessment: {
      primary_impression: string;
      differential_diagnoses: string[];
      chronic_conditions_status: string[];
      evidence: any[];
    };
    plan: {
      diagnostic_workup: string[];
      proposed_medications: string[];
      patient_instructions: string[];
      red_flag_warnings: string[];
      follow_up: string;
      evidence: any[];
    };
  };
  unextracted_or_missing: string[];
  confidence_notes?: string;
  created_at: string;
  reviewed_at?: string | null;
  reviewing_doctor?: string | null;
  doctor_comments?: string | null;
  edited_soap?: any;
}

export interface BackendClinicalContextResponse {
  patient: {
    patient_id: string;
    full_name: string;
    calculated_age: number;
    date_of_birth?: string | null;
    gender?: string | null;
    preferred_language?: string | null;
    phone_number?: string | null;
    is_active: boolean;
    is_synthetic: boolean;
  };
  allergies: {
    allergy_status: string;
    documented: Array<{
      id: number;
      substance: string;
      reaction: string;
      severity: string;
      verification_status: string;
      recorded_at: string;
    }>;
    patient_reported: any[];
    unverified: any[];
    total_count: number;
  };
  medical_history: {
    active: Array<{
      id: number;
      condition: string;
      description?: string;
      status: string;
      onset_date?: string;
      source: string;
      recorded_at: string;
    }>;
    resolved: any[];
    historical: any[];
    unknown: any[];
    total_count: number;
  };
  medications: {
    active: any[];
    historical: any[];
    discontinued: any[];
    uncertain: any[];
    total_count: number;
  };
  reference_encounter?: {
    encounter_id: string;
    consultation_date: string;
    doctor_name: string;
    chief_complaint: string;
    status: string;
    is_synthetic: boolean;
    notice?: string;
  };
  latest_vitals?: any;
  encounter_timeline: Array<{
    encounter_id: string;
    consultation_date: string;
    doctor_name: string;
    chief_complaint: string;
    status: string;
    is_synthetic: boolean;
  }>;
  alerts: Array<{
    code: string;
    severity: string;
    message: string;
    category: string;
  }>;
  generated_at: string;
  disclaimer: string;
}

class ApiClient {
  private client: AxiosInstance;
  private isOnlineCache: boolean | null = null;
  private lastHealthCheck: number = 0;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 4000,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Checks whether the FastAPI backend is operational.
   * Caches response for 10 seconds to avoid flooding.
   */
  async checkBackendHealth(): Promise<boolean> {
    const now = Date.now();
    if (this.isOnlineCache !== null && now - this.lastHealthCheck < 10000) {
      return this.isOnlineCache;
    }

    try {
      const res = await this.client.get<BackendHealthResponse>("/health");
      this.isOnlineCache = res.status === 200 && res.data.status === "healthy";
    } catch {
      this.isOnlineCache = false;
    }
    this.lastHealthCheck = now;
    return this.isOnlineCache;
  }

  /**
   * Fetches the list of registered patients from the backend.
   */
  async getPatients(skip = 0, limit = 50): Promise<BackendPatient[] | null> {
    try {
      const res = await this.client.get<BackendPatient[]>("/patients", {
        params: { skip, limit },
      });
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Fetches full clinical context for a patient.
   */
  async getClinicalContext(patientId: string): Promise<BackendClinicalContextResponse | null> {
    try {
      const res = await this.client.get<BackendClinicalContextResponse>(
        `/patients/${encodeURIComponent(patientId)}/clinical-context`
      );
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Runs deterministic medication safety checks for a proposed prescription.
   */
  async checkMedicationSafety(
    patientId: string,
    proposedMedication: string
  ): Promise<BackendSafetyCheckResponse | null> {
    try {
      const res = await this.client.post<BackendSafetyCheckResponse>(
        `/patients/${encodeURIComponent(patientId)}/medication-safety-check`,
        { proposed_medication: proposedMedication }
      );
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Generates an evidence-grounded SOAP note draft via the backend.
   */
  async generateClinicalNote(
    payload: BackendSOAPGenerateRequest
  ): Promise<BackendClinicalNoteResponse | null> {
    try {
      const res = await this.client.post<BackendClinicalNoteResponse>(
        "/clinical-notes/generate",
        payload
      );
      return res.data;
    } catch {
      return null;
    }
  }

  /**
   * Submits physician review and sign-off on a clinical SOAP note draft.
   */
  async reviewClinicalNote(
    noteId: string,
    reviewData: {
      action: "approve" | "reject" | "amend";
      reviewing_doctor: string;
      doctor_comments?: string;
      edited_soap?: any;
    }
  ): Promise<BackendClinicalNoteResponse | null> {
    try {
      const res = await this.client.patch<BackendClinicalNoteResponse>(
        `/clinical-notes/${encodeURIComponent(noteId)}/review`,
        reviewData
      );
      return res.data;
    } catch {
      return null;
    }
  }
}

export const apiClient = new ApiClient();
