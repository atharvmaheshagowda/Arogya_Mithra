# AAROGYA MITHRA — Comprehensive Project & Architecture Audit

**Date:** November 2026  
**Auditor:** Creative Director, Principal Frontend Engineer & Full-Stack Architect  
**Project:** AAROGYA MITHRA — AI-Powered Multilingual Clinical Copilot for High-Volume OPDs in India  
**Target Environment:** React 19 + TypeScript 5.8 + Vite 7 + Tailwind CSS 3 / FastAPI + SQLAlchemy + SQLite  

---

## 1. Executive Summary

AAROGYA MITHRA is designed as an evidence-grounded AI clinical copilot for outpatient departments (OPDs) in Indian hospitals. The core clinical philosophy is:  
> **"AI assists the doctor. The doctor makes the decision."**

The project consists of:
1. A **production-grade FastAPI backend** with 102 passing automated tests, SQLite persistence, and endpoints covering patient registries, encounters, vital signs, clinical context aggregation, deterministic medication safety gating, and SOAP note generation/review.
2. A **modern React 19 frontend** built with Tailwind CSS, custom design tokens, Lucide icons, Framer Motion, and dedicated pages for Dashboard, Patient Management, Patient Profile with Mithra Safety Timeline, Consultation Workspace (LISTEN), Medical Report Intelligence (READ), Medication Safety (SAFEGUARD), Interactive Workflow Visualizer, and Workspace Settings.
3. A **design language derived from the reference website video** (`Ref_1_under_20MB.mp4` / `colossus_screen_reference_pack/`), featuring minimal floating pill navigation, oversized serif editorial headlines, high-contrast dark sections, rounded containers (radius 24px-32px), dotted background canvases, and clear visual hierarchy.

---

## 2. Full Architecture Inventory

### 2.1 Backend Architecture (FastAPI + SQLite)
- **Root:** `backend/`
- **Application Core:** `backend/app/main.py`, `backend/app/core/config.py`
- **Database Layer:** `backend/app/database/` with `init_db.py`, `session.py`, `base.py`
- **Database Models (`backend/app/models/`):**
  - `Patient`: Demographics, `patient_id` (e.g. `SYN-PAT-001`), DOB, calculated age, phone, preferred language, `is_synthetic` provenance, soft-deletion protection.
  - `Encounter`: OPD visit records with doctor name, department, chief complaint, consultation timestamps.
  - `VitalSign`: Blood pressure (systolic/diastolic), heart rate, temperature, SpO2, respiratory rate, height, weight, dynamically derived BMI with measurement gap calculation.
  - `Allergy`: Substance, reaction, severity (mild, moderate, severe), verification status (`documented`, `patient_reported`, `unverified`).
  - `MedicalHistory`: Pre-existing conditions, onset date, clinical description, status (`active`, `resolved`, `historical`, `unknown`).
  - `Medication`: Master catalogue with generic name, brand name, normalized active ingredients.
  - `PatientMedication`: Active, historical, and discontinued prescriptions linked to patients.
  - `ClinicalSOAPNote`: AI-generated drafts (`status: draft`) with mandatory clinician review and sign-off workflow (`status: reviewed` / `rejected`), preserving both original AI extraction and clinician edits.
- **Services & Rules (`backend/app/services/`, `backend/app/rules/`):**
  - `clinical_context.py`: Aggregates patient demographics, allergy profiles, active medical history, current medications, latest vitals, derived BMI, and encounter timelines into a single cohesive clinical snapshot.
  - `medication_safety.py` & `drug_interactions.json`: Deterministic safety evaluator checking allergy conflicts, drug-drug interactions (DDI), and duplicate active ingredients without ungrounded LLM inference.
  - `soap_service.py`: Rule-based consultation text parser extracting subjective, objective, assessment, and plan (SOAP) drafts while preserving pertinent negations (e.g. "no chest pain") and diagnostic uncertainty.
  - `medication_normalizer.py`: Normalizes brand names and clinical phrases to generic active ingredients.
- **Automated Test Suite:**
  - `pytest tests/` executes **102 tests**, passing with 100% success rate in 44.26s.

### 2.2 Frontend Architecture (React 19 + TypeScript + Vite)
- **Root:** `src/`
- **Routing (`src/router.tsx`):**
  - `/`: Public Product Landing Page (`LandingPage`)
  - `/login`, `/register`: Clinician Authentication
  - `/app/dashboard`: Doctor Clinical Overview Dashboard
  - `/app/patients`: Patient Panel & OPD Queue (`PatientsPage`)
  - `/app/patients/:patientId`: Longitudinal EHR Profile & Mithra Safety Timeline (`PatientProfilePage`)
  - `/app/consultations`: Consultation Scribe Workspace (`ConsultationsPage`)
  - `/app/consultations/:consultationId`: Active Scribe Room (`ConsultationWorkspacePage`)
  - `/app/reports`: Medical Report Intelligence & OCR (`ReportsPage`)
  - `/app/safety`: Medication Safeguard Engine (`MedicationSafetyPage`)
  - `/app/workflow`: Interactive Clinical Workflow Blueprint (`WorkflowPage`)
  - `/app/settings`: Physician Profile & Workspace Preferences (`SettingsPage`)
- **Component Design System (`src/components/ui/`):**
  - 18 shadcn/ui-compatible primitives: Button (8 variants), Card, Badge, Input, SearchInput, Select, Switch, Checkbox, Modal, ConfirmDialog, SlideOver, Dropdown, Sidebar, Navigation (Tabs, Breadcrumbs, Stepper), Skeleton, States (EmptyState, ErrorState, AlertBanner), Toast.
- **Service Layer (`src/lib/`):**
  - `patient-service.ts`: Comprehensive mock store and patient state management.
  - `consultation-service.ts`: Speech turns, audio recording state, multilingual transcripts.
  - `report-service.ts`: Medical report uploads, OCR extraction parameters, confidence scoring.
  - `safety-service.ts`: Gated clinical safety alerts, severity levels, CDSCO/BNF evidence citations.
  - `dashboard-service.ts`: OPD metrics, appointment schedules, quick actions.
  - `workflow-service.ts`: Node/edge definitions for the 4-module clinical pipeline.

---

## 3. Analysis of Reference Video Creative Direction

From the 47.5-second video recording (`Ref_1_under_20MB.mp4` / `colossus_screen_reference_pack/`), the following key design patterns were extracted:

| Visual Element | Reference Video Implementation | AAROGYA MITHRA Translation |
| :--- | :--- | :--- |
| **Navigation** | Floating rounded pill (`rounded-full`) anchored at top center with blur backdrop | `LandingNavbar`: Floating pill with brand wordmark, section anchors, theme toggle, and "Doctor Sign In" / "Launch OPD" CTA buttons |
| **Typography** | High-contrast editorial serif display heading paired with clean geometric sans-serif | `Newsreader` editorial serif for high-impact headlines (`text-display-hero`) + `Inter` for clinical precision and metrics |
| **Color Scheme** | Warm neutral background transitioning into deep charcoal/navy dark mode blocks | Deep Navy (`#102A43`), Clinical Teal (`#0D9488`), Warm Ivory/Background (`#F6F8FA`), Dark Slate (`hsl(207 57% 8%)`) |
| **Feature Presentation** | Large rounded containers (`rounded-3xl` / `rounded-[2rem]`) with fine borders and soft ambient shadows | Metric cards, interactive clinical workflow visualizer, and product preview dashboards with refined borders (`border-border/80`) |
| **Dark Storytelling** | Immersive dark section with glowing accents highlighting core capabilities | `ClinicalSafetySection` & `ContextEngineSection`: Deep navy background with clinical teal glow (`glow-teal`) emphasizing human-in-the-loop doctor oversight |
| **Interactive Blueprint** | Dotted surface canvas with interconnected nodes and live state inspector | `InteractiveWorkflowSection` & `WorkflowVisualizerPage`: 4-stage pipeline (LISTEN → READ → CONNECT → SAFEGUARD) with live step execution |
| **Trust Metrics & Proof** | Sleek horizontal ribbon showcasing hospital partnerships and compliance | Trust strip featuring AIIMS, Apollo, Manipal, Fortis, and ABHA/FHIR compliance standards |

---

## 4. Current State vs. Target State Audit

### What Works Today:
1. Frontend typechecks with **zero TypeScript errors** (`tsc -b`).
2. Production build compiles cleanly with Vite (`npm run build`).
3. Backend test suite passes **102/102 tests** with SQLite.
4. Backend FastAPI server runs cleanly on `http://127.0.0.1:8000`.
5. Synthetic clinical data seed script successfully populates 3 patients, 4 encounters, 3 allergies, 5 histories, and 4 vitals.
6. The Mithra Safety Timeline tab is present on the Patient Profile page.

### Identified Gaps & Required Upgrades:
1. **API Client Integration:** The frontend services in `src/lib/` currently rely primarily on local synthetic stores. A unified API client (`src/lib/api-client.ts`) is required to connect to the running FastAPI backend (`/api/v1/patients`, `/api/v1/clinical-context`, `/api/v1/medications`, `/api/v1/clinical-notes`), with seamless fallback to rich mock data if the backend is offline.
2. **Landing Page Creative Elevation:** Needs enhanced Framer Motion scroll reveals, smoother pill navigation, and rich visual storytelling matching the reference video.
3. **Mithra Safety Timeline Polish:** Enhance chronological sorting, interactive category filtering, and source evidence popovers.
4. **Interactive Workflow Connectors:** Add animated pulses between workflow nodes to visually convey the flow from consultation audio to verified prescription.
5. **Responsive Verification:** Ensure all screens (1920px down to 360px) have zero horizontal overflow, touch-friendly tap targets, and responsive modal positioning.

