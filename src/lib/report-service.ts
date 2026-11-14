/**
 * AAROGYA MITHRA — Medical Report Intelligence Service Layer (READ Module)
 *
 * Provides synthetic diagnostic laboratory reports, scanned prescriptions,
 * OCR entity extraction results, and confidence scoring.
 */

export interface ExtractedLabBiomarker {
  id: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange: string;
  flag: "normal" | "high" | "low" | "critical";
  confidence: number; // e.g. 99, 98, 74
  confidenceLevel: "successful" | "requires_verification" | "unreadable" | "missing";
  sourceDocument: string;
  notes?: string;
}

export interface ExtractedPrescriptionItem {
  id: string;
  medicationName: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescriptionDate: string;
  prescribedBy: string;
  facility: string;
  confidence: number;
  confidenceLevel: "successful" | "requires_verification" | "unreadable" | "missing";
  sourceDocument: string;
  safetyAlert?: string;
}

export interface ReportDocument {
  id: string;
  fileName: string;
  fileType: "pdf" | "jpg" | "png";
  fileSize: string;
  documentCategory: "Laboratory Report" | "Prescription";
  uploadDate: string;
  reportDate: string;
  processingStatus:
    | "OCR Complete"
    | "Requires Verification"
    | "Processing"
    | "Text Extracted"
    | "OCR Extracted"
    | "Text Incomplete"
    | "OCR Unconfigured";
  overallConfidence: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  facility: string;
  accreditation: string;
  confidenceBreakdown: {
    successful: number;
    requiresVerification: number;
    unreadable: number;
    missing: number;
  };
  missingFields: string[];
  unreadableFields: string[];
  extractedLabData?: ExtractedLabBiomarker[];
  extractedRxData?: ExtractedPrescriptionItem[];
  // Visual Document Layout simulation data
  visualDocument: {
    headerTitle: string;
    subHeader: string;
    specimenType?: string;
    sampleId: string;
    collectionTime: string;
    reportingTime: string;
    labDirector: string;
    pathologistSignature: string;
    hasWatermark: boolean;
    hasBarcode: boolean;
  };
}

export const mockReportDocuments: ReportDocument[] = [
  {
    id: "rep-thyrocare-01",
    fileName: "Thyrocare_Metabolic_HbA1c_Kumar_R.pdf",
    fileType: "pdf",
    fileSize: "2.4 MB",
    documentCategory: "Laboratory Report",
    uploadDate: "Today, 10:45 AM",
    reportDate: "10-Nov-2026",
    processingStatus: "OCR Complete",
    overallConfidence: "98.8%",
    patientId: "AM-94021",
    patientName: "Rajesh Kumar",
    patientAge: 54,
    patientGender: "Male",
    facility: "Thyrocare Central Diagnostics, Bengaluru",
    accreditation: "NABL & CAP Accredited Laboratory (ISO 15189)",
    confidenceBreakdown: {
      successful: 6,
      requiresVerification: 1,
      unreadable: 0,
      missing: 0,
    },
    missingFields: [],
    unreadableFields: [],
    visualDocument: {
      headerTitle: "THYROCARE TECHNOLOGIES CENTRAL DIAGNOSTIC LABORATORY",
      subHeader: "Comprehensive Diabetic & Metabolic Profile • Automated Photometry & HPLC",
      specimenType: "Serum & Whole Blood (K2 EDTA)",
      sampleId: "THY-BLR-998412",
      collectionTime: "10-Nov-2026 07:30 AM",
      reportingTime: "10-Nov-2026 02:15 PM",
      labDirector: "Dr. K. S. Murthy, MD (Biochemistry)",
      pathologistSignature: "Verified Electronically via Digital PKI Key",
      hasWatermark: true,
      hasBarcode: true,
    },
    extractedLabData: [
      {
        id: "bm-1",
        testName: "HbA1c (Glycated Hemoglobin) by HPLC",
        result: "7.4",
        unit: "%",
        referenceRange: "4.0 - 5.6",
        flag: "high",
        confidence: 99.2,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Table 1, Row 1",
        notes: "Suboptimal glycemic control. Consistent with 3-month average glucose of 165 mg/dL.",
      },
      {
        id: "bm-2",
        testName: "Fasting Blood Sugar (FBS)",
        result: "142",
        unit: "mg/dL",
        referenceRange: "70 - 99",
        flag: "high",
        confidence: 99.4,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Table 1, Row 2",
        notes: "Elevated fasting plasma glucose.",
      },
      {
        id: "bm-3",
        testName: "Post-Prandial Blood Sugar (PPBS)",
        result: "198",
        unit: "mg/dL",
        referenceRange: "< 140",
        flag: "high",
        confidence: 98.6,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Table 1, Row 3",
      },
      {
        id: "bm-4",
        testName: "Serum Creatinine (Enzymatic Method)",
        result: "0.95",
        unit: "mg/dL",
        referenceRange: "0.70 - 1.20",
        flag: "normal",
        confidence: 99.1,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Table 2, Row 1",
        notes: "Normal renal filtration index.",
      },
      {
        id: "bm-5",
        testName: "Estimated GFR (CKD-EPI formula)",
        result: "88",
        unit: "mL/min/1.73m²",
        referenceRange: "> 60",
        flag: "normal",
        confidence: 98.9,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Table 2, Row 2",
      },
      {
        id: "bm-6",
        testName: "Serum Potassium (Ion Selective Electrode)",
        result: "4.3",
        unit: "mEq/L",
        referenceRange: "3.5 - 5.1",
        flag: "normal",
        confidence: 97.8,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Table 2, Row 3",
      },
      {
        id: "bm-7",
        testName: "Total Cholesterol",
        result: "215",
        unit: "mg/dL",
        referenceRange: "< 200",
        flag: "high",
        confidence: 84.5,
        confidenceLevel: "requires_verification",
        sourceDocument: "Page 1, Table 3, Row 1",
        notes: "Slight smudge on right boundary of table column. Doctor verification recommended.",
      },
    ],
  },
  {
    id: "rep-lal-02",
    fileName: "DrLal_Thyroid_Lipid_Gowda_L.pdf",
    fileType: "pdf",
    fileSize: "1.8 MB",
    documentCategory: "Laboratory Report",
    uploadDate: "Yesterday, 04:12 PM",
    reportDate: "08-Nov-2026",
    processingStatus: "OCR Complete",
    overallConfidence: "99.0%",
    patientId: "AM-93112",
    patientName: "Lakshmi Gowda",
    patientAge: 48,
    patientGender: "Female",
    facility: "Dr. Lal PathLabs, Rajajinagar, Bengaluru",
    accreditation: "NABL Certified Lab",
    confidenceBreakdown: {
      successful: 6,
      requiresVerification: 0,
      unreadable: 0,
      missing: 0,
    },
    missingFields: [],
    unreadableFields: [],
    visualDocument: {
      headerTitle: "DR. LAL PATHLABS CLINICAL TESTING NETWORK",
      subHeader: "Endocrinology & Clinical Biochemistry Department",
      specimenType: "Serum (Venous Blood)",
      sampleId: "LAL-BLR-441029",
      collectionTime: "08-Nov-2026 08:15 AM",
      reportingTime: "08-Nov-2026 03:30 PM",
      labDirector: "Dr. R. Venkataraman, MD",
      pathologistSignature: "Digitally Authorized Specialist",
      hasWatermark: true,
      hasBarcode: true,
    },
    extractedLabData: [
      {
        id: "bm-201",
        testName: "TSH (Ultrasensitive Electrochemiluminescence)",
        result: "4.8",
        unit: "mIU/L",
        referenceRange: "0.40 - 4.20",
        flag: "high",
        confidence: 99.5,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Section A, Row 1",
        notes: "Borderline high TSH indicating mild under-replacement or morning dosage non-adherence.",
      },
      {
        id: "bm-202",
        testName: "Free T4 (FT4)",
        result: "1.18",
        unit: "ng/dL",
        referenceRange: "0.80 - 1.80",
        flag: "normal",
        confidence: 99.1,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Section A, Row 2",
      },
      {
        id: "bm-203",
        testName: "Total Cholesterol",
        result: "228",
        unit: "mg/dL",
        referenceRange: "< 200",
        flag: "high",
        confidence: 99.0,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Section B, Row 1",
      },
      {
        id: "bm-204",
        testName: "LDL Cholesterol (Calculated)",
        result: "148",
        unit: "mg/dL",
        referenceRange: "< 100",
        flag: "high",
        confidence: 98.7,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Section B, Row 2",
      },
      {
        id: "bm-205",
        testName: "HDL Cholesterol",
        result: "46",
        unit: "mg/dL",
        referenceRange: "> 50",
        flag: "low",
        confidence: 98.4,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Section B, Row 3",
      },
      {
        id: "bm-206",
        testName: "Serum Triglycerides",
        result: "170",
        unit: "mg/dL",
        referenceRange: "< 150",
        flag: "high",
        confidence: 98.8,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Section B, Row 4",
      },
    ],
  },
  {
    id: "rep-manipal-rx-03",
    fileName: "Jayadeva_Cardiology_Rx_Farooq_M.jpg",
    fileType: "jpg",
    fileSize: "3.1 MB",
    documentCategory: "Prescription",
    uploadDate: "02-Nov-2026, 02:30 PM",
    reportDate: "02-Nov-2026",
    processingStatus: "Requires Verification",
    overallConfidence: "93.4%",
    patientId: "AM-91048",
    patientName: "Mohammad Farooq",
    patientAge: 62,
    patientGender: "Male",
    facility: "Sri Jayadeva Institute of Cardiovascular Sciences, Bengaluru",
    accreditation: "Government Autonomous Institute of Cardiac Care",
    confidenceBreakdown: {
      successful: 3,
      requiresVerification: 1,
      unreadable: 1,
      missing: 1,
    },
    missingFields: [
      "Duration for Tab Atorvastatin was not explicitly specified on Rx line 2",
    ],
    unreadableFields: [
      "Doctor's Karnataka Medical Council registration stamp sub-digit was smudged on lower right seal",
    ],
    visualDocument: {
      headerTitle: "SRI JAYADEVA INSTITUTE OF CARDIOVASCULAR SCIENCES & RESEARCH",
      subHeader: "Bannerghatta Road, Bengaluru • Outpatient Cardiology Clinic Slip",
      sampleId: "JAY-OPD-78210",
      collectionTime: "02-Nov-2026 11:30 AM",
      reportingTime: "02-Nov-2026 12:15 PM",
      labDirector: "Dr. Vikram Deshmukh, MD, DM (Cardiology)",
      pathologistSignature: "Physical Handwritten Physician Signature & OPD Seal",
      hasWatermark: false,
      hasBarcode: true,
    },
    extractedRxData: [
      {
        id: "rx-1",
        medicationName: "Tab Clopidogrel 75mg",
        genericName: "Clopidogrel Bisulfate",
        dosage: "75 mg",
        frequency: "Once daily morning (1-0-0)",
        duration: "Ongoing (3 months refill)",
        prescriptionDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh",
        facility: "Jayadeva Cardiology OPD",
        confidence: 98.2,
        confidenceLevel: "successful",
        sourceDocument: "Rx Line 1, Clear handwriting",
        safetyAlert: "Antiplatelet therapy for coronary stent; substitute for Aspirin due to documented asthma.",
      },
      {
        id: "rx-2",
        medicationName: "Tab Atorvastatin 40mg",
        genericName: "Atorvastatin Calcium",
        dosage: "40 mg",
        frequency: "Once daily at bedtime (0-0-1)",
        duration: "[MISSING ON SCRIPT — Unstated]",
        prescriptionDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh",
        facility: "Jayadeva Cardiology OPD",
        confidence: 76.5,
        confidenceLevel: "requires_verification",
        sourceDocument: "Rx Line 2, Duration omitted",
        safetyAlert: "High-intensity statin therapy. Doctor should confirm 90-day refill duration.",
      },
      {
        id: "rx-3",
        medicationName: "Tab Metoprolol Succinate 25mg ER",
        genericName: "Metoprolol Succinate Extended Release",
        dosage: "25 mg",
        frequency: "Once daily morning after food (1-0-0)",
        duration: "Ongoing",
        prescriptionDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh",
        facility: "Jayadeva Cardiology OPD",
        confidence: 97.4,
        confidenceLevel: "successful",
        sourceDocument: "Rx Line 3",
      },
      {
        id: "rx-4",
        medicationName: "Avoid Aspirin / NSAIDs (Disprin, Brufen)",
        dosage: "[CONTRAINDICATION HARD-STOP]",
        frequency: "Strict Avoidance",
        duration: "Permanent",
        prescriptionDate: "02-Nov-2026",
        prescribedBy: "Dr. Vikram Deshmukh",
        facility: "Jayadeva Cardiology OPD",
        confidence: 99.5,
        confidenceLevel: "successful",
        sourceDocument: "Red boxed handwritten warning at bottom of script",
        safetyAlert: "CRITICAL: Patient had severe aspirin-induced bronchospasm in 2020.",
      },
    ],
  },
  {
    id: "rep-manipal-ige-04",
    fileName: "Apollo_Allergy_IgE_Hemogram_Sharma_A.png",
    fileType: "png",
    fileSize: "1.6 MB",
    documentCategory: "Laboratory Report",
    uploadDate: "25-Oct-2026, 11:20 AM",
    reportDate: "25-Oct-2026",
    processingStatus: "OCR Complete",
    overallConfidence: "99.2%",
    patientId: "AM-89412",
    patientName: "Ananya Sharma",
    patientAge: 29,
    patientGender: "Female",
    facility: "Apollo Diagnostic Centre, Indiranagar, Bengaluru",
    accreditation: "CAP Accredited Clinical Laboratory",
    confidenceBreakdown: {
      successful: 4,
      requiresVerification: 0,
      unreadable: 0,
      missing: 0,
    },
    missingFields: [],
    unreadableFields: [],
    visualDocument: {
      headerTitle: "APOLLO DIAGNOSTICS LABORATORY SERVICES",
      subHeader: "Allergy Immunology & Hematology Profile",
      specimenType: "Venous Blood (Serum & EDTA)",
      sampleId: "APO-IND-33921",
      collectionTime: "25-Oct-2026 09:00 AM",
      reportingTime: "25-Oct-2026 04:30 PM",
      labDirector: "Dr. Meera Nambiar, MD (Pathology)",
      pathologistSignature: "Digitally Signed via Cloud Lab PKI",
      hasWatermark: true,
      hasBarcode: true,
    },
    extractedLabData: [
      {
        id: "bm-401",
        testName: "Total Serum IgE (Chemiluminescence)",
        result: "312",
        unit: "IU/mL",
        referenceRange: "< 100",
        flag: "high",
        confidence: 99.3,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Immunochemistry, Row 1",
        notes: "Elevated IgE indicative of allergic diathesis (Allergic Rhinitis).",
      },
      {
        id: "bm-402",
        testName: "Absolute Eosinophil Count (AEC)",
        result: "540",
        unit: "/µL",
        referenceRange: "40 - 440",
        flag: "high",
        confidence: 98.9,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Hematology, Row 1",
      },
      {
        id: "bm-403",
        testName: "Hemoglobin",
        result: "12.8",
        unit: "g/dL",
        referenceRange: "12.0 - 15.5",
        flag: "normal",
        confidence: 99.4,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Hematology, Row 2",
      },
      {
        id: "bm-404",
        testName: "Serum Ferritin",
        result: "38",
        unit: "ng/mL",
        referenceRange: "15 - 150",
        flag: "normal",
        confidence: 98.7,
        confidenceLevel: "successful",
        sourceDocument: "Page 1, Biochemistry, Row 1",
      },
    ],
  },
];

// In-memory reports store
let reportsStore: ReportDocument[] = [...mockReportDocuments];

export function getReports(): ReportDocument[] {
  return [...reportsStore];
}

export function getReportById(id: string): ReportDocument | undefined {
  return reportsStore.find((r) => r.id === id);
}

export function addUploadedReport(newReport: ReportDocument): void {
  reportsStore = [newReport, ...reportsStore];
}
