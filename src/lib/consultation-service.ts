/**
 * AAROGYA MITHRA — Clinical Consultation Service Layer (LISTEN Module)
 *
 * Provides synthetic dialogue streams, multilingual transcripts (Kannada, Hindi, English),
 * and structured SOAP clinical note extraction models.
 */

export interface SpeechTurn {
  id: string;
  speaker: "doctor" | "patient";
  speakerName: string;
  timestamp: string;
  originalText: string;
  language: "Kannada" | "Hindi" | "English" | "Code-Mixed";
  translation: string;
  entities?: string[];
}

export interface StructuredClinicalNote {
  chiefComplaint: string;
  symptoms: string[];
  duration: string;
  relevantHistory: string;
  observations: string;
  clinicianAssessment: string;
  treatmentPlan: string;
  uncertaintiesAndNegations: string[];
  evidenceConfidence: string;
  generatedAt: string;
  signedBy?: string;
  signedAt?: string;
  status: "Draft Advisory" | "Doctor Approved & Signed";
}

export interface ConsultationSafetyAudit {
  allergyAlerts: {
    severity: "critical" | "warning";
    title: string;
    description: string;
    ruleSource: string;
  }[];
  medicationConflicts: {
    severity: "warning" | "info";
    title: string;
    description: string;
  }[];
  missingInformation: string[];
  patientHistoryInconsistencies: string[];
}

export interface ConsultationSession {
  id: string; // e.g. "CS-101"
  patientId: string; // e.g. "AM-94021"
  room: string;
  department: string;
  doctorName: string;
  startedAt: string;
  language: "Kannada" | "Hindi" | "English" | "Code-Mixed";
  audioDuration: string;
  transcript: SpeechTurn[];
  extractedEntities: { text: string; category: string; code?: string }[];
  draftNote: StructuredClinicalNote;
  safetyAudit: ConsultationSafetyAudit;
}

export const mockConsultationSessions: Record<string, ConsultationSession> = {
  "CS-101": {
    id: "CS-101",
    patientId: "AM-94021",
    room: "OPD Room 04",
    department: "General Medicine",
    doctorName: "Dr. Anika Rao",
    startedAt: "Today, 11:15 AM",
    language: "Code-Mixed",
    audioDuration: "04:18",
    transcript: [
      {
        id: "turn-1",
        speaker: "doctor",
        speakerName: "Dr. Anika Rao",
        timestamp: "00:05",
        originalText: "ನಮಸ್ಕಾರ ರಾಜೇಶ್ ಅವರೇ, ಬನ್ನಿ ಕೂತ್ಕೊಳ್ಳಿ. ಇವತ್ತು ಏನು ತೊಂದರೆ ಆಗ್ತಿದೆ?",
        language: "Kannada",
        translation: "Namaskara Rajesh, please take a seat. What seems to be the trouble today?",
      },
      {
        id: "turn-2",
        speaker: "patient",
        speakerName: "Rajesh Kumar",
        timestamp: "00:14",
        originalText: "ನಮಸ್ಕಾರ ಡಾಕ್ಟರೇ. ನನಗೆ ಕಳೆದ ಮೂರು ದಿನಗಳಿಂದ ತೀವ್ರವಾದ ಹೊಟ್ಟೆ ಉರಿ ಆಗ್ತಿದೆ. ಎದೆ ಮಧ್ಯದಲ್ಲಿ ಉರಿ ಬಂದು ಗಂಟಲಿನವರೆಗೂ ಬರ್ತಿದೆ. ರಾತ್ರಿ ಊಟ ಆದ್ಮೇಲೆ ಮಲಗೋಕೆ ತುಂಬ ಕಷ್ಟ ಆಗ್ತಿದೆ.",
        language: "Kannada",
        translation: "Namaskara Doctor. For the past three days, I have severe burning pain in my stomach. The burning sensation rises into the chest up to my throat. It is very difficult to lie down after dinner at night.",
        entities: ["Epigastric Burning Pain", "Retrosternal Pyrosis", "Nocturnal Discomfort"],
      },
      {
        id: "turn-3",
        speaker: "doctor",
        speakerName: "Dr. Anika Rao",
        timestamp: "00:38",
        originalText: "ಸರಿ, ನೋವು ಊಟ ಮಾಡಿದ ತಕ್ಷಣ ಜಾಸ್ತಿ ಆಗ್ತಿದೆಯಾ? ವಾಂತಿ, ತಲೆಸುತ್ತು, ಅಥವಾ ಮಲದಲ್ಲಿ ರಕ್ತ ಹೋಗೋದು ಏನಾದ್ರೂ ಗಮನಿಸಿದ್ದೀರಾ?",
        language: "Kannada",
        translation: "I see. Does the pain worsen immediately following meals? Have you noticed any vomiting, dizziness, or black stools?",
      },
      {
        id: "turn-4",
        speaker: "patient",
        speakerName: "Rajesh Kumar",
        timestamp: "00:58",
        originalText: "ವಾಂತಿ ಏನೂ ಇಲ್ಲ ಡಾಕ್ಟರೇ. ರಕ್ತ ಹೋಗಿಲ್ಲ. ಆದರೆ spicy food ಅಥವಾ ಕಾಫಿ ಕುಡಿದರೆ ತುಂಬಾ ಜಾಸ್ತಿ ಆಗುತ್ತೆ. ಕಳೆದ ವಾರ wedding dinner ಇತ್ತು, ಅಲ್ಲಿಂದ ಈ problem ಶುರುವಾಯ್ತು.",
        language: "Code-Mixed",
        translation: "No vomiting at all, Doctor. No blood in stools. But whenever I have spicy food or coffee, it worsens significantly. There was a wedding dinner last week, and the problem began from then.",
        entities: ["Vomiting Negated [ABSENT]", "Melena Negated [ABSENT]", "Spicy Food Trigger"],
      },
      {
        id: "turn-5",
        speaker: "doctor",
        speakerName: "Dr. Anika Rao",
        timestamp: "01:25",
        originalText: "ನಿಮ್ಮ ಶುಗರ್ ಮತ್ತು ಬಿಪಿ ಮಾತ್ರೆಗಳನ್ನು ರೆಗ್ಯುಲರ್ ಆಗಿ ತಗೊಳ್ತಿದ್ದೀರಾ? ನೋವಿಗೆ ಏನಾದ್ರೂ ಬೇರೆ ಮಾತ್ರೆ ತಗೊಂಡ್ರಾ?",
        language: "Kannada",
        translation: "Are you taking your diabetes and BP tablets regularly? Have you taken any other painkillers for this pain?",
      },
      {
        id: "turn-6",
        speaker: "patient",
        speakerName: "Rajesh Kumar",
        timestamp: "01:45",
        originalText: "ಹೌದು, Metformin 500mg ಮತ್ತು Telmisartan 40mg ತಪ್ಪದೇ ತಗೊಳ್ತಿದ್ದೀನಿ. ಮೆಡಿಕಲ್ ಶಾಪ್‌ನಲ್ಲಿ ಒಬ್ಬರು pain killer ಕೊಡೋಕೆ ಹೋದ್ರು, ಆದರೆ ನನಗೆ Penicillin allergy ಇರೋದ್ರಿಂದ ನಾನು ಯಾವ ಹೊಸ ಮಾತ್ರೆಯನ್ನೂ ತಗೊಳ್ಳಿಲ್ಲ.",
        language: "Code-Mixed",
        translation: "Yes, I regularly take Metformin 500mg and Telmisartan 40mg without fail. Someone at the medical shop offered a painkiller, but since I have a Penicillin allergy, I refrained from taking any new tablets.",
        entities: ["Metformin Compliant", "Telmisartan Compliant", "Penicillin Allergy Self-Reported"],
      },
      {
        id: "turn-7",
        speaker: "doctor",
        speakerName: "Dr. Anika Rao",
        timestamp: "02:18",
        originalText: "ತುಂಬಾ ಒಳ್ಳೆಯ ಕೆಲಸ ಮಾಡಿದ್ರಿ. ನಿಮ್ಮ ಚಾರ್ಟ್‌ನಲ್ಲೂ ಪೆನ್ಸಿಲಿನ್ ಅಲರ್ಜಿ ರೆಕಾರ್ಡ್ ಆಗಿದೆ. ಹೊಟ್ಟೆ ಪರೀಕ್ಷೆ ಮಾಡೋಣ, ಇಲ್ಲಿ ಮಲಗಿ.",
        language: "Kannada",
        translation: "You did the right thing. Your chart also documents this Penicillin allergy. Let me examine your abdomen now, please lie down here.",
      },
    ],
    extractedEntities: [
      { text: "Epigastric Burning Pain", category: "Symptom", code: "ICD-10: R10.13" },
      { text: "Retrosternal Pyrosis (Heartburn)", category: "Symptom", code: "ICD-10: R12" },
      { text: "Duration: 3 Days", category: "Temporal", code: "Acute" },
      { text: "Vomiting [NEGATED]", category: "Negation", code: "Absent" },
      { text: "Hematemesis / Melena [NEGATED]", category: "Negation", code: "Absent" },
      { text: "Spicy dietary triggers", category: "Trigger" },
      { text: "Type 2 Diabetes Mellitus", category: "Condition", code: "ICD-10: E11.9" },
      { text: "Essential Hypertension", category: "Condition", code: "ICD-10: I10" },
      { text: "Penicillin Anaphylaxis", category: "Contraindication", code: "CRITICAL" },
    ],
    draftNote: {
      chiefComplaint: "Acute epigastric burning pain and retrosternal pyrosis for 3 days, exacerbated after spicy meals and when supine.",
      symptoms: [
        "Epigastric burning discomfort",
        "Retrosternal heartburn rising to throat",
        "Nocturnal discomfort preventing sleep",
        "Post-prandial heaviness after spicy food",
      ],
      duration: "3 days acute duration following dietary indiscretion (wedding meal)",
      relevantHistory: "Known Type 2 Diabetes Mellitus on Metformin 500mg BD (HbA1c 7.4%). Essential Hypertension on Telmisartan 40mg OD. Documented severe Penicillin allergy (anaphylactoid facial angioedema in 2024).",
      observations: "BP: 138/88 mmHg, HR: 76 bpm, Afebrile, SpO2: 98% room air. Abdomen soft; mild focal tenderness localized to the epigastrium upon deep palpation. No guarding, rigidity, rebound tenderness, or organomegaly. Normal bowel sounds.",
      clinicianAssessment: "1. Acute Peptic Dyspepsia / probable Gastritis (ICD-10: K30) secondary to spicy dietary indiscretion.\n2. Type 2 Diabetes Mellitus (ICD-10: E11.9, Fair control).\n3. Essential Hypertension (ICD-10: I10, Well controlled).",
      treatmentPlan: "• Tab Pantoprazole 40mg PO OD (30 mins before breakfast) x 14 days.\n• Continue Tab Metformin 500mg BD after meals.\n• Continue Tab Telmisartan 40mg OD morning.\n• Dietary counselling: small frequent meals, strictly avoid caffeine, deep-fried snacks, and late dinners.\n• Follow-up: 2 weeks in OPD Room 04 or SOS if severe pain, persistent vomiting, or black stools.",
      uncertaintiesAndNegations: [
        "Patient explicitly denies vomiting, hematemesis, melena, fever, or weight loss.",
        "Uncertainty regarding exact degree of nocturnal acid regurgitation versus gastric fullness.",
        "Zero prior endoscopy records available in hospital archive.",
      ],
      evidenceConfidence: "98.4% Audio-Transcript Grounding",
      generatedAt: "Today, 11:22 AM",
      status: "Draft Advisory",
    },
    safetyAudit: {
      allergyAlerts: [
        {
          severity: "critical",
          title: "SAFEGUARD HARD-STOP: Penicillin Allergy Documented",
          description: "Patient has documented anaphylactoid hypersensitivity to Penicillin/Amoxicillin. Ensure no beta-lactam class antibiotics or combination powders are prescribed.",
          ruleSource: "CDSCO Drug Safety Alert #4412 • Apollo Hospital Allergy Registry",
        },
      ],
      medicationConflicts: [
        {
          severity: "info",
          title: "PPI Co-prescription Advisory",
          description: "Co-prescribing Pantoprazole with Metformin is considered safe. If PPI therapy extends past 12 months, consider periodic Vitamin B12 monitoring.",
        },
      ],
      missingInformation: [
        "Exact duration of nighttime pain relief after drinking water was not quantified in speech.",
        "Recent home fasting blood glucose reading was not reported by patient during consultation.",
      ],
      patientHistoryInconsistencies: [
        "Patient stated blood sugar is 'completely normal under control', but latest Thyrocare laboratory panel (10-Nov) showed elevated Fasting Glucose (142 mg/dL) and HbA1c (7.4%).",
      ],
    },
  },
  "CS-102": {
    id: "CS-102",
    patientId: "AM-93112",
    room: "OPD Room 04",
    department: "General Medicine",
    doctorName: "Dr. Anika Rao",
    startedAt: "10-Nov-2026, 10:00 AM",
    language: "Kannada",
    audioDuration: "03:30",
    transcript: [
      {
        id: "t2-1",
        speaker: "doctor",
        speakerName: "Dr. Anika Rao",
        timestamp: "00:06",
        originalText: "ನಮಸ್ತೆ ಲಕ್ಷ್ಮಿ ಅವರೇ, ಥೈರಾಯ್ಡ್ ರಿಪೋರ್ಟ್ ಬಂತಾ? ಹೇಗಿದ್ದೀರಿ?",
        language: "Kannada",
        translation: "Namaste Lakshmi, did the thyroid lab report arrive? How are you feeling?",
      },
      {
        id: "t2-2",
        speaker: "patient",
        speakerName: "Lakshmi Gowda",
        timestamp: "00:18",
        originalText: "ಹೌದು ಡಾಕ್ಟರೇ, ಡಾ. ಲಾಲ್ ಲ್ಯಾಬ್‌ನಲ್ಲಿ ಟೆಸ್ಟ್ ಮಾಡಿಸಿದೆ. ಸಂಜೆ ವೇಳೆ ಸ್ವಲ್ಪ ಸುಸ್ತು ಆಗ್ತಿದೆ. ಉಳಿದಂತೆ ತೊಂದರೆ ಇಲ್ಲ.",
        language: "Kannada",
        translation: "Yes Doctor, I got tested at Dr. Lal PathLabs. Feeling slightly fatigued towards evening. Otherwise fine.",
        entities: ["Evening Fatigue", "TSH 4.8 mIU/L"],
      },
    ],
    extractedEntities: [
      { text: "Fatigue towards evening", category: "Symptom" },
      { text: "TSH 4.8 mIU/L (Borderline High)", category: "Lab Value" },
      { text: "Levothyroxine 50mcg", category: "Medication" },
    ],
    draftNote: {
      chiefComplaint: "Mild evening fatigue, routine 3-month thyroid follow-up with Dr. Lal PathLabs report.",
      symptoms: ["Mild evening fatigue", "No cold intolerance", "No weight fluctuations"],
      duration: "Intermittent lethargy over 3 weeks",
      relevantHistory: "Primary Hypothyroidism on Thyronorm 50 mcg OD. Pure Hypercholesterolemia on Atorvastatin 10mg.",
      observations: "BP: 122/80 mmHg, HR: 70 bpm. Thyroid non-palpable, no exophthalmos, deep tendon reflexes normal.",
      clinicianAssessment: "Borderline elevated TSH (4.8 mIU/L) on Thyronorm 50 mcg. Subclinical under-replacement vs. compliance timing issue.",
      treatmentPlan: "• Continue Thyronorm 50 mcg OD strictly with plain water 1 hr prior to morning coffee.\n• Continue Atorvastatin 10mg at bedtime.\n• Repeat TSH in 6 weeks.",
      uncertaintiesAndNegations: [
        "Patient occasionally takes Thyronorm with milk or tea; advised strictly plain water.",
        "Denies constipation, dry skin, or hair fall.",
      ],
      evidenceConfidence: "99.1% Audio-Transcript Grounding",
      generatedAt: "10-Nov-2026, 10:15 AM",
      status: "Doctor Approved & Signed",
      signedBy: "Dr. Anika Rao, MBBS, MD",
      signedAt: "10-Nov-2026, 10:18 AM",
    },
    safetyAudit: {
      allergyAlerts: [],
      medicationConflicts: [
        {
          severity: "info",
          title: "Levothyroxine Food Absorption Advisory",
          description: "Reminded patient to ensure minimum 60-minute interval before food, tea, coffee, or calcium supplements.",
        },
      ],
      missingInformation: [],
      patientHistoryInconsistencies: [],
    },
  },
};

export function getConsultationSession(id: string): ConsultationSession | undefined {
  return mockConsultationSessions[id] || mockConsultationSessions["CS-101"];
}
