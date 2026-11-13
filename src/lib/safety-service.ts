/**
 * AAROGYA MITHRA — Medication Safety Service Layer (SAFEGUARD Module)
 *
 * Provides deterministic medication verification rules, allergy conflict gating,
 * drug-drug interaction auditing, and evidence-grounded clinical references (CDSCO, BNF, FDA).
 */

export type SafetyAlertSeverity = "Critical" | "High" | "Moderate" | "Informational";

export type SafetyCategory =
  | "Drug-drug interactions"
  | "Documented allergy conflicts"
  | "Duplicate active medications"
  | "Supported contraindications"
  | "Missing medication information";

export interface SafetyAlert {
  id: string;
  medicationName: string;
  interactingDrug?: string;
  category: SafetyCategory;
  severity: SafetyAlertSeverity;
  title: string;
  description: string;
  evidenceSource: string;
  evidenceCitation: string;
  clinicalMechanism: string;
  clinicalRecommendation: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: string;
  reviewStatus:
    | "Pending Physician Review"
    | "Reviewed & Acknowledged"
    | "Overridden with Rationale"
    | "Order Blocked";
  reviewedBy?: string;
  reviewedAt?: string;
  doctorReviewNote?: string;
  isSeededDemonstration: boolean;
}

export interface SafetyMetrics {
  totalChecksPerformed: number;
  activeAlertsCount: number;
  allergyConflictsCount: number;
  duplicateMedicationsCount: number;
  interactionsRequiringReview: number;
}

export const initialSafetyAlerts: SafetyAlert[] = [
  {
    id: "saf-101",
    medicationName: "Amoxicillin-Clavulanate 625mg",
    category: "Documented allergy conflicts",
    severity: "Critical",
    title: "Penicillin Allergy Hard-Stop Interception",
    description: "Prescription attempts to dispense a beta-lactam antibiotic (Amoxicillin) to a patient with documented severe Penicillin-induced facial angioedema and anaphylaxis.",
    evidenceSource: "Central Drugs Standard Control Organisation (CDSCO)",
    evidenceCitation: "CDSCO Drug Safety Alert #4412 • Apollo Hospital Allergy Registry Record #AM-94021-ALG",
    clinicalMechanism: "IgE-mediated Type I hypersensitivity cross-reactivity with beta-lactam core ring structure. High risk of life-threatening bronchospasm or cardiovascular collapse.",
    clinicalRecommendation: "HARD-STOP GATE: Cancel order immediately. Substitute with macrolide (e.g. Azithromycin 500mg) or fluoroquinolone if clinically indicated.",
    patientId: "AM-94021",
    patientName: "Rajesh Kumar",
    patientAge: 54,
    patientGender: "Male",
    reviewStatus: "Order Blocked",
    reviewedBy: "Dr. Anika Rao, MBBS, MD",
    reviewedAt: "Today, 11:18 AM",
    doctorReviewNote: "Order blocked at intake. Substituted with non-beta-lactam advisory. Patient allergy card reaffirmed.",
    isSeededDemonstration: true,
  },
  {
    id: "saf-102",
    medicationName: "Aspirin (Acetylsalicylic Acid) 75mg",
    category: "Documented allergy conflicts",
    severity: "High",
    title: "Aspirin-Induced Asthma Exacerbation Risk",
    description: "Salicylate antiplatelet prescribed for patient with documented severe Aspirin-exacerbated respiratory disease (AERD) and acute bronchospasm history.",
    evidenceSource: "British National Formulary (BNF 86)",
    evidenceCitation: "BNF 86, Section 2.9 (Antiplatelet Drugs) • Global Initiative for Asthma (GINA 2024)",
    clinicalMechanism: "Inhibition of COX-1 shunts arachidonic acid metabolism down the 5-lipoxygenase pathway, resulting in excessive cysteinyl leukotriene release and profound bronchoconstriction.",
    clinicalRecommendation: "Maintain alternative antiplatelet therapy with Clopidogrel 75mg OD. Do not administer aspirin or non-selective NSAIDs.",
    patientId: "AM-91048",
    patientName: "Mohammad Farooq",
    patientAge: 62,
    patientGender: "Male",
    reviewStatus: "Pending Physician Review",
    isSeededDemonstration: true,
  },
  {
    id: "saf-103",
    medicationName: "Ciprofloxacin 500mg",
    interactingDrug: "Magnesium / Aluminium Hydroxide Antacid",
    category: "Drug-drug interactions",
    severity: "Moderate",
    title: "Fluoroquinolone Chelation Absorption Loss",
    description: "Oral Ciprofloxacin co-prescribed with polyvalent cation antacid. Forms insoluble chelate complex reducing antibiotic bioavailability by up to 85%.",
    evidenceSource: "British National Formulary (BNF 86)",
    evidenceCitation: "BNF 86, Appendix 1: Drug Interactions • US FDA Cipro Prescribing Guidelines",
    clinicalMechanism: "Divalent and trivalent cations (Al3+, Mg2+) bind fluoroquinolone 4-keto and 3-carboxyl groups, preventing gastrointestinal mucosal absorption.",
    clinicalRecommendation: "Instruct patient strictly to space administration: take Ciprofloxacin at least 2 hours before or 4 hours after oral antacid suspension.",
    patientId: "AM-91048",
    patientName: "Mohammad Farooq",
    patientAge: 62,
    patientGender: "Male",
    reviewStatus: "Pending Physician Review",
    isSeededDemonstration: true,
  },
  {
    id: "saf-104",
    medicationName: "Pantoprazole 40mg",
    interactingDrug: "Rabeprazole 20mg",
    category: "Duplicate active medications",
    severity: "Moderate",
    title: "Dual Proton-Pump Inhibitor (PPI) Therapeutic Duplication",
    description: "Two distinct proton-pump inhibitors prescribed concurrently without documented tapering or transitional regimen.",
    evidenceSource: "National Institute for Health and Care Excellence (NICE)",
    evidenceCitation: "NICE Clinical Guideline CG184: Dyspepsia and Gastro-oesophageal Reflux Disease",
    clinicalMechanism: "Both molecules irreversibly inhibit the H+/K+ ATPase pump. Simultaneous dual PPI administration increases hypomagnesemia and interstitial nephritis risks without incremental acid suppression.",
    clinicalRecommendation: "Consolidate to a single PPI agent (Pantoprazole 40mg OD 30 mins before breakfast). Discontinue Rabeprazole.",
    patientId: "AM-94021",
    patientName: "Rajesh Kumar",
    patientAge: 54,
    patientGender: "Male",
    reviewStatus: "Pending Physician Review",
    isSeededDemonstration: true,
  },
  {
    id: "saf-105",
    medicationName: "Diclofenac Sodium 50mg",
    category: "Supported contraindications",
    severity: "High",
    title: "Systemic NSAID in Peptic Ulcer & Bronchial Asthma",
    description: "Non-steroidal anti-inflammatory ordered for a patient with acute epigastric dyspepsia and active bronchial asthma.",
    evidenceSource: "Central Drugs Standard Control Organisation (CDSCO)",
    evidenceCitation: "CDSCO Safety Alert on Non-Steroidal Anti-Inflammatory Drugs in Gastric Ulceration",
    clinicalMechanism: "Suppression of protective gastric mucosal prostaglandin synthesis via COX-1 inhibition accelerates ulceration, erosive gastritis, and potential upper GI bleeding.",
    clinicalRecommendation: "Avoid systemic NSAID. Consider paracetamol for mild analgesia or topical gel if musculoskeletal.",
    patientId: "AM-85119",
    patientName: "Sunita Patil",
    patientAge: 41,
    patientGender: "Female",
    reviewStatus: "Pending Physician Review",
    isSeededDemonstration: true,
  },
  {
    id: "saf-106",
    medicationName: "Atorvastatin 40mg",
    category: "Missing medication information",
    severity: "Informational",
    title: "Prescription Duration & Refill Interval Unrecorded",
    description: "Outpatient handwritten prescription card omits intended duration and refill limit for high-intensity statin.",
    evidenceSource: "Standard Treatment Guidelines (STG) India",
    evidenceCitation: "Apollo Hospital Outpatient Pharmacy Dispensing Standards (SOP-PH-04)",
    clinicalMechanism: "Incomplete temporal instruction requires pharmacist clarification before dispensing long-term HMG-CoA reductase inhibitor.",
    clinicalRecommendation: "Physician should confirm whether intended supply is 30 days or ongoing 90 days with periodic liver enzyme audit.",
    patientId: "AM-91048",
    patientName: "Mohammad Farooq",
    patientAge: 62,
    patientGender: "Male",
    reviewStatus: "Pending Physician Review",
    isSeededDemonstration: true,
  },
  {
    id: "saf-107",
    medicationName: "Metformin 500mg",
    interactingDrug: "Pantoprazole 40mg",
    category: "Drug-drug interactions",
    severity: "Informational",
    title: "Long-term Metformin & Acid Suppression B12 Advisory",
    description: "Prolonged co-administration (> 12 months) of Biguanides and PPIs may marginally accelerate subclinical Vitamin B12 malabsorption.",
    evidenceSource: "American Diabetes Association (ADA)",
    evidenceCitation: "ADA Standards of Medical Care in Diabetes 2024, Section 9 (Pharmacologic Approaches)",
    clinicalMechanism: "Reduced gastric acidity diminishes cleavage of protein-bound cobalamin, compounded by Metformin's calcium-dependent ileal uptake alteration.",
    clinicalRecommendation: "Prescription is safe to proceed. Periodic annual Serum Vitamin B12 monitoring advised if combined therapy exceeds one year.",
    patientId: "AM-94021",
    patientName: "Rajesh Kumar",
    patientAge: 54,
    patientGender: "Male",
    reviewStatus: "Reviewed & Acknowledged",
    reviewedBy: "Dr. Anika Rao",
    reviewedAt: "10-Nov-2026",
    doctorReviewNote: "Noted. Annual CBC and peripheral smear scheduled for patient.",
    isSeededDemonstration: true,
  },
];

let safetyAlertStore: SafetyAlert[] = [...initialSafetyAlerts];

export function getSafetyAlerts(): SafetyAlert[] {
  return [...safetyAlertStore];
}

export function getSafetyAlertById(id: string): SafetyAlert | undefined {
  return safetyAlertStore.find((a) => a.id === id);
}

export function updateAlertStatus(
  id: string,
  updates: {
    reviewStatus: SafetyAlert["reviewStatus"];
    doctorReviewNote?: string;
    reviewedBy: string;
  },
): SafetyAlert | undefined {
  const alertIndex = safetyAlertStore.findIndex((a) => a.id === id);
  if (alertIndex === -1) return undefined;

  safetyAlertStore[alertIndex] = {
    ...safetyAlertStore[alertIndex],
    reviewStatus: updates.reviewStatus,
    doctorReviewNote: updates.doctorReviewNote || safetyAlertStore[alertIndex].doctorReviewNote,
    reviewedBy: updates.reviewedBy,
    reviewedAt: "Just now",
  };

  return safetyAlertStore[alertIndex];
}

export function getSafetyMetrics(): SafetyMetrics {
  const active = safetyAlertStore.filter((a) => a.reviewStatus === "Pending Physician Review");
  const allergy = safetyAlertStore.filter((a) => a.category === "Documented allergy conflicts");
  const duplicates = safetyAlertStore.filter((a) => a.category === "Duplicate active medications");
  const interactions = safetyAlertStore.filter((a) => a.category === "Drug-drug interactions");

  return {
    totalChecksPerformed: 14280,
    activeAlertsCount: active.length,
    allergyConflictsCount: allergy.length,
    duplicateMedicationsCount: duplicates.length,
    interactionsRequiringReview: interactions.length,
  };
}
