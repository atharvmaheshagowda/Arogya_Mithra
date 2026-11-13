# AAROGYA MITHRA — Project Architecture

## 1. Product Identity & Overview

| Attribute | Specification |
| :--- | :--- |
| **Official Name** | **AAROGYA MITHRA** |
| **Former Working Title** | COLOSSUS 3.0 (referenced in `colossus_screen_reference_pack/` design inputs) |
| **Product Category** | AI-Powered Multilingual Clinical Copilot |
| **Tagline** | *"Your Clinical Workflow. Reimagined with Intelligence."* |
| **Target Setting** | High-volume Outpatient Departments (OPDs) in Indian Hospitals |
| **Supported Languages** | Kannada, Hindi, and English (including code-mixed consultations) |
| **Core Product Modules** | LISTEN, READ, CONNECT, SAFEGUARD |
| **Clinical Stance** | Doctor-led decision support. AI assists; the doctor decides. |

---

## 2. Technical Stack & Foundation

The platform is built as a modular React single-page application engineered for clinical clarity, sub-millisecond local interactions, and strict accessibility.

```
                    ┌──────────────────────────────────────────────┐
                    │               AAROGYA MITHRA                 │
                    │      AI-Powered Multilingual Clinical Copilot│
                    └──────────────────────┬───────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴───────────────┬──────────────────┐
         │                  │                              │                  │
         ▼                  ▼                              ▼                  ▼
   ┌───────────┐      ┌───────────┐                  ┌───────────┐      ┌───────────┐
   │  LISTEN   │      │   READ    │                  │  CONNECT  │      │ SAFEGUARD │
   │Scribe & NL│      │OCR & Ent. │                  │Context Eng│      │Med. Safety│
   └─────┬─────┘      └─────┬─────┘                  └─────┬─────┘      └─────┬─────┘
         └──────────────────┴──────────────┬───────────────┴──────────────────┘
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │            DOCTOR REVIEW & APPROVAL          │
                    │        (Draft Advisory Verification)         │
                    └──────────────────────────────────────────────┘
```

| Layer | Technology | Configuration / Location |
| :--- | :--- | :--- |
| **Runtime & Framework** | React 19 + TypeScript 5.8 | `src/` |
| **Bundler & Dev Server**| Vite 7 | `vite.config.ts` (`@/` alias mapped to `./src`) |
| **Styling & Design Tokens** | Tailwind CSS 3 + PostCSS | `tailwind.config.ts`, `postcss.config.js`, `src/index.css` |
| **Component Standards** | shadcn/ui architecture | `components.json`, `src/components/ui/` |
| **Routing** | React Router 7 | `src/router.tsx` |
| **Iconography** | Lucide React | `lucide-react` |
| **Motion & Animation** | Framer Motion | `framer-motion` |
| **HTTP Client** | Axios | `axios` |

---

## 3. Brand Identity & Visual System

The design system communicates **Trust, Clinical Intelligence, Patient Safety, Modern Healthcare, and Indian Multilingual Accessibility**.

### Color Palette
- **Primary Navy:** `#102A43` (HSL: `207 62% 16%`) — Used for clinical authority, sidebar anchors, and primary headers.
- **Clinical Teal:** `#0D9488` (HSL: `174 72% 32%`) — Used for interactive accents, copilot indicators, and badges.
- **Background:** `#F6F8FA` (HSL: `210 25% 97%`) — Low-contrast neutral backdrop reducing visual fatigue during long OPD shifts.
- **Surface Cards:** `#FFFFFF` (Dark: `hsl(208 46% 11%)`) — Clean elevated clinical surfaces with fine borders.
- **Success:** `#16A34A` (HSL: `142 71% 35%`) — Verified clinical entries and approved items.
- **Warning:** `#F59E0B` (HSL: `38 92% 50%`) — Missing records or medication alerts requiring review.
- **Danger:** `#DC2626` (HSL: `0 72% 51%`) — Critical contraindications and allergy conflicts.

### Typography & Surfaces
- **Display Typography:** Editorial serif hierarchy (`Iowan Old Style`, `Baskerville`, `serif`) for high-trust clinical authority.
- **Interface Typography:** Inter and system sans-serif for high legibility in lab values, dosages, and patient charts.
- **Surface Utilities:** `.surface-dots` radial dot background pattern for workflow blueprints.

### Brand Mark & Application Symbol
- **Symbol:** `AarogyaMithraSymbol` in `src/components/brand.tsx` (and `public/favicon.svg`).
  Features a protective outer contour embracing two harmonic interlocking loops (representing the Doctor + AI Copilot alliance) centered on a vibrant clinical pulse beacon. Avoids generic medical crosses.
- **Wordmark:** `AarogyaMithraBrand` featuring bold `AAROGYA` and teal `MITHRA` styling with optional subtitle.

---

## 4. Source Code Structure

```text
d:/MedSync AI/
├── colossus_screen_reference_pack/ # Legacy design reference pack (17 frames, 10 section crops)
├── public/                         # Public static assets
│   └── favicon.svg                 # Official AAROGYA MITHRA vector brand icon
├── src/
│   ├── components/                 # Application-level structural components
│   │   ├── app-shell.tsx           # Doctor consultation workspace shell
│   │   ├── brand.tsx               # AAROGYA MITHRA brand symbol and wordmarks
│   │   ├── theme-provider.tsx      # Dark/light theme context & switcher
│   │   └── ui/                     # shadcn/ui-compatible primitives
│   │       ├── badge.tsx           # Status, severity & tag badges
│   │       ├── button.tsx          # Teal, navy, ghost & outline actions
│   │       ├── card.tsx            # Clinical data cards & headers
│   │       ├── dropdown.tsx        # Profile & action menus
│   │       ├── input.tsx           # Accessible inputs & textfields
│   │       ├── modal.tsx           # Review modals & dialogs
│   │       ├── skeleton.tsx        # Loading state placeholders
│   │       ├── states.tsx          # EmptyState & ErrorState primitives
│   │       └── toast.tsx           # Clinical notification system
│   ├── lib/
│   │   ├── auth.tsx                # Clinician authentication & profile state
│   │   └── utils.ts                # Class-name merger (clsx + tailwind-merge)
│   ├── pages/
│   │   ├── app-pages.tsx           # Clinical dashboard & module views
│   │   └── auth-pages.tsx          # Doctor sign-in & registration
│   ├── index.css                   # Global styles & HSL theme tokens
│   ├── main.tsx                    # React application entry point
│   └── router.tsx                  # React Router definitions
├── DEVELOPMENT_PROGRESS.md         # Phased milestone tracker
├── PROJECT_ARCHITECTURE.md         # Architecture, design system & route map
├── README.md                       # High-level product overview & quick start
└── package.json                    # Project configuration (aarogya-mithra)
```

---

## 5. Navigation & Route Hierarchy

```text
/                              -> Development entry / Public website landing (upcoming)
├── /login                     -> Doctor sign-in screen
├── /register                  -> Doctor workspace registration
└── /app                       -> Doctor Consultation Workspace (ApplicationShell)
    ├── /app (index)           -> Clinical Overview Dashboard
    ├── /app/patients          -> Patient Panel (CONNECT engine)
    ├── /app/consultations     -> Consultation Capture (LISTEN scribe)
    ├── /app/reports           -> Medical Reports (READ OCR intelligence)
    ├── /app/medication-safety -> Medication Safeguard Engine (SAFEGUARD verification)
    ├── /app/workflow          -> Interactive Clinical Workflow Orchestrator
    └── /app/settings          -> Workspace Preferences & Profile
```

---

## 6. Four Core Functional Modules

### 1. LISTEN — Multilingual Clinical Scribe
- **Languages:** Kannada, Hindi, and English.
- **Capabilities:** High-fidelity consultation transcription, code-mixed language support, real-time clinical entity detection, extraction of chief complaints, duration, negation, and uncertainty.
- **Output:** Structured SOAP drafts ready for clinician review.

### 2. READ — Medical Report Intelligence
- **Capabilities:** Multi-format medical document ingestion (PDF, JPG, PNG), prescription digitization, laboratory report OCR.
- **Extraction:** Lab biomarkers, numerical values, units, reference intervals, historical test dates, and extraction confidence scores.

### 3. CONNECT — Patient Context Engine
- **Capabilities:** Consolidates fragmented patient history across past visits, external lab reports, previous prescriptions, and documented allergies.
- **Intelligence:** Automatically flags conflicting information, unmonitored chronic conditions, and timeline anomalies.

### 4. SAFEGUARD — Medication Safety Engine
- **Capabilities:** Verifies new prescriptions against current drug regimens, known allergies, renal/hepatic considerations, and duplicate therapies.
- **Safety Protocol:** Every alert includes an evidence link and requires clinician sign-off before being finalized.

---

## 7. Interactive Workflow Blueprint Specification

- **Source Reference:** `colossus_screen_reference_pack/reference_crops/feature_workflow_reference.jpg` and `frames/frame_04s.jpg` / `frame_06s.jpg`.
- **Architecture:** An interactive visual blueprint illustrating the end-to-end journey from ambient consultation recording (LISTEN) to report digestion (READ), longitudinal contextualization (CONNECT), and safety gating (SAFEGUARD).
- **Execution:** Scheduled for implementation as an interactive component in `src/components/` with animated step transitions and interactive inspector drawers.
