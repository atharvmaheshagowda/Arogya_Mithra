/**
 * AAROGYA MITHRA — Mock Clinical Dashboard Service Layer
 *
 * Provides synthetic outpatient department (OPD) demonstration data.
 * Adheres to realistic high-volume Indian hospital patterns.
 */

export interface MetricItem {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: "up" | "down" | "neutral";
  detail: string;
}

export interface HourlyActivity {
  hour: string;
  count: number;
  peak?: boolean;
}

export interface DayActivity {
  day: string;
  count: number;
  isToday?: boolean;
}

export interface PendingApproval {
  id: string;
  patientName: string;
  mrn: string;
  time: string;
  type: string;
  language: string;
  urgency: "high" | "medium" | "low";
  summary: string;
}

export interface DashboardSafetyAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  patientName: string;
  mrn: string;
  time: string;
  evidenceSource: string;
  description: string;
}

export interface RecentActivityItem {
  id: string;
  patientName: string;
  avatar?: string;
  mrn: string;
  initials: string;
  dateTime: string;
  language: string;
  diagnosis: string;
  status: "Pending Doctor Sign-off" | "Lab Review Needed" | "Approved & Signed" | "Safety Checked";
  statusVariant: "warning" | "teal" | "success" | "navy";
}

export interface RecentPatientProfile {
  id: string;
  name: string;
  avatar?: string;
  mrn: string;
  age: number;
  gender: "Male" | "Female";
  initials: string;
  primaryCondition: string;
  lastVisit: string;
  vitalsSummary: string;
  allergyFlag: boolean;
  allergyName?: string;
}

export interface DashboardData {
  stats: {
    totalPatients: MetricItem;
    todayConsultations: MetricItem;
    pendingNotes: MetricItem;
    reportsProcessed: MetricItem;
    safetyAlerts: MetricItem;
  };
  hourlyConsultations: HourlyActivity[];
  weeklyStatistics: DayActivity[];
  languageDistribution: { label: string; percentage: number; color: string }[];
  pendingApprovals: PendingApproval[];
  safetyAlertsSummary: DashboardSafetyAlert[];
  recentActivity: RecentActivityItem[];
  recentPatients: RecentPatientProfile[];
}

export const mockDashboardData: DashboardData = {
  stats: {
    totalPatients: {
      id: "stat-total-patients",
      label: "Total Registered Patients",
      value: "1,284",
      change: "+14 this week",
      trend: "up",
      detail: "OPD active registry",
    },
    todayConsultations: {
      id: "stat-today-consults",
      label: "Today's Consultations",
      value: "28",
      change: "18 completed, 10 in queue",
      trend: "up",
      detail: "Room 04 (General OPD)",
    },
    pendingNotes: {
      id: "stat-pending-notes",
      label: "Pending Clinical Notes",
      value: "3",
      change: "Require doctor signature",
      trend: "down",
      detail: "Draft advisory ready",
    },
    reportsProcessed: {
      id: "stat-reports-processed",
      label: "Reports Processed Today",
      value: "14",
      change: "98.6% OCR accuracy",
      trend: "up",
      detail: "Thyrocare, Lal PathLabs",
    },
    safetyAlerts: {
      id: "stat-safety-alerts",
      label: "Medication Safety Alerts",
      value: "2",
      change: "1 Hard-stop intercepted",
      trend: "down",
      detail: "Zero unreviewed alerts",
    },
  },

  hourlyConsultations: [
    { hour: "08:00 AM", count: 4 },
    { hour: "09:00 AM", count: 7 },
    { hour: "10:00 AM", count: 9, peak: true },
    { hour: "11:00 AM", count: 6 },
    { hour: "12:00 PM", count: 2 },
  ],

  weeklyStatistics: [
    { day: "Mon", count: 34 },
    { day: "Tue", count: 38 },
    { day: "Wed", count: 29 },
    { day: "Thu", count: 42 },
    { day: "Fri", count: 28, isToday: true },
    { day: "Sat", count: 22 },
    { day: "Sun", count: 6 },
  ],

  languageDistribution: [
    { label: "Kannada (ಕನ್ನಡ)", percentage: 48, color: "bg-teal-500" },
    { label: "Hindi (हिंदी)", percentage: 34, color: "bg-[#102A43] dark:bg-teal-300" },
    { label: "Indian English", percentage: 18, color: "bg-muted-foreground/40" },
  ],

  pendingApprovals: [
    {
      id: "appr-1",
      patientName: "Rajesh Kumar",
      mrn: "AM-94021",
      time: "10 mins ago",
      type: "SOAP Note Review",
      language: "Kannada -> English",
      urgency: "high",
      summary: "Severe Epigastric Pain x 3 days. Prescribed Pantoprazole 40mg OD. Allergy screen verified.",
    },
    {
      id: "appr-2",
      patientName: "Lakshmi Gowda",
      mrn: "AM-93112",
      time: "25 mins ago",
      type: "Thyroid Lab Review",
      language: "Kannada",
      urgency: "medium",
      summary: "TSH 4.8 mIU/L. Recommend continuing Thyronorm 50 mcg with 6-week repeat.",
    },
    {
      id: "appr-3",
      patientName: "Mohammad Farooq",
      mrn: "AM-91048",
      time: "40 mins ago",
      type: "Renal Function Alert",
      language: "Hindi / Urdu",
      urgency: "high",
      summary: "Creatinine 1.42 mg/dL, eGFR 54 mL/min. Discontinue NSAID; review Telmisartan.",
    },
  ],

  safetyAlertsSummary: [
    {
      id: "alert-1",
      severity: "critical",
      title: "Allergy Conflict Intercepted",
      patientName: "Rajesh Kumar",
      mrn: "AM-94021",
      time: "12 mins ago",
      evidenceSource: "CDSCO Drug Safety Alert #4412",
      description: "Amoxicillin-Clavulanate was blocked due to documented Penicillin anaphylactoid allergy. Replaced with Azithromycin.",
    },
    {
      id: "alert-2",
      severity: "warning",
      title: "Chelation Interaction Advisory",
      patientName: "Mohammad Farooq",
      mrn: "AM-91048",
      time: "45 mins ago",
      evidenceSource: "British National Formulary (BNF 86)",
      description: "Ciprofloxacin co-prescribed with oral antacid. Advised minimum 2-hour spacing to prevent fluoroquinolone absorption loss.",
    },
  ],

  recentActivity: [
    {
      id: "act-1",
      patientName: "Rajesh Kumar",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-94021",
      initials: "RK",
      dateTime: "Today, 11:15 AM",
      language: "Kannada / English",
      diagnosis: "Acute Dyspepsia, Type 2 Diabetes",
      status: "Pending Doctor Sign-off",
      statusVariant: "warning",
    },
    {
      id: "act-2",
      patientName: "Lakshmi Gowda",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-93112",
      initials: "LG",
      dateTime: "Today, 10:45 AM",
      language: "Kannada",
      diagnosis: "Hypothyroidism, Dyslipidemia",
      status: "Lab Review Needed",
      statusVariant: "teal",
    },
    {
      id: "act-3",
      patientName: "Mohammad Farooq",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-91048",
      initials: "MF",
      dateTime: "Today, 10:10 AM",
      language: "Hindi / Urdu",
      diagnosis: "Stage 2 CKD, Coronary Disease",
      status: "Safety Checked",
      statusVariant: "navy",
    },
    {
      id: "act-4",
      patientName: "Ananya Sharma",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-89412",
      initials: "AS",
      dateTime: "Today, 09:30 AM",
      language: "Hindi / English",
      diagnosis: "Migraine with Aura, Allergic Rhinitis",
      status: "Approved & Signed",
      statusVariant: "success",
    },
    {
      id: "act-5",
      patientName: "Venkat Rao",
      avatar: "https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-87220",
      initials: "VR",
      dateTime: "Today, 09:00 AM",
      language: "Kannada",
      diagnosis: "Essential Hypertension, Routine OPD",
      status: "Approved & Signed",
      statusVariant: "success",
    },
    {
      id: "act-6",
      patientName: "Sunita Patil",
      avatar: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-85119",
      initials: "SP",
      dateTime: "Today, 08:35 AM",
      language: "Hindi",
      diagnosis: "Seasonal Viral URI, Bronchitis",
      status: "Approved & Signed",
      statusVariant: "success",
    },
  ],

  recentPatients: [
    {
      id: "pat-1",
      name: "Rajesh Kumar",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-94021",
      age: 54,
      gender: "Male",
      initials: "RK",
      primaryCondition: "Type 2 Diabetes, HTN",
      lastVisit: "Today (Room 04)",
      vitalsSummary: "BP: 138/88 • Glucose: 178",
      allergyFlag: true,
      allergyName: "Penicillin",
    },
    {
      id: "pat-2",
      name: "Lakshmi Gowda",
      avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-93112",
      age: 48,
      gender: "Female",
      initials: "LG",
      primaryCondition: "Hypothyroidism",
      lastVisit: "10-Nov-2026",
      vitalsSummary: "BP: 122/80 • TSH: 4.8",
      allergyFlag: false,
    },
    {
      id: "pat-3",
      name: "Mohammad Farooq",
      avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-91048",
      age: 62,
      gender: "Male",
      initials: "MF",
      primaryCondition: "CAD, Stage 2 CKD",
      lastVisit: "02-Nov-2026",
      vitalsSummary: "BP: 144/92 • Cr: 1.4",
      allergyFlag: true,
      allergyName: "Aspirin",
    },
    {
      id: "pat-4",
      name: "Ananya Sharma",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
      mrn: "AM-89412",
      age: 29,
      gender: "Female",
      initials: "AS",
      primaryCondition: "Migraine with Aura",
      lastVisit: "28-Oct-2026",
      vitalsSummary: "BP: 116/74 • SpO2: 99%",
      allergyFlag: false,
    },
  ],
};

/**
 * Service function returning synthetic dashboard clinical telemetry.
 */
export async function getDashboardData(): Promise<DashboardData> {
  // Simulating sub-second local retrieval
  return Promise.resolve(mockDashboardData);
}

