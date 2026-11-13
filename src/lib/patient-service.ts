/**
 * AAROGYA MITHRA — Patient Management Service Layer
 *
 * Provides comprehensive synthetic clinical patient records designed for
 * high-volume Indian outpatient departments (OPDs).
 * Supports multilingual preferences (Kannada, Hindi, English), structured
 * medical histories, deterministic allergy gating, lab values, and timeline data.
 */

export interface AllergyItem {
  id: string;
  allergen: string;
  severity: "Severe" | "Moderate" | "Mild";
  reaction: string;
  documentedDate: string;
  source: string;
  critical: boolean;
}

export interface MedicationItem {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedDate: string;
  prescribedBy: string;
  status: "active" | "historical" | "discontinued";
  indication: string;
  discontinuedReason?: string;
  discontinuedDate?: string;
  source: string;
}

export interface DiagnosisItem {
  id: string;
  code: string;
  condition: string;
  onset: string;
  status: "Active" | "Managed" | "Resolved";
  notes: string;
}

export interface LabParameter {
  name: string;
  value: string;
  unit: string;
  referenceRange: string;
  flag: "normal" | "high" | "low" | "critical";
}

export interface LabReportItem {
  id: string;
  testName: string;
  date: string;
  facility: string;
  confidence: string;
  category: "Biochemistry" | "Hematology" | "Endocrinology" | "Renal" | "Lipid Profile";
  status: "Reviewed by Doctor" | "Pending Review";
  parameters: LabParameter[];
}

export interface ConsultationItem {
  id: string;
  date: string;
  doctor: string;
  department: string;
  chiefComplaint: string;
  language: string;
  summary: string;
  soapNote: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  signed: boolean;
  signedBy?: string;
  signedAt?: string;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: "consultation" | "medication" | "lab" | "allergy" | "diagnosis";
  title: string;
  description: string;
  source: string;
  badgeVariant: "teal" | "warning" | "danger" | "success" | "navy" | "outline";
  details?: string;
}

export interface PatientProfile {
  id: string; // MRN e.g. "AM-94021"
  name: string;
  age: number;
  dob: string;
  gender: "Male" | "Female" | "Other";
  preferredLanguage: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: string;
  bloodGroup: string;
  lastConsultation: string;
  status: "In Consultation" | "Waiting (Token #11)" | "Waiting (Token #12)" | "Completed" | "Follow-up Scheduled";
  statusVariant: "teal" | "warning" | "success" | "navy";
  vitals: string;
  allergies: AllergyItem[];
  medications: MedicationItem[];
  diagnoses: DiagnosisItem[];
  surgicalHistory: string[];
  familyHistory: string[];
  lifestyle: {
    diet: string;
    smoking: string;
    alcohol: string;
    physicalActivity: string;
  };
  labReports: LabReportItem[];
  consultations: ConsultationItem[];
  timeline: TimelineEvent[];
}

export const initialPatients: PatientProfile[] = [
  {
    id: "AM-94021",
    name: "Rajesh Kumar",
    age: 54,
    dob: "1972-04-12",
    gender: "Male",
    preferredLanguage: "Kannada / English",
    phone: "+91 98450 12345",
    email: "rajesh.kumar72@gmail.com",
    address: "4th Block Jayanagar, Bengaluru, Karnataka 560011",
    emergencyContact: "Sunita Kumar (Wife) • +91 98450 67890",
    bloodGroup: "B+",
    lastConsultation: "Today, 11:15 AM",
    status: "In Consultation",
    statusVariant: "teal",
    vitals: "BP: 138/88 mmHg • HR: 76 bpm • Glucose: 178 mg/dL • SpO2: 98%",
    allergies: [
      {
        id: "alg-1",
        allergen: "Penicillin (Amoxicillin, Ampicillin)",
        severity: "Severe",
        reaction: "Anaphylactoid bronchospasm, urticaria, facial angioedema",
        documentedDate: "14-Aug-2024",
        source: "Apollo Hospitals Emergency Dept",
        critical: true,
      },
    ],
    medications: [
      {
        id: "med-1",
        name: "Tab Metformin 500mg",
        genericName: "Metformin Hydrochloride",
        dosage: "500 mg",
        frequency: "Twice daily after meals (1-0-1)",
        duration: "Ongoing (3 months refill)",
        prescribedDate: "10-Nov-2026",
        prescribedBy: "Dr. Anika Rao (General Medicine)",
        status: "active",
        indication: "Type 2 Diabetes Mellitus",
        source: "OPD Room 04 Prescription",
      },
      {
        id: "med-2",
        name: "Tab Telmisartan 40mg",
        genericName: "Telmisartan",
        dosage: "40 mg",
        frequency: "Once daily morning (1-0-0)",
        duration: "Ongoing",
        prescribedDate: "10-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh (Cardiology)",
        status: "active",
        indication: "Essential Hypertension",
        source: "Cardiology OPD EMR",
      },
      {
        id: "med-3",
        name: "Tab Pantoprazole 40mg",
        genericName: "Pantoprazole Sodium",
        dosage: "40 mg",
        frequency: "Once daily before breakfast (1-0-0)",
        duration: "14 Days",
        prescribedDate: "Today, 11:15 AM",
        prescribedBy: "Dr. Anika Rao (General Medicine)",
        status: "active",
        indication: "Acute Peptic Dyspepsia",
        source: "AAROGYA MITHRA LISTEN Note",
      },
      {
        id: "med-4",
        name: "Tab Amoxicillin-Clav 625mg",
        genericName: "Amoxicillin / Clavulanate",
        dosage: "625 mg",
        frequency: "Twice daily",
        duration: "Cancelled",
        prescribedDate: "14-Aug-2024",
        prescribedBy: "External Clinic (Dr. H. Prasad)",
        status: "discontinued",
        indication: "Upper Respiratory Infection",
        discontinuedReason: "BLOCKED by SAFEGUARD: Penicillin anaphylaxis history",
        discontinuedDate: "14-Aug-2024",
        source: "Emergency Triage Record",
      },
    ],
    diagnoses: [
      {
        id: "diag-1",
        code: "ICD-10: E11.9",
        condition: "Type 2 Diabetes Mellitus",
        onset: "May 2019",
        status: "Active",
        notes: "Managed on Metformin; target HbA1c < 7.0%. Regular podiatry and retinal screen.",
      },
      {
        id: "diag-2",
        code: "ICD-10: I10",
        condition: "Essential Hypertension",
        onset: "October 2021",
        status: "Active",
        notes: "Target BP < 130/80 mmHg. Good compliance with Telmisartan.",
      },
      {
        id: "diag-3",
        code: "ICD-10: K30",
        condition: "Acute Dyspepsia / Peptic Disease",
        onset: "November 2026",
        status: "Active",
        notes: "Epigastric tenderness without alarming red flags. Pantoprazole initiated.",
      },
    ],
    surgicalHistory: [
      "Open Appendectomy (2012, St. John's Medical College Hospital, Bengaluru)",
      "Left Inguinal Hernia Mesh Repair (2018, Manipal Hospital)",
    ],
    familyHistory: [
      "Father: Type 2 Diabetes diagnosed age 50, Coronary Artery Disease (CAD)",
      "Mother: Essential Hypertension, Hypothyroidism",
      "Older Brother: Type 2 Diabetes Mellitus on Oral Hypoglycemics",
    ],
    lifestyle: {
      diet: "South Indian Vegetarian (High carbohydrate, moderate dairy)",
      smoking: "Never smoked",
      alcohol: "Occasional social alcohol (discontinued 2023)",
      physicalActivity: "Sedentary desk worker, morning walks 25 mins 4x/week",
    },
    labReports: [
      {
        id: "lab-101",
        testName: "Comprehensive Metabolic Panel & Glycemic Audit",
        date: "10-Nov-2026",
        facility: "Thyrocare Central Diagnostics, Bengaluru",
        confidence: "98.8% OCR Confidence",
        category: "Biochemistry",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "HbA1c (Glycated Hemoglobin)", value: "7.4", unit: "%", referenceRange: "4.0 - 5.6", flag: "high" },
          { name: "Fasting Blood Sugar (FBS)", value: "142", unit: "mg/dL", referenceRange: "70 - 99", flag: "high" },
          { name: "Post-Prandial Glucose (PPBS)", value: "198", unit: "mg/dL", referenceRange: "< 140", flag: "high" },
          { name: "Serum Creatinine", value: "0.95", unit: "mg/dL", referenceRange: "0.70 - 1.20", flag: "normal" },
          { name: "Estimated GFR (eGFR)", value: "88", unit: "mL/min/1.73m²", referenceRange: "> 60", flag: "normal" },
          { name: "Serum Potassium", value: "4.3", unit: "mEq/L", referenceRange: "3.5 - 5.1", flag: "normal" },
          { name: "Total Cholesterol", value: "215", unit: "mg/dL", referenceRange: "< 200", flag: "high" },
        ],
      },
      {
        id: "lab-102",
        testName: "Complete Blood Count & Inflammatory Markers",
        date: "12-Oct-2026",
        facility: "Apollo Hospital In-house Laboratory",
        confidence: "99.2% OCR Confidence",
        category: "Hematology",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "Hemoglobin", value: "14.2", unit: "g/dL", referenceRange: "13.0 - 17.0", flag: "normal" },
          { name: "Total Leucocyte Count (TLC)", value: "7,800", unit: "/µL", referenceRange: "4,000 - 11,000", flag: "normal" },
          { name: "Platelet Count", value: "245,000", unit: "/µL", referenceRange: "150,000 - 450,000", flag: "normal" },
          { name: "ESR (Westergren)", value: "14", unit: "mm/hr", referenceRange: "0 - 15", flag: "normal" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-1",
        date: "Today, 11:15 AM",
        doctor: "Dr. Anika Rao",
        department: "General Medicine (OPD Room 04)",
        chiefComplaint: "Epigastric burning pain x 3 days, aggravated by spicy food, nighttime discomfort",
        language: "Kannada / English (Ambient Capture)",
        summary: "Acute Peptic Dyspepsia in patient with known Type 2 DM & HTN. Prescribed Pantoprazole. SAFEGUARD allergy check verified.",
        soapNote: {
          subjective: "Patient reports 3-day history of burning epigastric discomfort, worse after dinner and spicy dietary triggers. No nausea, vomiting, hematemesis, or melena. Compliant with Metformin and Telmisartan.",
          objective: "BP: 138/88 mmHg, HR: 76 bpm, Afebrile, SpO2: 98% room air. Abdomen soft, mild focal tenderness in epigastrium, no guarding or rigidity. Bowel sounds present.",
          assessment: "Acute Dyspepsia (K30). Type 2 Diabetes Mellitus with sub-optimal glycemic control (HbA1c 7.4%). Essential Hypertension (well controlled).",
          plan: "1. Tab Pantoprazole 40mg PO OD before breakfast x 14 days.\n2. Continue Metformin 500mg BD.\n3. Continue Telmisartan 40mg OD.\n4. Dietary counselling: small frequent meals, avoid caffeine and chilies.\n5. Review in 2 weeks; repeat fasting glucose.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao, MBBS, MD (General Medicine)",
        signedAt: "Today, 11:28 AM",
      },
      {
        id: "con-2",
        date: "10-Nov-2026",
        doctor: "Dr. Anika Rao",
        department: "General Medicine (OPD Room 04)",
        chiefComplaint: "Routine 3-month diabetes follow-up and lab review",
        language: "Kannada",
        summary: "Reviewed HbA1c (7.4%). Advised dietary moderation and 30 mins brisk walking. Maintained Metformin dose.",
        soapNote: {
          subjective: "Patient feels well, no polyuria, polydipsia, or peripheral neuropathy symptoms. Adheres to morning walks.",
          objective: "BP: 132/84 mmHg, Weight: 74 kg, BMI: 25.8. Clear chest, S1S2 normal.",
          assessment: "Type 2 Diabetes Mellitus under fair control. Essential Hypertension controlled.",
          plan: "Refill Metformin 500mg BD x 90 days. Dietitian referral given.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao",
        signedAt: "10-Nov-2026, 10:45 AM",
      },
    ],
    timeline: [
      {
        id: "tl-1",
        date: "Today, 11:28 AM",
        type: "consultation",
        title: "OPD Consultation Scribe Signed",
        description: "Dr. Anika Rao signed draft SOAP note for Acute Peptic Dyspepsia. Generated via AAROGYA MITHRA LISTEN ambient capture.",
        source: "OPD Room 04 • Apollo Hospitals",
        badgeVariant: "teal",
      },
      {
        id: "tl-2",
        date: "Today, 11:15 AM",
        type: "medication",
        title: "Prescription: Tab Pantoprazole 40mg OD",
        description: "Initiated 14-day anti-secretory course for epigastric burning pain. Formularly cross-check passed.",
        source: "AAROGYA MITHRA e-Prescribe",
        badgeVariant: "success",
      },
      {
        id: "tl-3",
        date: "10-Nov-2026",
        type: "lab",
        title: "Metabolic Panel OCR Processed",
        description: "Thyrocare report ingested: HbA1c 7.4% (Elevated), Fasting Glucose 142 mg/dL, Creatinine 0.95 mg/dL (Normal).",
        source: "Thyrocare Central Diagnostics • READ Module",
        badgeVariant: "navy",
      },
      {
        id: "tl-4",
        date: "14-Aug-2024",
        type: "allergy",
        title: "CRITICAL: Penicillin Allergy Documented",
        description: "Severe anaphylactoid reaction with facial angioedema observed following Amoxicillin-Clavulanate administration at external clinic.",
        source: "Apollo Hospitals Emergency Triage",
        badgeVariant: "danger",
      },
      {
        id: "tl-5",
        date: "12-Oct-2021",
        type: "diagnosis",
        title: "Essential Hypertension Diagnosed",
        description: "Baseline BP 154/98 mmHg confirmed over 3 consecutive clinical readings. Initiated Tab Telmisartan 40mg OD.",
        source: "Cardiology OPD • Dr. Vikram Deshmukh",
        badgeVariant: "warning",
      },
      {
        id: "tl-6",
        date: "15-May-2019",
        type: "diagnosis",
        title: "Type 2 Diabetes Mellitus Diagnosed",
        description: "Fasting plasma glucose 168 mg/dL with HbA1c 8.6%. Initiated lifestyle modification and Metformin 500mg BD.",
        source: "Endocrinology OPD",
        badgeVariant: "warning",
      },
    ],
  },
  {
    id: "AM-93112",
    name: "Lakshmi Gowda",
    age: 48,
    dob: "1978-08-24",
    gender: "Female",
    preferredLanguage: "Kannada (ಕನ್ನಡ)",
    phone: "+91 94480 34567",
    email: "lakshmi.gowda@outlook.com",
    address: "Kengeri Satellite Town, Bengaluru, Karnataka 560060",
    emergencyContact: "Manjunath Gowda (Husband) • +91 94480 98765",
    bloodGroup: "O+",
    lastConsultation: "10-Nov-2026",
    status: "Waiting (Token #11)",
    statusVariant: "warning",
    vitals: "BP: 122/80 mmHg • HR: 70 bpm • TSH: 4.8 mIU/L • SpO2: 99%",
    allergies: [],
    medications: [
      {
        id: "med-201",
        name: "Tab Thyronorm 50mcg",
        genericName: "Levothyroxine Sodium",
        dosage: "50 mcg",
        frequency: "Once daily empty stomach early morning (1-0-0)",
        duration: "Ongoing",
        prescribedDate: "10-Nov-2026",
        prescribedBy: "Dr. Maya Shah (Endocrinology)",
        status: "active",
        indication: "Primary Hypothyroidism",
        source: "Endocrinology EMR",
      },
      {
        id: "med-202",
        name: "Tab Atorvastatin 10mg",
        genericName: "Atorvastatin Calcium",
        dosage: "10 mg",
        frequency: "Once daily bedtime (0-0-1)",
        duration: "Ongoing",
        prescribedDate: "10-Nov-2026",
        prescribedBy: "Dr. Anika Rao (General Medicine)",
        status: "active",
        indication: "Mild Dyslipidemia",
        source: "OPD Room 04 Prescription",
      },
    ],
    diagnoses: [
      {
        id: "diag-201",
        code: "ICD-10: E03.9",
        condition: "Primary Hypothyroidism",
        onset: "January 2022",
        status: "Managed",
        notes: "TSH currently 4.8 mIU/L on 50 mcg Thyronorm. Monitoring every 6 weeks.",
      },
      {
        id: "diag-202",
        code: "ICD-10: E78.0",
        condition: "Pure Hypercholesterolemia",
        onset: "July 2024",
        status: "Managed",
        notes: "Total cholesterol 228 mg/dL; LDL 148 mg/dL. Responding to Atorvastatin 10mg.",
      },
    ],
    surgicalHistory: ["Cesarean Section x 2 (2001, 2005)"],
    familyHistory: ["Sister: Hypothyroidism", "Mother: Rheumatoid Arthritis"],
    lifestyle: {
      diet: "South Indian Vegetarian",
      smoking: "Never",
      alcohol: "Never",
      physicalActivity: "Household daily activity, walking 20 mins",
    },
    labReports: [
      {
        id: "lab-201",
        testName: "Thyroid Profile & Lipid Screen",
        date: "08-Nov-2026",
        facility: "Dr. Lal PathLabs, Rajajinagar",
        confidence: "99.0% OCR Confidence",
        category: "Endocrinology",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "TSH (Ultrasensitive)", value: "4.8", unit: "mIU/L", referenceRange: "0.40 - 4.20", flag: "high" },
          { name: "Free T4 (FT4)", value: "1.18", unit: "ng/dL", referenceRange: "0.80 - 1.80", flag: "normal" },
          { name: "Total Cholesterol", value: "228", unit: "mg/dL", referenceRange: "< 200", flag: "high" },
          { name: "LDL Cholesterol", value: "148", unit: "mg/dL", referenceRange: "< 100", flag: "high" },
          { name: "HDL Cholesterol", value: "46", unit: "mg/dL", referenceRange: "> 50", flag: "low" },
          { name: "Triglycerides", value: "170", unit: "mg/dL", referenceRange: "< 150", flag: "high" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-201",
        date: "10-Nov-2026",
        doctor: "Dr. Anika Rao",
        department: "General Medicine",
        chiefComplaint: "Mild lethargy, routine TSH follow-up",
        language: "Kannada",
        summary: "TSH borderline high at 4.8. Re-emphasized taking Thyronorm strictly on empty stomach with plain water. Repeat in 6 weeks.",
        soapNote: {
          subjective: "Patient reports feeling mild fatigue towards evening. No cold intolerance, weight gain, or constipation. Complies with morning Levothyroxine.",
          objective: "BP: 122/80 mmHg, HR: 70 bpm. Thyroid non-palpable, no tremor, DTRs normal.",
          assessment: "Borderline elevated TSH (4.8 mIU/L) on Thyronorm 50 mcg.",
          plan: "Maintain Thyronorm 50 mcg OD. Advised strictly 1 hour gap before morning coffee or breakfast. Repeat TSH in 6 weeks.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao",
        signedAt: "10-Nov-2026, 10:15 AM",
      },
    ],
    timeline: [
      {
        id: "tl-201",
        date: "10-Nov-2026",
        type: "consultation",
        title: "Endocrinology Review Completed",
        description: "TSH 4.8 reviewed. Continued on Thyronorm 50 mcg with medication timing counsel.",
        source: "OPD Room 04 • Apollo Hospitals",
        badgeVariant: "teal",
      },
      {
        id: "tl-202",
        date: "08-Nov-2026",
        type: "lab",
        title: "Thyroid & Lipid Panel Uploaded",
        description: "Lal PathLabs report processed: TSH 4.8 mIU/L, Total Cholesterol 228 mg/dL.",
        source: "Dr. Lal PathLabs • READ Module",
        badgeVariant: "navy",
      },
      {
        id: "tl-203",
        date: "14-Jan-2022",
        type: "diagnosis",
        title: "Primary Hypothyroidism Confirmed",
        description: "Initial TSH 14.2 mIU/L with elevated anti-TPO antibodies. Commenced Thyronorm 25 mcg titrated to 50 mcg.",
        source: "Endocrinology Department",
        badgeVariant: "warning",
      },
    ],
  },
  {
    id: "AM-91048",
    name: "Mohammad Farooq",
    age: 62,
    dob: "1964-11-03",
    gender: "Male",
    preferredLanguage: "Hindi / Urdu",
    phone: "+91 97410 45678",
    email: "m.farooq.bangalore@gmail.com",
    address: "Shivajinagar Central, Bengaluru, Karnataka 560051",
    emergencyContact: "Zeenat Farooq (Daughter) • +91 97410 11223",
    bloodGroup: "A+",
    lastConsultation: "02-Nov-2026",
    status: "Waiting (Token #12)",
    statusVariant: "warning",
    vitals: "BP: 144/92 mmHg • HR: 82 bpm • Creatinine: 1.42 mg/dL • SpO2: 97%",
    allergies: [
      {
        id: "alg-301",
        allergen: "Aspirin (Acetylsalicylic Acid) & NSAIDs",
        severity: "Severe",
        reaction: "Acute bronchospasm, severe wheezing requiring nebulization",
        documentedDate: "05-Sep-2020",
        source: "Sri Jayadeva Institute of Cardiology",
        critical: true,
      },
    ],
    medications: [
      {
        id: "med-301",
        name: "Tab Clopidogrel 75mg",
        genericName: "Clopidogrel Bisulfate",
        dosage: "75 mg",
        frequency: "Once daily morning (1-0-0)",
        duration: "Ongoing",
        prescribedDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh (Cardiology)",
        status: "active",
        indication: "Secondary CAD prevention (Aspirin alternative)",
        source: "Jayadeva Cardiology EMR",
      },
      {
        id: "med-302",
        name: "Tab Atorvastatin 40mg",
        genericName: "Atorvastatin",
        dosage: "40 mg",
        frequency: "Once daily bedtime (0-0-1)",
        duration: "Ongoing",
        prescribedDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh",
        status: "active",
        indication: "Coronary Atherosclerosis",
        source: "Cardiology EMR",
      },
      {
        id: "med-303",
        name: "Tab Metoprolol Succinate 25mg",
        genericName: "Metoprolol Succinate ER",
        dosage: "25 mg",
        frequency: "Once daily morning (1-0-0)",
        duration: "Ongoing",
        prescribedDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh",
        status: "active",
        indication: "Post-PCI Rate Control",
        source: "Cardiology EMR",
      },
    ],
    diagnoses: [
      {
        id: "diag-301",
        code: "ICD-10: I25.10",
        condition: "Coronary Artery Disease (s/p LAD Stent)",
        onset: "August 2020",
        status: "Active",
        notes: "Drug-eluting stent to LAD in 2020. Managed on Clopidogrel due to Aspirin allergy.",
      },
      {
        id: "diag-302",
        code: "ICD-10: N18.2",
        condition: "Chronic Kidney Disease (Stage 2)",
        onset: "March 2023",
        status: "Active",
        notes: "Baseline Serum Creatinine 1.35 - 1.45 mg/dL; eGFR ~54 mL/min. Avoid all NSAIDs.",
      },
    ],
    surgicalHistory: [
      "Percutaneous Coronary Intervention (PCI to LAD with DES, 2020, Jayadeva)",
      "Bilateral Cataract Phacoemulsification (2022, Narayana Nethralaya)",
    ],
    familyHistory: ["Father: CAD, sudden cardiac death at age 58", "Mother: Type 2 DM"],
    lifestyle: {
      diet: "Non-vegetarian (Halal, high salt intake)",
      smoking: "Former smoker (Quit 2020 post-PCI, 20 pack-year history)",
      alcohol: "Never",
      physicalActivity: "Minimal walking, sedentary",
    },
    labReports: [
      {
        id: "lab-301",
        testName: "Renal Function & Cardiac Biomarkers",
        date: "01-Nov-2026",
        facility: "Apollo Hospital Laboratory",
        confidence: "99.5% OCR Confidence",
        category: "Renal",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "Serum Creatinine", value: "1.42", unit: "mg/dL", referenceRange: "0.70 - 1.20", flag: "high" },
          { name: "eGFR (CKD-EPI)", value: "54", unit: "mL/min/1.73m²", referenceRange: "> 60", flag: "low" },
          { name: "Blood Urea Nitrogen (BUN)", value: "24", unit: "mg/dL", referenceRange: "7 - 20", flag: "high" },
          { name: "Serum Potassium", value: "4.7", unit: "mEq/L", referenceRange: "3.5 - 5.1", flag: "normal" },
          { name: "Urine Albumin/Creatinine Ratio", value: "48", unit: "mg/g", referenceRange: "< 30", flag: "high" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-301",
        date: "02-Nov-2026",
        doctor: "Dr. Vikram Deshmukh",
        department: "Cardiology",
        chiefComplaint: "Mild pedal edema, routine post-stent cardiac checkup",
        language: "Hindi / Urdu",
        summary: "Creatinine 1.42 stable. Strictly cautioned against over-the-counter painkiller use. Clopidogrel continued.",
        soapNote: {
          subjective: "Patient reports no chest pain, palpitation, or orthopnea. Notes bilateral trace ankle swelling after standing.",
          objective: "BP: 144/92 mmHg, HR: 82 bpm regular. Trace pedal edema, no S3 gallop, lungs clear.",
          assessment: "Stable CAD s/p PCI. Stage 2 CKD with mild microalbuminuria.",
          plan: "1. Continue Clopidogrel 75mg OD.\n2. Atorvastatin 40mg bedtime.\n3. Metoprolol ER 25mg OD.\n4. Salt restriction < 4g/day.\n5. Repeat renal panel in 3 months.",
        },
        signed: true,
        signedBy: "Dr. Vikram Deshmukh, MD, DM (Cardiology)",
        signedAt: "02-Nov-2026, 12:40 PM",
      },
    ],
    timeline: [
      {
        id: "tl-301",
        date: "02-Nov-2026",
        type: "consultation",
        title: "Cardiology Follow-Up Completed",
        description: "Post-PCI evaluation completed. Trace ankle edema noted; renal safety confirmed.",
        source: "Cardiology OPD • Dr. Vikram Deshmukh",
        badgeVariant: "teal",
      },
      {
        id: "tl-302",
        date: "01-Nov-2026",
        type: "lab",
        title: "Renal Function Panel OCR Processed",
        description: "Apollo Lab report processed: Creatinine 1.42 mg/dL, eGFR 54 mL/min/1.73m² (Stage 2 CKD).",
        source: "Apollo Hospital Laboratory • READ Module",
        badgeVariant: "navy",
      },
      {
        id: "tl-303",
        date: "05-Sep-2020",
        type: "allergy",
        title: "CRITICAL: Aspirin Bronchospasm Documented",
        description: "Severe wheezing provoked by Disprin. SAFEGUARD hard-stop configured for all salicylates.",
        source: "Jayadeva Emergency Unit",
        badgeVariant: "danger",
      },
    ],
  },
  {
    id: "AM-89412",
    name: "Ananya Sharma",
    age: 29,
    dob: "1997-02-18",
    gender: "Female",
    preferredLanguage: "Hindi / English",
    phone: "+91 99800 56789",
    email: "ananya.sharma@techcorp.in",
    address: "Indiranagar 100ft Road, Bengaluru, Karnataka 560038",
    emergencyContact: "Rohit Sharma (Brother) • +91 99800 99887",
    bloodGroup: "B+",
    lastConsultation: "28-Oct-2026",
    status: "Completed",
    statusVariant: "success",
    vitals: "BP: 116/74 mmHg • HR: 74 bpm • SpO2: 99% • Weight: 56 kg",
    allergies: [
      {
        id: "alg-401",
        allergen: "Sulfonamides (Bactrim, Septran)",
        severity: "Moderate",
        reaction: "Extensive cutaneous maculopapular rash, pruritus",
        documentedDate: "12-Jan-2021",
        source: "Manipal Hospital Dermatology",
        critical: false,
      },
    ],
    medications: [
      {
        id: "med-401",
        name: "Tab Naproxen 500mg",
        genericName: "Naproxen Sodium",
        dosage: "500 mg",
        frequency: "SOS at migraine onset with food (Max 2 doses/day)",
        duration: "As needed",
        prescribedDate: "28-Oct-2026",
        prescribedBy: "Dr. Anika Rao",
        status: "active",
        indication: "Acute Migraine Attack",
        source: "Neurology / OPD Consultation",
      },
      {
        id: "med-402",
        name: "Fluticasone Propionate Nasal Spray",
        genericName: "Fluticasone Propionate",
        dosage: "50 mcg/spray",
        frequency: "1 spray each nostril daily morning",
        duration: "1 Month",
        prescribedDate: "28-Oct-2026",
        prescribedBy: "Dr. Anika Rao",
        status: "active",
        indication: "Allergic Rhinitis",
        source: "OPD Room 04 Prescription",
      },
    ],
    diagnoses: [
      {
        id: "diag-401",
        code: "ICD-10: G43.109",
        condition: "Migraine with Visual Aura",
        onset: "2018",
        status: "Active",
        notes: "Triggers: screen exposure, sleep deprivation, missed meals. Responsive to Naproxen.",
      },
      {
        id: "diag-402",
        code: "ICD-10: J30.1",
        condition: "Allergic Rhinitis",
        onset: "2020",
        status: "Managed",
        notes: "Seasonal exacerbations during pollen seasons in Bengaluru.",
      },
    ],
    surgicalHistory: [],
    familyHistory: ["Mother: Migraine headaches", "Maternal Aunt: Bronchial asthma"],
    lifestyle: {
      diet: "Mixed Non-vegetarian",
      smoking: "Never",
      alcohol: "Social weekends (1-2 drinks)",
      physicalActivity: "Yoga 3x weekly, software engineer desk job",
    },
    labReports: [
      {
        id: "lab-401",
        testName: "Serum IgE & Complete Hemogram",
        date: "25-Oct-2026",
        facility: "Apollo Diagnostic Centre, Indiranagar",
        confidence: "99.4% OCR Confidence",
        category: "Hematology",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "Total Serum IgE", value: "312", unit: "IU/mL", referenceRange: "< 100", flag: "high" },
          { name: "Absolute Eosinophil Count", value: "540", unit: "/µL", referenceRange: "40 - 440", flag: "high" },
          { name: "Hemoglobin", value: "12.8", unit: "g/dL", referenceRange: "12.0 - 15.5", flag: "normal" },
          { name: "Serum Ferritin", value: "38", unit: "ng/mL", referenceRange: "15 - 150", flag: "normal" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-401",
        date: "28-Oct-2026",
        doctor: "Dr. Anika Rao",
        department: "General Medicine",
        chiefComplaint: "Recurrent hemicranial throbbing headaches preceded by visual scintilla",
        language: "Hindi / English",
        summary: "Classical migraine with visual aura. Advised sleep hygiene, hydration, and acute Naproxen protocol.",
        soapNote: {
          subjective: "Patient describes unilateral throbbing pain lasting 6-8 hours with photophobia, nausea, and visual aura.",
          objective: "BP: 116/74 mmHg, HR: 74 bpm. Neurological exam cranial nerves II-XII intact, no focal deficits.",
          assessment: "Migraine with Aura (G43.1). Allergic Rhinitis (J30.1).",
          plan: "1. Tab Naproxen 500mg SOS at aura onset.\n2. Fluticasone nasal spray 1 spray OD.\n3. Headache diary to identify dietary triggers.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao",
        signedAt: "28-Oct-2026, 03:20 PM",
      },
    ],
    timeline: [
      {
        id: "tl-401",
        date: "28-Oct-2026",
        type: "consultation",
        title: "Migraine Protocol Initiated",
        description: "Reviewed headache diary. Prescribed Naproxen SOS and nasal steroid for rhinitis.",
        source: "OPD Room 04 • Apollo Hospitals",
        badgeVariant: "teal",
      },
      {
        id: "tl-402",
        date: "12-Jan-2021",
        type: "allergy",
        title: "Sulfa Drug Cutaneous Reaction",
        description: "Generalized maculopapular rash after Septran administration for urinary tract infection.",
        source: "Manipal Dermatology Clinic",
        badgeVariant: "warning",
      },
    ],
  },
  {
    id: "AM-87220",
    name: "Venkat Rao",
    age: 68,
    dob: "1958-09-15",
    gender: "Male",
    preferredLanguage: "Kannada (ಕನ್ನಡ)",
    phone: "+91 94800 67890",
    email: "venkat.rao58@yahoo.com",
    address: "Malleshwaram 15th Cross, Bengaluru, Karnataka 560003",
    emergencyContact: "Girish Rao (Son) • +91 94800 12399",
    bloodGroup: "O+",
    lastConsultation: "Today, 09:00 AM",
    status: "Completed",
    statusVariant: "success",
    vitals: "BP: 136/84 mmHg • HR: 72 bpm • PSA: 2.1 ng/mL",
    allergies: [],
    medications: [
      {
        id: "med-501",
        name: "Tab Amlodipine 5mg",
        genericName: "Amlodipine Besylate",
        dosage: "5 mg",
        frequency: "Once daily morning (1-0-0)",
        duration: "Ongoing",
        prescribedDate: "Today, 09:00 AM",
        prescribedBy: "Dr. Anika Rao",
        status: "active",
        indication: "Essential Hypertension",
        source: "OPD Room 04 Prescription",
      },
      {
        id: "med-502",
        name: "Tab Tamsulosin 0.4mg",
        genericName: "Tamsulosin Hydrochloride",
        dosage: "0.4 mg",
        frequency: "Once daily bedtime (0-0-1)",
        duration: "Ongoing",
        prescribedDate: "15-Aug-2025",
        prescribedBy: "Dr. S. Kulkarni (Urology)",
        status: "active",
        indication: "Benign Prostatic Hyperplasia (BPH)",
        source: "Urology EMR",
      },
    ],
    diagnoses: [
      {
        id: "diag-501",
        code: "ICD-10: I10",
        condition: "Essential Hypertension",
        onset: "2015",
        status: "Managed",
        notes: "Good blood pressure control on Amlodipine 5mg.",
      },
      {
        id: "diag-502",
        code: "ICD-10: N40.1",
        condition: "Benign Prostatic Hyperplasia (BPH)",
        onset: "2023",
        status: "Managed",
        notes: "Mild lower urinary tract symptoms, stable on Tamsulosin.",
      },
    ],
    surgicalHistory: ["Transurethral Resection (TURP deferred, medical management)"],
    familyHistory: ["Father: Hypertension", "Brother: CAD"],
    lifestyle: {
      diet: "South Indian Vegetarian",
      smoking: "Never",
      alcohol: "Never",
      physicalActivity: "Walking 30 mins daily",
    },
    labReports: [
      {
        id: "lab-501",
        testName: "Serum PSA & Renal Ultrasound",
        date: "20-Sep-2026",
        facility: "Anand Diagnostic Laboratory, Bengaluru",
        confidence: "99.1% OCR Confidence",
        category: "Biochemistry",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "Total PSA", value: "2.1", unit: "ng/mL", referenceRange: "< 4.0", flag: "normal" },
          { name: "Serum Creatinine", value: "1.02", unit: "mg/dL", referenceRange: "0.7 - 1.2", flag: "normal" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-501",
        date: "Today, 09:00 AM",
        doctor: "Dr. Anika Rao",
        department: "General Medicine",
        chiefComplaint: "Routine hypertension medication refill",
        language: "Kannada",
        summary: "Blood pressure 136/84 mmHg. Amlodipine refill issued for 90 days.",
        soapNote: {
          subjective: "Patient feels well, no dizziness or pedal swelling.",
          objective: "BP: 136/84 mmHg, HR: 72 bpm. Heart and lung sounds normal.",
          assessment: "Essential Hypertension well controlled.",
          plan: "Refill Amlodipine 5mg OD x 90 days. Review in 3 months.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao",
        signedAt: "Today, 09:18 AM",
      },
    ],
    timeline: [
      {
        id: "tl-501",
        date: "Today, 09:18 AM",
        type: "consultation",
        title: "Hypertension Routine Refill",
        description: "BP 136/84 verified. 90-day Amlodipine supply approved.",
        source: "OPD Room 04",
        badgeVariant: "teal",
      },
    ],
  },
  {
    id: "AM-85119",
    name: "Sunita Patil",
    age: 41,
    dob: "1985-05-19",
    gender: "Female",
    preferredLanguage: "Hindi (हिंदी)",
    phone: "+91 97310 78901",
    email: "sunita.patil85@gmail.com",
    address: "Koramangala 5th Block, Bengaluru, Karnataka 560095",
    emergencyContact: "Anil Patil (Husband) • +91 97310 44556",
    bloodGroup: "AB+",
    lastConsultation: "Today, 08:35 AM",
    status: "Completed",
    statusVariant: "success",
    vitals: "BP: 120/78 mmHg • HR: 78 bpm • SpO2: 98% • Peak Flow: 380 L/min",
    allergies: [
      {
        id: "alg-601",
        allergen: "Diclofenac & Ibuprofen",
        severity: "Moderate",
        reaction: "Gastric erosion and severe bronchospasm",
        documentedDate: "10-Feb-2023",
        source: "St. Martha's Hospital",
        critical: false,
      },
    ],
    medications: [
      {
        id: "med-601",
        name: "Budesonide + Formoterol Inhaler (200/6mcg)",
        genericName: "Budesonide / Formoterol Fumarate",
        dosage: "200/6 mcg",
        frequency: "1 puff twice daily (1-0-1)",
        duration: "Ongoing",
        prescribedDate: "Today, 08:35 AM",
        prescribedBy: "Dr. Anika Rao",
        status: "active",
        indication: "Bronchial Asthma Maintenance",
        source: "OPD Room 04",
      },
    ],
    diagnoses: [
      {
        id: "diag-601",
        code: "ICD-10: J45.909",
        condition: "Bronchial Asthma (Moderate Persistent)",
        onset: "2016",
        status: "Managed",
        notes: "Well-controlled on inhaled corticosteroid / LABA combination.",
      },
    ],
    surgicalHistory: [],
    familyHistory: ["Father: Chronic Bronchitis", "Mother: Healthy"],
    lifestyle: {
      diet: "Vegetarian",
      smoking: "Never",
      alcohol: "Never",
      physicalActivity: "Regular yoga & breathing exercises (Pranayama)",
    },
    labReports: [
      {
        id: "lab-601",
        testName: "Spirometry & Eosinophil Count",
        date: "14-Aug-2026",
        facility: "Apollo Pulmonary Lab",
        confidence: "99.0% OCR Confidence",
        category: "Hematology",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "FEV1 / FVC Ratio", value: "76", unit: "%", referenceRange: "> 70", flag: "normal" },
          { name: "Absolute Eosinophils", value: "320", unit: "/µL", referenceRange: "40 - 440", flag: "normal" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-601",
        date: "Today, 08:35 AM",
        doctor: "Dr. Anika Rao",
        department: "General Medicine",
        chiefComplaint: "Mild seasonal wheeze triggered by Bengaluru winter morning fog",
        language: "Hindi",
        summary: "Asthma exacerbation mild. Reviewed inhaler technique with spacer. Continued Budecort/Formoterol.",
        soapNote: {
          subjective: "Patient noticed morning chest tightness after morning jog in cold weather.",
          objective: "Lungs: bilateral end-expiratory polyphonic wheeze, no intercostal retractions. SpO2: 98%.",
          assessment: "Mild winter asthma trigger.",
          plan: "Reinforce inhaler usage. Gargle post inhalation. Avoid cold beverages.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao",
        signedAt: "Today, 08:50 AM",
      },
    ],
    timeline: [
      {
        id: "tl-601",
        date: "Today, 08:50 AM",
        type: "consultation",
        title: "Asthma Assessment & Inhaler Review",
        description: "Seasonal wheezing evaluated. Inhaler spacer technique re-demonstrated.",
        source: "OPD Room 04",
        badgeVariant: "teal",
      },
    ],
  },
  {
    id: "AM-84092",
    name: "Kavitha Murthy",
    age: 36,
    dob: "1990-11-29",
    gender: "Female",
    preferredLanguage: "Kannada / English",
    phone: "+91 98455 89012",
    email: "kavitha.m90@gmail.com",
    address: "BTM Layout 2nd Stage, Bengaluru, Karnataka 560076",
    emergencyContact: "Suresh Murthy (Husband) • +91 98455 33221",
    bloodGroup: "B+",
    lastConsultation: "12-Nov-2026",
    status: "Follow-up Scheduled",
    statusVariant: "navy",
    vitals: "BP: 114/72 mmHg • HR: 80 bpm • Hemoglobin: 10.4 g/dL",
    allergies: [],
    medications: [
      {
        id: "med-701",
        name: "Tab Ferrous Ascorbate + Folic Acid",
        genericName: "Ferrous Ascorbate / Folic Acid",
        dosage: "100mg elemental iron + 1.5mg FA",
        frequency: "Once daily after lunch (0-1-0)",
        duration: "3 Months",
        prescribedDate: "12-Nov-2026",
        prescribedBy: "Dr. Maya Shah",
        status: "active",
        indication: "Iron Deficiency Anemia",
        source: "OPD Room 04",
      },
    ],
    diagnoses: [
      {
        id: "diag-701",
        code: "ICD-10: D50.9",
        condition: "Iron Deficiency Anemia",
        onset: "2024",
        status: "Active",
        notes: "Microcytic hypochromic anemia. Hb 10.4 g/dL; Ferritin 14 ng/mL.",
      },
    ],
    surgicalHistory: [],
    familyHistory: ["Mother: Anemia, Hypothyroidism"],
    lifestyle: {
      diet: "Vegetarian with intermittent green leafy vegetables",
      smoking: "Never",
      alcohol: "Never",
      physicalActivity: "Moderate active",
    },
    labReports: [
      {
        id: "lab-701",
        testName: "Anemia Profile & Serum Ferritin",
        date: "11-Nov-2026",
        facility: "Thyrocare Central Diagnostics",
        confidence: "99.3% OCR Confidence",
        category: "Hematology",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "Hemoglobin", value: "10.4", unit: "g/dL", referenceRange: "12.0 - 15.5", flag: "low" },
          { name: "Serum Ferritin", value: "14", unit: "ng/mL", referenceRange: "15 - 150", flag: "low" },
          { name: "Total Iron Binding Capacity", value: "420", unit: "µg/dL", referenceRange: "250 - 400", flag: "high" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-701",
        date: "12-Nov-2026",
        doctor: "Dr. Maya Shah",
        department: "General Medicine",
        chiefComplaint: "Post-partum fatigue, brittle nails, easy fatigability",
        language: "Kannada / English",
        summary: "Iron deficiency anemia confirmed. Commenced oral iron therapy with dietary guidance.",
        soapNote: {
          subjective: "Fatigue x 2 months, no menorrhagia or GI bleeding.",
          objective: "Pallor present in lower palpebral conjunctiva. No pedal edema.",
          assessment: "Microcytic hypochromic iron deficiency anemia.",
          plan: "Oral Ferrous Ascorbate x 3 months. Repeat CBC after 60 days.",
        },
        signed: true,
        signedBy: "Dr. Maya Shah",
        signedAt: "12-Nov-2026, 04:15 PM",
      },
    ],
    timeline: [
      {
        id: "tl-701",
        date: "12-Nov-2026",
        type: "consultation",
        title: "Iron Deficiency Treatment Started",
        description: "Prescribed Ferrous Ascorbate with ascorbic acid for improved absorption.",
        source: "OPD Room 04",
        badgeVariant: "teal",
      },
    ],
  },
  {
    id: "AM-82910",
    name: "Arjun Nair",
    age: 51,
    dob: "1975-01-08",
    gender: "Male",
    preferredLanguage: "Indian English",
    phone: "+91 98451 90123",
    email: "arjun.nair@corporate.in",
    address: "Whitefield Inner Circle, Bengaluru, Karnataka 560066",
    emergencyContact: "Deepa Nair (Wife) • +91 98451 44556",
    bloodGroup: "A+",
    lastConsultation: "20-Oct-2026",
    status: "Completed",
    statusVariant: "success",
    vitals: "BP: 128/82 mmHg • HR: 74 bpm • Uric Acid: 5.8 mg/dL",
    allergies: [
      {
        id: "alg-801",
        allergen: "Allopurinol Hypersensitivity",
        severity: "Severe",
        reaction: "Exfoliative dermatitis and fever",
        documentedDate: "04-May-2022",
        source: "Manipal Hospital Rheumatology",
        critical: true,
      },
    ],
    medications: [
      {
        id: "med-801",
        name: "Tab Febuxostat 40mg",
        genericName: "Febuxostat",
        dosage: "40 mg",
        frequency: "Once daily morning (1-0-0)",
        duration: "Ongoing",
        prescribedDate: "20-Oct-2026",
        prescribedBy: "Dr. Anika Rao",
        status: "active",
        indication: "Chronic Hyperuricemia / Gout Prevention",
        source: "Rheumatology EMR",
      },
    ],
    diagnoses: [
      {
        id: "diag-801",
        code: "ICD-10: M10.0",
        condition: "Idiopathic Gouty Arthritis",
        onset: "2021",
        status: "Managed",
        notes: "Recurrent attacks in right first MTP joint. Managed on Febuxostat due to Allopurinol reaction.",
      },
    ],
    surgicalHistory: [],
    familyHistory: ["Father: Gout, Hypertension"],
    lifestyle: {
      diet: "Non-vegetarian (seafood, red meat restricted)",
      smoking: "Former occasional",
      alcohol: "Occasional beer (advised strict abstinence)",
      physicalActivity: "Gymnasium workout 3x weekly",
    },
    labReports: [
      {
        id: "lab-801",
        testName: "Serum Uric Acid & Renal Markers",
        date: "18-Oct-2026",
        facility: "Manipal Hospital Laboratory",
        confidence: "99.2% OCR Confidence",
        category: "Biochemistry",
        status: "Reviewed by Doctor",
        parameters: [
          { name: "Serum Uric Acid", value: "5.8", unit: "mg/dL", referenceRange: "3.5 - 7.2", flag: "normal" },
          { name: "Serum Creatinine", value: "0.98", unit: "mg/dL", referenceRange: "0.7 - 1.2", flag: "normal" },
        ],
      },
    ],
    consultations: [
      {
        id: "con-801",
        date: "20-Oct-2026",
        doctor: "Dr. Anika Rao",
        department: "General Medicine",
        chiefComplaint: "Serum uric acid review, zero flares in last 6 months",
        language: "Indian English",
        summary: "Target uric acid < 6.0 mg/dL achieved on Febuxostat 40mg. Continued current regimen.",
        soapNote: {
          subjective: "Zero podagra attacks since starting Febuxostat. Adhering to purine restriction.",
          objective: "Right 1st MTP joint calm, no swelling, erythema, or tophi.",
          assessment: "Chronic gouty arthritis in remission.",
          plan: "Continue Febuxostat 40mg OD. Routine liver enzymes in 6 months.",
        },
        signed: true,
        signedBy: "Dr. Anika Rao",
        signedAt: "20-Oct-2026, 11:30 AM",
      },
    ],
    timeline: [
      {
        id: "tl-801",
        date: "20-Oct-2026",
        type: "consultation",
        title: "Gout Remission Documented",
        description: "Uric acid maintained at 5.8 mg/dL. Continued Febuxostat 40mg.",
        source: "OPD Room 04",
        badgeVariant: "teal",
      },
      {
        id: "tl-802",
        date: "04-May-2022",
        type: "allergy",
        title: "CRITICAL: Allopurinol Hypersensitivity",
        description: "Exfoliative rash provoked by Allopurinol. SAFEGUARD rule ensures Febuxostat substitution.",
        source: "Manipal Rheumatology Unit",
        badgeVariant: "danger",
      },
    ],
  },
];

// In-memory patient store with local persistence
let patientStore: PatientProfile[] = [...initialPatients];
const listeners: Array<() => void> = [];

export function getPatients(): PatientProfile[] {
  return [...patientStore];
}

export function getPatientById(id: string): PatientProfile | undefined {
  return patientStore.find((p) => p.id.toUpperCase() === id.toUpperCase());
}

export function addPatientRecord(record: {
  name: string;
  age: number;
  dob?: string;
  gender: "Male" | "Female" | "Other";
  preferredLanguage: string;
  phone: string;
  email?: string;
  address?: string;
  emergencyContact?: string;
  bloodGroup?: string;
  knownAllergies?: string;
  existingConditions?: string;
}): PatientProfile {
  const mrnNum = Math.floor(10000 + Math.random() * 90000);
  const newId = `AM-${mrnNum}`;

  const allergiesList: AllergyItem[] = [];
  if (record.knownAllergies && record.knownAllergies.trim() && record.knownAllergies.toLowerCase() !== "none" && record.knownAllergies.toLowerCase() !== "nkda") {
    allergiesList.push({
      id: `alg-${Date.now()}`,
      allergen: record.knownAllergies,
      severity: record.knownAllergies.toLowerCase().includes("penicillin") || record.knownAllergies.toLowerCase().includes("aspirin") ? "Severe" : "Moderate",
      reaction: "Patient-reported adverse reaction",
      documentedDate: "Today",
      source: "OPD Registration Intake",
      critical: record.knownAllergies.toLowerCase().includes("penicillin") || record.knownAllergies.toLowerCase().includes("aspirin"),
    });
  }

  const diagnosesList: DiagnosisItem[] = [];
  if (record.existingConditions && record.existingConditions.trim()) {
    record.existingConditions.split(",").forEach((cond, idx) => {
      diagnosesList.push({
        id: `diag-new-${idx}`,
        code: "Clinical Entry",
        condition: cond.trim(),
        onset: "Patient Reported",
        status: "Active",
        notes: "Intake record at registration",
      });
    });
  }

  const newPatient: PatientProfile = {
    id: newId,
    name: record.name,
    age: record.age,
    dob: record.dob || "1985-01-01",
    gender: record.gender,
    preferredLanguage: record.preferredLanguage || "Kannada (ಕನ್ನಡ)",
    phone: record.phone || "+91 98450 00000",
    email: record.email || `${record.name.toLowerCase().replace(/\s+/g, ".")}@example.com`,
    address: record.address || "Bengaluru, Karnataka",
    emergencyContact: record.emergencyContact || "Family Member",
    bloodGroup: record.bloodGroup || "O+",
    lastConsultation: "Today (Intake Queue)",
    status: "Waiting (Token #11)",
    statusVariant: "warning",
    vitals: "BP: 120/80 mmHg • HR: 74 bpm • SpO2: 98%",
    allergies: allergiesList,
    medications: [],
    diagnoses: diagnosesList,
    surgicalHistory: [],
    familyHistory: [],
    lifestyle: {
      diet: "Mixed Diet",
      smoking: "Non-smoker",
      alcohol: "Non-drinker",
      physicalActivity: "Moderate",
    },
    labReports: [],
    consultations: [],
    timeline: [
      {
        id: `tl-${Date.now()}`,
        date: "Today",
        type: "consultation",
        title: "Registered in OPD Queue",
        description: `Enrolled into Room 04 outpatient registry. Preferred language: ${record.preferredLanguage}.`,
        source: "AAROGYA MITHRA Intake Desk",
        badgeVariant: "teal",
      },
    ],
  };

  patientStore = [newPatient, ...patientStore];
  listeners.forEach((l) => l());
  return newPatient;
}

export function subscribePatients(callback: () => void): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
