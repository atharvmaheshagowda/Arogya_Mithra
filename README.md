# AAROGYA MITHRA
> **AI-Powered Multilingual Clinical Copilot**  
> *"Your Clinical Workflow. Reimagined with Intelligence."*

---

## Overview

**AAROGYA MITHRA** is an evidence-grounded AI clinical copilot engineered specifically for high-volume outpatient departments (OPDs) in Indian hospitals.

It listens to doctor-patient consultations, understands multilingual conversations, reads medical reports, connects fragmented patient histories, and safeguards medication decisions while keeping doctors in complete control.

> **Clinical Operating Principle:**  
> AAROGYA MITHRA is not an autonomous AI doctor. It is an intelligent clinical assistance platform.  
> **AI assists the doctor. The doctor makes the decision.**

---

## Core Modules

```
  ┌──────────────────────────────────────────────────────────────┐
  │                        AAROGYA MITHRA                        │
  │                   Clinical Intelligence Hub                  │
  └──────────────────────────────┬───────────────────────────────┘
                                 │
     ┌───────────────┬───────────┴───────────┬───────────────┐
     ▼               ▼                       ▼               ▼
┌─────────┐     ┌─────────┐             ┌─────────┐     ┌─────────┐
│ LISTEN  │     │  READ   │             │ CONNECT │     │SAFEGUARD│
│ Scribe  │     │ Reports │             │ Context │     │ Safety  │
└────┬────┘     └────┬────┘             └────┬────┘     └────┬────┘
     └───────────────┴───────────┬───────────┴───────────────┘
                                 ▼
                 ┌───────────────────────────────┐
                 │    DOCTOR REVIEW & APPROVAL   │
                 └───────────────────────────────┘
```

1. **LISTEN — Multilingual Clinical Scribe**
   - Ingests ambient doctor-patient consultations.
   - Multilingual support for Kannada, Hindi, and English (including code-mixed conversations).
   - Extracts chief complaints, symptoms, duration, negation, and clinical uncertainty.
   - Produces structured SOAP clinical note drafts.

2. **READ — Medical Report Intelligence**
   - Multi-format ingestion for scanned prescriptions and laboratory PDF/image reports.
   - High-accuracy OCR extracting entities, numerical values, units, and dates.
   - Transparent entity extraction confidence scoring and verification affordances.

3. **CONNECT — Patient Context Engine**
   - Synthesizes disparate patient records into an integrated clinical timeline.
   - Cross-references past prescriptions, lab histories, and known allergies.
   - Proactively highlights missing information and conflicting clinical records.

4. **SAFEGUARD — Medication Safety Engine**
   - Real-time screening for drug-drug interactions, duplicate therapies, and allergy conflicts.
   - Supported contraindication checks tied directly to clinical evidence.
   - Strict doctor review and approval requirement before prescriptions are finalized.

---

## Design System & Branding

- **Primary Navy:** `#102A43`
- **Clinical Teal:** `#0D9488`
- **Background:** `#F6F8FA`
- **White:** `#FFFFFF`
- **Success:** `#16A34A`
- **Warning:** `#F59E0B`
- **Danger:** `#DC2626`

The brand identity employs a custom vector mark (`AarogyaMithraSymbol`) that pairs a protective clinical shield with two interlocking harmonic loops representing the doctor-copilot alliance around a vital pulse beacon, avoiding generic medical crosses.

---

## Tech Stack

- **Framework:** React 19 + TypeScript 5.8
- **Bundler:** Vite 7
- **Styling:** Tailwind CSS 3 with HSL CSS variables
- **Component Primitives:** shadcn/ui architecture with `@radix-ui/react-slot`
- **Icons:** Lucide React
- **Animations:** Framer Motion
- **Routing:** React Router 7
- **HTTP Client:** Axios

---

## Getting Started

### Development
```bash
# Start Vite development server
npm run dev
```

### Type Checking
```bash
# Verify TypeScript compilation
npm run typecheck
```

### Production Build
```bash
# Run type check and Vite build
npm run build
```

---

## Documentation Links

- [PROJECT_ARCHITECTURE.md](file:///d:/MedSync AI/PROJECT_ARCHITECTURE.md) — Detailed technical architecture, routing, and design token system.
- [DEVELOPMENT_PROGRESS.md](file:///d:/MedSync AI/DEVELOPMENT_PROGRESS.md) — Progress log, inspection audit, and upcoming milestones.

