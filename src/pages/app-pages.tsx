import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  Check,
  CheckCircle2,
  CheckCheck,
  Clock,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  Languages,
  Mic,
  Pill,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Upload,
  User,
  Users,
  Volume2,
  Workflow,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  MetricCard,
  ClinicalCalloutCard,
} from "@/components/ui/card";
import { Input, SearchInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/navigation";
import { InteractiveWorkflowSection } from "@/components/landing/interactive-workflow-section";
import { useAuth } from "@/lib/auth";
import {
  mockDashboardData,
  type DashboardData,
  type PendingApproval,
  type DashboardSafetyAlert,
  type RecentActivityItem,
  type RecentPatientProfile,
} from "@/lib/dashboard-service";
import { cn } from "@/lib/utils";

/* ==========================================================================
   1. DASHBOARD PAGE
   ========================================================================== */

export function DashboardPage() {
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const { toast } = useToast();

  // State management for interactive actions
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>(
    mockDashboardData.pendingApprovals,
  );
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>(
    mockDashboardData.recentActivity,
  );
  const [recentPatients, setRecentPatients] = useState<RecentPatientProfile[]>(
    mockDashboardData.recentPatients,
  );
  const [activitySearch, setActivitySearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<"all" | "pending" | "signed">("all");

  // Modal states
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [isReviewNoteOpen, setIsReviewNoteOpen] = useState(false);
  const [activeReviewNote, setActiveReviewNote] = useState<PendingApproval | null>(null);

  // New Patient Form State
  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    age: "",
    gender: "Male" as "Male" | "Female",
    phone: "",
    language: "Kannada",
    chiefComplaint: "",
  });

  // Handle Signing a Pending Clinical Note
  const handleSignNote = (approvalId: string, patientName: string) => {
    setPendingApprovals((prev) => prev.filter((item) => item.id !== approvalId));

    // Update corresponding activity status if exists
    setRecentActivity((prev) =>
      prev.map((item) =>
        item.patientName === patientName
          ? {
            ...item,
            status: "Approved & Signed" as const,
            statusVariant: "success" as const,
          }
          : item,
      ),
    );

    if (activeReviewNote?.id === approvalId) {
      setIsReviewNoteOpen(false);
      setActiveReviewNote(null);
    }

    toast.success("Clinical Note Signed", {
      description: `Draft approved for ${patientName}. Verified by ${doctor?.name || "Doctor"} and committed to hospital EHR.`,
    });
  };

  // Open Review Note Modal
  const handleOpenReview = (approval: PendingApproval) => {
    setActiveReviewNote(approval);
    setIsReviewNoteOpen(true);
  };

  // Handle Add Patient Submission
  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.name.trim() || !newPatientForm.age.trim()) {
      toast.error("Missing Details", {
        description: "Please provide patient name and age.",
      });
      return;
    }

    const mrnNum = Math.floor(10000 + Math.random() * 90000);
    const newMrn = `AM-${mrnNum}`;
    const initials = newPatientForm.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newProfile: RecentPatientProfile = {
      id: `pat-${Date.now()}`,
      name: newPatientForm.name,
      mrn: newMrn,
      age: parseInt(newPatientForm.age, 10) || 30,
      gender: newPatientForm.gender,
      initials: initials || "PT",
      primaryCondition: newPatientForm.chiefComplaint || "Routine OPD Checkup",
      lastVisit: "Today (Room 04)",
      vitalsSummary: "BP: 120/80 • SpO2: 98%",
      allergyFlag: false,
    };

    const newActivity: RecentActivityItem = {
      id: `act-${Date.now()}`,
      patientName: newPatientForm.name,
      mrn: newMrn,
      initials: initials || "PT",
      dateTime: "Just now",
      language: newPatientForm.language,
      diagnosis: newPatientForm.chiefComplaint || "General OPD Triage",
      status: "Pending Doctor Sign-off",
      statusVariant: "warning",
    };

    setRecentPatients((prev) => [newProfile, ...prev.slice(0, 3)]);
    setRecentActivity((prev) => [newActivity, ...prev]);

    setIsAddPatientOpen(false);
    setNewPatientForm({
      name: "",
      age: "",
      gender: "Male",
      phone: "",
      language: "Kannada",
      chiefComplaint: "",
    });

    toast.success("Patient Enrolled", {
      description: `${newProfile.name} (${newProfile.mrn}) added to Room 04 consultation queue.`,
    });
  };

  // Filtered Activity List
  const filteredActivity = useMemo(() => {
    return recentActivity.filter((item) => {
      const matchesSearch =
        item.patientName.toLowerCase().includes(activitySearch.toLowerCase()) ||
        item.mrn.toLowerCase().includes(activitySearch.toLowerCase()) ||
        item.diagnosis.toLowerCase().includes(activitySearch.toLowerCase()) ||
        item.language.toLowerCase().includes(activitySearch.toLowerCase());

      if (!matchesSearch) return false;

      if (activityFilter === "pending") {
        return (
          item.status === "Pending Doctor Sign-off" ||
          item.status === "Lab Review Needed"
        );
      }
      if (activityFilter === "signed") {
        return item.status === "Approved & Signed" || item.status === "Safety Checked";
      }
      return true;
    });
  }, [recentActivity, activitySearch, activityFilter]);

  // Max count for hourly chart scaling
  const maxHourlyCount = Math.max(
    ...mockDashboardData.hourlyConsultations.map((h) => h.count),
    10,
  );

  return (
    <div className="space-y-6">
      {/* ====================================================================
          1. TOP SECTION — GREETING & START CONSULTATION
          ==================================================================== */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow">Clinical Copilot Active</span>
            <Badge variant="teal" size="sm" dot pulse>
              Live OPD Session • Room 04
            </Badge>
            <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
            <span className="text-xs text-muted-foreground">
              {doctor?.clinic || "Apollo Hospitals, Bengaluru"} • General Medicine
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Good morning, Doctor.
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Here is your clinical activity overview. 28 consultations scheduled across Kannada, Hindi, and English.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="md"
            onClick={() => setIsAddPatientOpen(true)}
            leftIcon={<Plus className="size-4" />}
          >
            Add Patient
          </Button>
          <Button
            variant="teal"
            size="md"
            onClick={() => navigate("/app/consultations")}
            leftIcon={<Mic className="size-4" />}
            rightIcon={<ArrowRight className="size-4" />}
            className="shadow-sm font-semibold"
          >
            Start Consultation
          </Button>
        </div>
      </div>

      {/* ====================================================================
          2. QUICK ACTIONS BAR
          ==================================================================== */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <button
          type="button"
          onClick={() => setIsAddPatientOpen(true)}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xs"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:bg-teal-500 group-hover:text-white transition-colors">
            <Plus className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
              Add Patient
            </div>
            <div className="text-[11px] text-muted-foreground">Enroll to OPD queue</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/app/consultations")}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xs"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
            <Mic className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
              Start Consultation
            </div>
            <div className="text-[11px] text-muted-foreground">LISTEN ambient scribe</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/app/reports")}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xs"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Upload className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
              Upload Medical Report
            </div>
            <div className="text-[11px] text-muted-foreground">READ diagnostic OCR</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/app/safety")}
          className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-all duration-150 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-xs"
        >
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <ShieldAlert className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-foreground group-hover:text-accent transition-colors">
              View Safety Alerts
            </div>
            <div className="text-[11px] text-muted-foreground">SAFEGUARD drug rules</div>
          </div>
        </button>
      </div>

      {/* ====================================================================
          3. STATISTICS (5 CARDS)
          ==================================================================== */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {/* 1. Total Patients */}
        <MetricCard
          label={mockDashboardData.stats.totalPatients.label}
          value={mockDashboardData.stats.totalPatients.value}
          subtitle={mockDashboardData.stats.totalPatients.change}
          icon={Users}
          trend={{ value: "+14 this wk", isPositive: true }}
        />

        {/* 2. Today's Consultations */}
        <MetricCard
          label={mockDashboardData.stats.todayConsultations.label}
          value={mockDashboardData.stats.todayConsultations.value}
          subtitle={mockDashboardData.stats.todayConsultations.change}
          icon={HeartPulse}
          badge={<Badge variant="teal" size="sm" dot>Live OPD</Badge>}
        />

        {/* 3. Pending Clinical Notes */}
        <MetricCard
          label={mockDashboardData.stats.pendingNotes.label}
          value={pendingApprovals.length.toString()}
          subtitle="Require doctor signature"
          icon={FileText}
          badge={
            <Badge
              variant={pendingApprovals.length > 0 ? "warning" : "success"}
              size="sm"
            >
              {pendingApprovals.length > 0 ? `${pendingApprovals.length} Pending` : "All Signed"}
            </Badge>
          }
        />

        {/* 4. Reports Processed */}
        <MetricCard
          label={mockDashboardData.stats.reportsProcessed.label}
          value={mockDashboardData.stats.reportsProcessed.value}
          subtitle={mockDashboardData.stats.reportsProcessed.change}
          icon={FileCheck2}
          trend={{ value: "98.6% OCR", isPositive: true }}
        />

        {/* 5. Medication Safety Alerts */}
        <MetricCard
          label={mockDashboardData.stats.safetyAlerts.label}
          value={mockDashboardData.stats.safetyAlerts.value}
          subtitle={mockDashboardData.stats.safetyAlerts.change}
          icon={ShieldAlert}
          badge={<Badge variant="danger" size="sm">SafeGuarded</Badge>}
        />
      </div>

      {/* ====================================================================
          4. MAIN DASHBOARD (2-COLUMN GRID)
             Left: Consultation Activity Chart + Weekly Patient Statistics
             Right: Pending Approvals + Safety Alert Summary
          ==================================================================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* LEFT COLUMN: CHARTS & ANALYTICS */}
        <div className="space-y-6 lg:col-span-7 xl:col-span-8">
          {/* Card A: Consultation Activity Chart (Hourly) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">Consultation Activity</CardTitle>
                    <Badge variant="teal" size="sm">Today's OPD</Badge>
                  </div>
                  <CardDescription className="mt-1">
                    Hourly patient consultations recorded in OPD Room 04.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 self-start rounded-lg border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-foreground">
                  <Clock className="size-3.5 text-accent" />
                  <span>Peak: 10:00 AM (9 consults)</span>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Hourly Activity Bar Chart */}
              <div className="pt-2">
                <div className="relative h-48 w-full">
                  {/* Horizontal Gridlines */}
                  <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                    {[10, 8, 6, 4, 2, 0].map((level) => (
                      <div
                        key={level}
                        className="flex items-center gap-2 border-b border-border/30 text-[10px] text-muted-foreground/60 w-full"
                      >
                        <span className="w-4 shrink-0 text-right">{level}</span>
                        <div className="flex-1 border-b border-border/20 border-dashed" />
                      </div>
                    ))}
                  </div>

                  {/* Bars Container */}
                  <div className="absolute inset-x-8 bottom-0 top-3 flex items-end justify-around gap-3 sm:gap-6">
                    {mockDashboardData.hourlyConsultations.map((item) => {
                      const heightPercent = (item.count / maxHourlyCount) * 100;
                      return (
                        <div
                          key={item.hour}
                          className="group relative flex h-full flex-1 flex-col items-center justify-end"
                        >
                          {/* Hover Tooltip */}
                          <div className="pointer-events-none absolute -top-8 z-10 hidden whitespace-nowrap rounded-md bg-popover px-2 py-1 text-[11px] font-semibold text-popover-foreground shadow-md ring-1 ring-border group-hover:block transition-all">
                            {item.count} consultations ({item.hour})
                          </div>

                          {/* Peak Badge */}
                          {item.peak && (
                            <span className="mb-1 rounded bg-teal-500/15 px-1.5 py-0.5 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                              Peak
                            </span>
                          )}

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={cn(
                              "w-full max-w-[48px] rounded-t-md transition-all duration-300 group-hover:brightness-110",
                              item.peak
                                ? "bg-accent shadow-sm ring-1 ring-accent/30"
                                : "bg-accent/40 group-hover:bg-accent/60",
                            )}
                          />

                          {/* Label */}
                          <span className="mt-2 text-[11px] font-medium text-muted-foreground">
                            {item.hour.replace(":00", "")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom Metric Strip */}
                <div className="mt-6 grid grid-cols-3 divide-x divide-border rounded-lg border border-border bg-muted/20 p-3 text-center">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Completed Today</div>
                    <div className="mt-0.5 font-display text-lg font-semibold text-foreground">
                      28
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Avg Duration</div>
                    <div className="mt-0.5 font-display text-lg font-semibold text-foreground">
                      7.4 min
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-foreground">Doc Time Saved</div>
                    <div className="mt-0.5 font-display text-lg font-semibold text-accent">
                      ~42 min
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card B: Weekly Patient Statistics & Multilingual OPD Distribution */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Weekly Statistics & Language Mix</CardTitle>
                  <CardDescription className="mt-1">
                    Longitudinal throughput and real-time dialect distribution.
                  </CardDescription>
                </div>
                <Badge variant="navy" size="sm">Multilingual</Badge>
              </div>
            </CardHeader>

            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
                {/* Left (7 cols): Weekly Daily Volume */}
                <div className="space-y-3 md:col-span-7">
                  <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                    <span>Weekly Consultation Volume (199 Total)</span>
                    <span className="text-accent font-medium">Daily Avg: 28.4</span>
                  </div>

                  <div className="flex items-end justify-between gap-2 pt-4 h-36">
                    {mockDashboardData.weeklyStatistics.map((day) => {
                      const heightPercent = (day.count / 45) * 100;
                      return (
                        <div
                          key={day.day}
                          className="group relative flex h-full flex-1 flex-col items-center justify-end"
                        >
                          <div className="pointer-events-none absolute -top-7 hidden rounded bg-popover px-1.5 py-0.5 text-[10px] font-semibold text-popover-foreground shadow-xs group-hover:block">
                            {day.count}
                          </div>

                          <div
                            style={{ height: `${heightPercent}%` }}
                            className={cn(
                              "w-full rounded-t-sm transition-all duration-200",
                              day.isToday
                                ? "bg-accent shadow-xs ring-2 ring-accent/30"
                                : "bg-muted-foreground/25 group-hover:bg-muted-foreground/40",
                            )}
                          />
                          <span
                            className={cn(
                              "mt-1.5 text-[11px] font-medium",
                              day.isToday
                                ? "font-bold text-accent"
                                : "text-muted-foreground",
                            )}
                          >
                            {day.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Right (5 cols): Multilingual OPD Language Mix */}
                <div className="space-y-3 rounded-xl border border-border bg-muted/20 p-4 md:col-span-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Languages className="size-3.5 text-accent" />
                    <span>Language Distribution</span>
                  </div>

                  {/* Segmented Bar */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      style={{ width: "48%" }}
                      className="bg-teal-500 transition-all"
                      title="Kannada: 48%"
                    />
                    <div
                      style={{ width: "34%" }}
                      className="bg-primary dark:bg-teal-300 transition-all"
                      title="Hindi: 34%"
                    />
                    <div
                      style={{ width: "18%" }}
                      className="bg-muted-foreground/40 transition-all"
                      title="English: 18%"
                    />
                  </div>

                  {/* Legend */}
                  <div className="space-y-2 pt-1 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-teal-500" />
                        <span className="font-medium text-foreground">Kannada (ಕನ್ನಡ)</span>
                      </div>
                      <span className="font-mono text-muted-foreground">48% (14)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-primary dark:bg-teal-300" />
                        <span className="font-medium text-foreground">Hindi (हिंदी)</span>
                      </div>
                      <span className="font-mono text-muted-foreground">34% (10)</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-muted-foreground/40" />
                        <span className="font-medium text-foreground">Indian English</span>
                      </div>
                      <span className="font-mono text-muted-foreground">18% (4)</span>
                    </div>
                  </div>

                  <p className="pt-2 text-[11px] leading-relaxed text-muted-foreground border-t border-border/50">
                    Auto-detects code-mixing between regional vernacular and clinical English.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: PENDING APPROVALS & SAFETY ALERTS */}
        <div className="space-y-6 lg:col-span-5 xl:col-span-4">
          {/* Card C: Pending Approvals */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Pending Approvals</CardTitle>
                  <CardDescription className="mt-0.5">
                    Clinical notes requiring doctor signature.
                  </CardDescription>
                </div>
                <Badge
                  variant={pendingApprovals.length > 0 ? "warning" : "success"}
                  size="sm"
                >
                  {pendingApprovals.length} Awaiting
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {pendingApprovals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border py-8 text-center">
                  <CheckCircle2 className="mx-auto size-8 text-success" />
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    All Notes Approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    No pending draft notes requiring doctor verification.
                  </p>
                </div>
              ) : (
                pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="group rounded-xl border border-border bg-card p-3.5 transition-all duration-150 hover:border-accent/40 hover:shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-sm text-foreground">
                            {approval.patientName}
                          </h4>
                          <span className="font-mono text-xs text-muted-foreground">
                            {approval.mrn}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{approval.type}</span>
                          <span>•</span>
                          <span>{approval.time}</span>
                        </div>
                      </div>

                      <Badge
                        variant={approval.urgency === "high" ? "danger" : "warning"}
                        size="sm"
                      >
                        {approval.urgency.toUpperCase()}
                      </Badge>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/40 font-mono">
                      {approval.summary}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleOpenReview(approval)}
                        leftIcon={<Eye className="size-3" />}
                      >
                        Review Draft
                      </Button>
                      <Button
                        variant="teal"
                        size="xs"
                        onClick={() => handleSignNote(approval.id, approval.patientName)}
                        leftIcon={<Check className="size-3" />}
                      >
                        Sign Note
                      </Button>
                    </div>
                  </div>
                ))
              )}

              <p className="text-[11px] leading-relaxed text-muted-foreground text-center pt-1">
                AI outputs remain drafts until explicitly signed by the attending physician.
              </p>
            </CardContent>
          </Card>

          {/* Card D: Safety Alert Summary */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Safety Alert Summary</CardTitle>
                  <CardDescription className="mt-0.5">
                    SAFEGUARD deterministic rule interceptions.
                  </CardDescription>
                </div>
                <Badge variant="danger" size="sm">
                  {mockDashboardData.safetyAlertsSummary.length} Active
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {mockDashboardData.safetyAlertsSummary.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "rounded-xl border p-3.5 transition-all",
                    alert.severity === "critical"
                      ? "border-destructive/30 bg-destructive/5"
                      : "border-warning/30 bg-warning/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {alert.severity === "critical" ? (
                        <ShieldAlert className="size-4 shrink-0 text-destructive" />
                      ) : (
                        <AlertTriangle className="size-4 shrink-0 text-warning" />
                      )}
                      <h4 className="font-semibold text-xs text-foreground">
                        {alert.title}
                      </h4>
                    </div>
                    <Badge
                      variant={alert.severity === "critical" ? "danger" : "warning"}
                      size="sm"
                    >
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </div>

                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{alert.patientName}</span>
                    <span>({alert.mrn})</span>
                    <span>•</span>
                    <span>{alert.time}</span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-foreground/80">
                    {alert.description}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/30 pt-2">
                    <span className="font-medium text-accent">
                      Ref: {alert.evidenceSource}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/app/safety")}
                      className="font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      Audit Rule <ArrowUpRight className="size-3" />
                    </button>
                  </div>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => navigate("/app/safety")}
                rightIcon={<ArrowRight className="size-3.5" />}
              >
                Open SAFEGUARD Safety Engine
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ====================================================================
          5. RECENT ACTIVITY TABLE
          ==================================================================== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <CardTitle className="text-lg">Recent Clinical Activity</CardTitle>
              <CardDescription className="mt-0.5">
                Real-time consultation log and documentation state.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setActivityFilter("all")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    activityFilter === "all"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  All ({recentActivity.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter("pending")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    activityFilter === "pending"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Pending Review
                </button>
                <button
                  type="button"
                  onClick={() => setActivityFilter("signed")}
                  className={cn(
                    "rounded-md px-2.5 py-1 font-medium transition-colors",
                    activityFilter === "signed"
                      ? "bg-card text-foreground shadow-xs font-semibold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Signed & Done
                </button>
              </div>

              <div className="w-48 sm:w-60">
                <SearchInput
                  value={activitySearch}
                  onChange={(e) => setActivitySearch(e.target.value)}
                  placeholder="Filter patient, MRN..."
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-6 py-3">Patient</th>
                  <th className="px-4 py-3">Patient ID</th>
                  <th className="px-4 py-3">Consultation Date</th>
                  <th className="px-4 py-3">Language</th>
                  <th className="px-4 py-3">Diagnosis / Complaint</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredActivity.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                      No clinical consultations match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredActivity.map((item) => (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-muted/30"
                    >
                      {/* Patient */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                            {item.initials}
                          </div>
                          <div>
                            <span className="font-medium text-foreground block">
                              {item.patientName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* MRN */}
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-muted-foreground">
                          {item.mrn}
                        </span>
                      </td>

                      {/* Consultation Date */}
                      <td className="px-4 py-3.5 text-xs text-muted-foreground">
                        {item.dateTime}
                      </td>

                      {/* Language */}
                      <td className="px-4 py-3.5">
                        <Badge variant="outline" size="sm">
                          {item.language}
                        </Badge>
                      </td>

                      {/* Diagnosis */}
                      <td className="px-4 py-3.5 text-xs text-foreground max-w-xs truncate">
                        {item.diagnosis}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <Badge
                          variant={
                            item.statusVariant === "warning"
                              ? "warning"
                              : item.statusVariant === "teal"
                                ? "teal"
                                : item.statusVariant === "success"
                                  ? "success"
                                  : "navy"
                          }
                          size="sm"
                        >
                          {item.status}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-3.5 text-right">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => {
                            if (item.status === "Pending Doctor Sign-off") {
                              const matchingApproval = pendingApprovals.find(
                                (a) => a.patientName === item.patientName,
                              );
                              if (matchingApproval) {
                                handleOpenReview(matchingApproval);
                              } else {
                                navigate("/app/consultations");
                              }
                            } else if (item.status === "Lab Review Needed") {
                              navigate("/app/reports");
                            } else {
                              navigate(`/app/patients/${item.mrn}`);
                            }
                          }}
                          rightIcon={<ArrowRight className="size-3" />}
                        >
                          {item.status === "Pending Doctor Sign-off"
                            ? "Sign Note"
                            : item.status === "Lab Review Needed"
                              ? "Review Lab"
                              : "View Profile"}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ====================================================================
          6. RECENT PATIENTS (PROFILE CARDS)
          ==================================================================== */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl font-semibold tracking-tight text-foreground">
              Recent Patients
            </h3>
            <p className="text-xs text-muted-foreground">
              Recently accessed patient records and active clinical charts.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/app/patients")}
            rightIcon={<ArrowRight className="size-3.5" />}
          >
            All Patients (1,284)
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {recentPatients.map((pat) => (
            <div
              key={pat.id}
              className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="grid size-9 place-items-center rounded-full bg-accent/10 font-bold text-xs text-accent">
                      {pat.initials}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground group-hover:text-accent transition-colors">
                        {pat.name}
                      </h4>
                      <div className="text-xs text-muted-foreground">
                        {pat.age} yrs • {pat.gender} • <span className="font-mono">{pat.mrn}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="text-xs">
                    <span className="text-muted-foreground">Primary: </span>
                    <span className="font-medium text-foreground">{pat.primaryCondition}</span>
                  </div>
                  <div className="text-xs">
                    <span className="text-muted-foreground">Vitals: </span>
                    <span className="font-mono text-muted-foreground">{pat.vitalsSummary}</span>
                  </div>
                </div>

                {/* Allergy Pill */}
                <div>
                  {pat.allergyFlag ? (
                    <Badge variant="danger" size="sm">
                      Allergy: {pat.allergyName}
                    </Badge>
                  ) : (
                    <Badge variant="outline" size="sm">
                      NKDA (No Allergies)
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                <span className="text-[11px] text-muted-foreground">{pat.lastVisit}</span>
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => navigate(`/app/patients/${pat.mrn}`)}
                  rightIcon={<ArrowRight className="size-3" />}
                >
                  Open Chart
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ====================================================================
          MODAL 1: ADD PATIENT
          ==================================================================== */}
      <Modal
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        title="Add Patient to OPD Queue"
        description="Register a walk-in or appointment patient for Room 04 consultation."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddPatientOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={handleAddPatientSubmit}
              leftIcon={<Plus className="size-4" />}
            >
              Enroll & Queue
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddPatientSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Patient Full Name *
              </label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={newPatientForm.name}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, name: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Age *
              </label>
              <Input
                type="number"
                placeholder="e.g. 45"
                value={newPatientForm.age}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, age: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Gender
              </label>
              <select
                value={newPatientForm.gender}
                onChange={(e) =>
                  setNewPatientForm({
                    ...newPatientForm,
                    gender: e.target.value as "Male" | "Female",
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Preferred Consultation Language
              </label>
              <select
                value={newPatientForm.language}
                onChange={(e) =>
                  setNewPatientForm({
                    ...newPatientForm,
                    language: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="English">Indian English</option>
                <option value="Kannada / English">Kannada + English Mix</option>
                <option value="Hindi / English">Hindi + English Mix</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Contact Phone (Optional)
            </label>
            <Input
              placeholder="+91 98765 43210"
              value={newPatientForm.phone}
              onChange={(e) =>
                setNewPatientForm({ ...newPatientForm, phone: e.target.value })
              }
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Chief Complaint / Triage Reason
            </label>
            <Input
              placeholder="e.g. Fever x 3 days, cough, fatigue"
              value={newPatientForm.chiefComplaint}
              onChange={(e) =>
                setNewPatientForm({
                  ...newPatientForm,
                  chiefComplaint: e.target.value,
                })
              }
              className="mt-1"
            />
          </div>

          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-accent" />
            <span>
              AAROGYA MITHRA will pre-load patient context into Room 04 for ambient clinical capture.
            </span>
          </div>
        </form>
      </Modal>

      {/* ====================================================================
          MODAL 2: REVIEW CLINICAL DRAFT NOTE
          ==================================================================== */}
      {activeReviewNote && (
        <Modal
          open={isReviewNoteOpen}
          onOpenChange={setIsReviewNoteOpen}
          title={`Doctor Sign-Off: ${activeReviewNote.patientName} (${activeReviewNote.mrn})`}
          description="Review AAROGYA MITHRA draft note before committing to hospital EHR."
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <span className="text-xs text-muted-foreground">
                Evidence: Multilingual Scribe (LISTEN) • Confidence 98.4%
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsReviewNoteOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() =>
                    handleSignNote(activeReviewNote.id, activeReviewNote.patientName)
                  }
                  leftIcon={<Check className="size-4" />}
                >
                  Sign & Commit Note
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3 font-mono text-xs">
              <div>
                <span className="font-bold text-accent">[SUBJECTIVE]</span>
                <p className="mt-1 text-foreground leading-relaxed">
                  Patient presents with chief complaint of epigastric burning pain and dyspepsia for 3 days, exacerbated after spicy meals. No hematemesis or melena. History of Type 2 Diabetes on Metformin.
                </p>
              </div>

              <div>
                <span className="font-bold text-accent">[OBJECTIVE]</span>
                <p className="mt-1 text-foreground leading-relaxed">
                  BP: 138/88 mmHg, HR: 76 bpm, Afebrile. Abdomen soft, mild epigastric tenderness on deep palpation. Bowel sounds normal.
                </p>
              </div>

              <div>
                <span className="font-bold text-accent">[ASSESSMENT]</span>
                <p className="mt-1 text-foreground leading-relaxed">
                  1. Acute Dyspepsia / Peptic Ulcer Disease (probable).
                  2. Type 2 Diabetes Mellitus (Fair glycemic control).
                </p>
              </div>

              <div>
                <span className="font-bold text-accent">[PLAN & PRESCRIPTION]</span>
                <p className="mt-1 text-foreground leading-relaxed">
                  • Tab Pantoprazole 40mg PO OD (30 mins before breakfast) x 14 days.
                  • Continue Tab Metformin 500mg BD after food.
                  • Dietary modification: Avoid fried foods, caffeine, late-night dinners.
                  • Review in OPD after 2 weeks or SOS if pain worsens.
                </p>
              </div>
            </div>

            <div className="rounded-lg bg-success/10 border border-success/30 p-3 text-xs text-success flex items-center gap-2">
              <CheckCircle2 className="size-4 shrink-0" />
              <span>
                SAFEGUARD validation: Zero allergy conflicts detected. Dosage verified against CDSCO guidelines.
              </span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ==========================================================================
   2. PATIENTS PAGE (CONNECT Module) — Re-exported from dedicated patient-pages
   ========================================================================== */

export { PatientsPage, PatientProfilePage } from "./patient-pages";

/* ==========================================================================
   3. CONSULTATIONS PAGE (LISTEN Module) — Re-exported from dedicated consultation-workspace
   ========================================================================== */

export { ConsultationWorkspacePage, ConsultationsPage } from "./consultation-workspace";

/* ==========================================================================
   4. REPORTS PAGE (READ Module) — Re-exported from dedicated report-intelligence-page
   ========================================================================== */

export { ReportsPage } from "./report-intelligence-page";

/* ==========================================================================
   5. MEDICATION SAFETY PAGE (SAFEGUARD Module)
   ========================================================================== */

export { MedicationSafetyPage } from "./medication-safety-page";

/* ==========================================================================
   6. WORKFLOW PAGE (Interactive Visualizer & Blueprint)
   ========================================================================== */

export { WorkflowVisualizerPage as WorkflowPage } from "./workflow-visualizer-page";

/* ==========================================================================
   7. SETTINGS PAGE
   ========================================================================== */

export { SettingsPage } from "./settings-page";
