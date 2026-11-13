# AAROGYA MITHRA — API Integration Map

**Version:** 1.0  
**Backend Base URL:** `http://127.0.0.1:8000/api/v1`  
**Protocol:** REST / JSON  
**Backend Framework:** FastAPI / SQLAlchemy 2 / SQLite  

---

## 1. Overview & Integration Philosophy

AAROGYA MITHRA features a resilient, dual-mode client architecture:
1. **Live Backend First:** When the FastAPI server is reachable, the frontend dynamically requests live clinical records, validates medications via deterministic rules, and submits consultation transcripts for SOAP drafting.
2. **Graceful Fallback:** If the local backend is unavailable or the user is demonstrating offline, the frontend seamlessly utilizes rich synthetic fallback data with zero interruption to user workflows.
3. **Data Integrity:** Real doctor review and approval endpoints require explicit state transitions.

---

## 2. Endpoint Contract Matrix

| Domain | Backend Route | HTTP Method | Frontend Service / Consumer | Functionality |
| :--- | :--- | :--- | :--- | :--- |
| **System Health** | `/health` | `GET` | `api-client.ts` / Dashboard | Verifies backend connectivity, database status, and API version. |
| **Patients** | `/patients` | `GET` | `patient-service.ts` / `PatientsPage` | Retrieves paginated list of registered patients (`skip`, `limit`). |
| **Patients** | `/patients` | `POST` | `patient-service.ts` / `PatientRegisterModal` | Registers a new patient with demographic data. Rejects duplicate IDs. |
| **Patient Details** | `/patients/{patient_id}` | `GET` | `patient-service.ts` / `PatientProfilePage` | Fetches patient details, documented allergies, and medical history. |
| **Patient History** | `/patients/{patient_id}/history` | `GET` | `patient-service.ts` / `PatientProfilePage` | Retrieves chronological encounter list with vital signs. |
| **Clinical Context** | `/patients/{patient_id}/clinical-context` | `GET` | `patient-service.ts` / `Mithra Safety Timeline` | Aggregates demographics, allergy profiles, conditions, medications, latest vitals, derived BMI, and alerts. |
| **Medication Catalogue**| `/medications` | `GET` | `safety-service.ts` / `PrescriptionForm` | Lists approved medication catalogue items. |
| **Patient Medications**| `/patients/{patient_id}/medications` | `GET` | `patient-service.ts` / `MedicationsTab` | Retrieves active, historical, and discontinued prescriptions. |
| **Patient Medications**| `/patients/{patient_id}/medications` | `POST` | `patient-service.ts` / `PrescriptionForm` | Adds a new prescription record for a patient. |
| **Safety Check** | `/patients/{patient_id}/medication-safety-check` | `POST` | `safety-service.ts` / `MedicationSafetyPage` | Deterministically evaluates a proposed medication against allergies, DDIs, and duplicate active ingredients. |
| **Clinical Notes** | `/clinical-notes/generate` | `POST` | `consultation-service.ts` / `ConsultationWorkspacePage` | Generates a structured SOAP draft from consultation dialogue while preserving negations and uncertainty. |
| **Clinical Notes** | `/clinical-notes/{note_id}` | `GET` | `consultation-service.ts` / `ConsultationWorkspacePage` | Retrieves an existing SOAP note draft or approved record. |
| **Clinical Notes** | `/clinical-notes/{note_id}/review` | `PATCH` | `consultation-service.ts` / `ConsultationWorkspacePage` | Clinician reviews, edits, and officially signs off on a SOAP draft. |

---

## 3. Data Transformation & Schema Normalization

### 3.1 Patient Normalization
- **Backend Schema:** `patient_id`, `full_name`, `date_of_birth`, `age`, `calculated_age`, `gender`, `preferred_language`, `phone_number`.
- **Frontend Interface:** Maps `full_name` to `name`, `patient_id` to `id`, computes age from `date_of_birth` or `calculated_age`, and generates clinical status badges.

### 3.2 Clinical Context to Mithra Safety Timeline
- **Backend Aggregation:** `allergies.documented`, `medical_history.active`, `encounter_timeline`, and `latest_vitals`.
- **Frontend Timeline Projection:** Generates chronological events sorted by timestamp with clear visual differentiation:
  - 🔴 **Allergy Hard-Stops:** Red pulse ring, warning banner, verification status badge.
  - 🟢 **OPD Encounters:** Clinical teal node, chief complaint, doctor name.
  - 🔵 **Prescriptions & Meds:** Navy pill badge, dosage, and indication.
  - 🟡 **Vitals & Labs:** Amber node, systolic/diastolic, heart rate, SpO2, BMI.

### 3.3 Medication Safety Check Mapping
- **Request:** `{ proposed_medication: string, explicit_identifier?: string }`
- **Response:**
  - `overall_status`: `"SAFE"` | `"WARNING"` | `"REVIEW_REQUIRED"`
  - `findings`: Array of rules triggered (`allergy_conflict`, `drug_drug_interaction`, `duplicate_active_ingredient`).
  - `checks_performed`: Proof of comprehensive deterministic evaluation.

