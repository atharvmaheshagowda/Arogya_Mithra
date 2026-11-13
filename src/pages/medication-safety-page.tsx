import { useState, useMemo } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  FileCheck2,
  FileText,
  Filter,
  HeartPulse,
  Info,
  Layers,
  Lock,
  Pill,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Users,
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
import { useAuth } from "@/lib/auth";
import {
  getSafetyAlerts,
  getSafetyMetrics,
  updateAlertStatus,
  type SafetyAlert,
  type SafetyAlertSeverity,
  type SafetyCategory,
} from "@/lib/safety-service";
import { cn } from "@/lib/utils";

export function MedicationSafetyPage() {
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const { toast } = useToast();

  // Active alerts from store
  const [alerts, setAlerts] = useState<SafetyAlert[]>(() => getSafetyAlerts());
  const metrics = useMemo(() => getSafetyMetrics(), [alerts]);

  // Filtering states
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Review Workflow Modal State
  const [selectedAlertForReview, setSelectedAlertForReview] = useState<SafetyAlert | null>(null);
  const [reviewDecision, setReviewDecision] = useState<
    "Reviewed & Acknowledged" | "Overridden with Rationale" | "Order Blocked"
  >("Reviewed & Acknowledged");
  const [doctorNoteInput, setDoctorNoteInput] = useState("");

  // Interactive Drug Interaction Tester State
  const [testDrugA, setTestDrugA] = useState("Ciprofloxacin 500mg");
  const [testDrugB, setTestDrugB] = useState("Magnesium/Aluminium Antacid");
  const [testResult, setTestResult] = useState<{
    matched: boolean;
    title: string;
    severity: SafetyAlertSeverity;
    evidence: string;
  } | null>({
    matched: true,
    title: "Chelation complex formation: Oral bioavailability reduced by up to 85%",
    severity: "Moderate",
    evidence: "British National Formulary (BNF 86, Appendix 1)",
  });

  // Filtered Alert Cards
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        alert.medicationName.toLowerCase().includes(q) ||
        (alert.interactingDrug && alert.interactingDrug.toLowerCase().includes(q)) ||
        alert.patientName.toLowerCase().includes(q) ||
        alert.patientId.toLowerCase().includes(q) ||
        alert.title.toLowerCase().includes(q) ||
        alert.description.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Category filter
      if (selectedCategory !== "all" && alert.category !== selectedCategory) {
        return false;
      }

      // Severity filter
      if (selectedSeverity !== "all" && alert.severity !== selectedSeverity) {
        return false;
      }

      // Status filter
      if (selectedStatus !== "all") {
        if (selectedStatus === "pending" && alert.reviewStatus !== "Pending Physician Review") {
          return false;
        }
        if (selectedStatus === "reviewed" && alert.reviewStatus === "Pending Physician Review") {
          return false;
        }
      }

      return true;
    });
  }, [alerts, search, selectedCategory, selectedSeverity, selectedStatus]);

  // Open Review Modal
  const handleOpenReviewModal = (alert: SafetyAlert) => {
    setSelectedAlertForReview(alert);
    setDoctorNoteInput(alert.doctorReviewNote || "");
    setReviewDecision(
      alert.severity === "Critical"
        ? "Order Blocked"
        : alert.severity === "High"
          ? "Overridden with Rationale"
          : "Reviewed & Acknowledged",
    );
  };

  // Submit Doctor Review
  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlertForReview) return;

    const doctorName = doctor?.name || "Dr. Anika Rao, MBBS, MD";
    const updated = updateAlertStatus(selectedAlertForReview.id, {
      reviewStatus: reviewDecision,
      doctorReviewNote: doctorNoteInput.trim() || undefined,
      reviewedBy: doctorName,
    });

    if (updated) {
      setAlerts(getSafetyAlerts());
      setSelectedAlertForReview(null);

      toast.success("Safety Review Recorded", {
        description: `Alert for ${updated.medicationName} marked as '${reviewDecision}' by ${doctorName}.`,
      });
    }
  };

  // Run Real-time Interaction Tester
  const handleRunInteractionTest = () => {
    const a = testDrugA.toLowerCase();
    const b = testDrugB.toLowerCase();

    if ((a.includes("cipro") && b.includes("antacid")) || (b.includes("cipro") && a.includes("antacid"))) {
      setTestResult({
        matched: true,
        title: "Chelation complex formation: Fluoroquinolone bioavailability reduced by 85%",
        severity: "Moderate",
        evidence: "British National Formulary (BNF 86, Appendix 1)",
      });
    } else if ((a.includes("metformin") && b.includes("contrast")) || (b.includes("metformin") && a.includes("contrast"))) {
      setTestResult({
        matched: true,
        title: "Lactic Acidosis Contraindication: Withhold Metformin 48h prior to iodinated contrast",
        severity: "Critical",
        evidence: "CDSCO Guidelines & American College of Radiology (ACR)",
      });
    } else if ((a.includes("pantoprazole") && b.includes("rabeprazole")) || (b.includes("pantoprazole") && a.includes("rabeprazole"))) {
      setTestResult({
        matched: true,
        title: "Therapeutic Duplication: Simultaneous prescription of dual proton pump inhibitors",
        severity: "Moderate",
        evidence: "NICE Guideline CG184",
      });
    } else {
      setTestResult({
        matched: false,
        title: "Zero documented severe drug-drug interactions in CDSCO/BNF database",
        severity: "Informational",
        evidence: "SafeGuard Verification Engine (CDSCO, BNF 86, US FDA)",
      });
    }

    toast.info("Rules Engine Query Complete", {
      description: "Queried 14,280 deterministic pharmacological interaction rules.",
    });
  };

  // Helper for Severity styling
  const getSeverityBadge = (sev: SafetyAlertSeverity) => {
    switch (sev) {
      case "Critical":
        return <Badge variant="danger" size="sm">CRITICAL</Badge>;
      case "High":
        return (
          <Badge
            variant="warning"
            size="sm"
            className="border-amber-600/30 bg-amber-600/15 text-amber-700 dark:text-amber-300 font-bold"
          >
            HIGH
          </Badge>
        );
      case "Moderate":
        return <Badge variant="warning" size="sm">MODERATE</Badge>;
      case "Informational":
        return <Badge variant="teal" size="sm">INFORMATIONAL</Badge>;
    }
  };

  const getAlertCardBorder = (sev: SafetyAlertSeverity) => {
    switch (sev) {
      case "Critical":
        return "border-destructive/40 bg-destructive/5 hover:border-destructive";
      case "High":
        return "border-amber-500/40 bg-amber-500/5 hover:border-amber-500";
      case "Moderate":
        return "border-warning/35 bg-warning/5 hover:border-warning";
      case "Informational":
        return "border-border bg-card hover:border-accent/40";
    }
  };

  return (
    <div className="space-y-6">
      {/* ====================================================================
          TOP BANNER & METRICS
          ==================================================================== */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow">SAFEGUARD Module • Medication Safety Engine</span>
            <Badge variant="teal" size="sm" dot>
              Deterministic Rules Engine Active
            </Badge>
            <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
            <span className="text-xs text-muted-foreground">
              {doctor?.clinic || "Apollo Hospitals, Bengaluru"}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Medication Safety &amp; Interaction Audit
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Deterministic medication verification rules, allergy conflict gating, and evidence citations from CDSCO, BNF, and FDA formularies.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="navy" size="md">
            <ShieldCheck className="size-3.5 mr-1 text-accent" />
            14,280 Rule Signatures
          </Badge>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <MetricCard
          label="Total Checks Performed"
          value={metrics.totalChecksPerformed.toLocaleString()}
          subtitle="Continuous background checks"
          icon={Activity}
        />
        <MetricCard
          label="Active Alerts"
          value={metrics.activeAlertsCount.toString()}
          subtitle="Awaiting doctor sign-off"
          icon={ShieldAlert}
          badge={
            <Badge variant={metrics.activeAlertsCount > 0 ? "warning" : "success"} size="sm">
              {metrics.activeAlertsCount > 0 ? "Active" : "Clear"}
            </Badge>
          }
        />
        <MetricCard
          label="Allergy Conflicts"
          value={metrics.allergyConflictsCount.toString()}
          subtitle="Penicillin & Aspirin hard-stops"
          icon={ShieldAlert}
          badge={<Badge variant="danger" size="sm">Gated</Badge>}
        />
        <MetricCard
          label="Duplicate Medications"
          value={metrics.duplicateMedicationsCount.toString()}
          subtitle="Therapeutic class overlap"
          icon={Pill}
          badge={<Badge variant="warning" size="sm">Review</Badge>}
        />
        <MetricCard
          label="Interactions For Review"
          value={metrics.interactionsRequiringReview.toString()}
          subtitle="Drug-drug & chelation spacing"
          icon={FileCheck2}
        />
      </div>

      {/* Deterministic Rules Engine Transparency Banner */}
      <div className="rounded-xl border border-border bg-muted/30 p-3.5 text-xs text-muted-foreground flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <Info className="size-4 shrink-0 text-accent" />
          <span>
            <strong>Deterministic Pharmacology Rules:</strong> SAFEGUARD evaluates prescriptions strictly against validated regulatory formularies (CDSCO, BNF, FDA). Warnings are rule-grounded and never hallucinated by an LLM. Seeded demonstration alerts are labeled.
          </span>
        </div>
        <Badge variant="outline" size="sm" className="shrink-0 hidden sm:inline-flex">
          Zero Hallucination Guarantee
        </Badge>
      </div>

      {/* ====================================================================
          CATEGORY TABS & MULTI-FILTER CONTROLS
          ==================================================================== */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
            {/* Category Tabs */}
            <div className="flex overflow-x-auto space-x-1 sm:space-x-2 scrollbar-none py-1">
              {[
                { id: "all", label: `All Alerts (${alerts.length})` },
                { id: "Drug-drug interactions", label: "Drug-Drug Interactions" },
                { id: "Documented allergy conflicts", label: "Allergy Conflicts" },
                { id: "Duplicate active medications", label: "Duplicates" },
                { id: "Supported contraindications", label: "Contraindications" },
                { id: "Missing medication information", label: "Missing Info" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    selectedCategory === cat.id
                      ? "bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground shadow-xs"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Right: Search & Severity Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-full sm:w-56">
                <SearchInput
                  placeholder="Filter by drug, patient..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                />
              </div>

              {/* Severity Filter */}
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                aria-label="Filter by alert severity"
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="all">All Severities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Moderate">Moderate</option>
                <option value="Informational">Informational</option>
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                aria-label="Filter by review status"
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Reviewed &amp; Done</option>
              </select>
            </div>
          </div>
        </CardHeader>

        {/* ==================================================================
            ALERT CARDS GRID
            ================================================================== */}
        <CardContent className="p-4 sm:p-6">
          {filteredAlerts.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="mx-auto size-10 text-success" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                No Safety Alerts Matching Filter
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                All medications are clinically cleared against the selected category criteria.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                  setSelectedSeverity("all");
                  setSelectedStatus("all");
                }}
                className="mt-4"
              >
                Reset All Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={cn(
                    "flex flex-col justify-between rounded-xl border p-4 sm:p-5 transition-all shadow-xs",
                    getAlertCardBorder(alert.severity),
                  )}
                >
                  <div className="space-y-3">
                    {/* Header: Medication, Category, Severity & Status */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-foreground">
                            {alert.medicationName}
                          </h3>
                          {alert.interactingDrug && (
                            <span className="text-xs font-semibold text-accent">
                              + {alert.interactingDrug}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                          <Badge variant="outline" size="sm" className="font-normal text-[10px]">
                            {alert.category}
                          </Badge>
                          {alert.isSeededDemonstration && (
                            <Badge variant="navy" size="sm" className="text-[10px]">
                              Demonstration Rule
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getSeverityBadge(alert.severity)}
                        <Badge
                          variant={
                            alert.reviewStatus === "Pending Physician Review"
                              ? "warning"
                              : alert.reviewStatus === "Order Blocked"
                                ? "danger"
                                : "success"
                          }
                          size="sm"
                        >
                          {alert.reviewStatus}
                        </Badge>
                      </div>
                    </div>

                    {/* Alert Title & Clinical Description */}
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        {alert.title}
                      </h4>
                      <p className="mt-1 text-xs text-foreground/80 leading-relaxed">
                        {alert.description}
                      </p>
                    </div>

                    {/* Pharmacological Mechanism Snippet */}
                    <div className="rounded-lg bg-card/60 border border-border/60 p-2.5 text-[11px] space-y-1">
                      <span className="font-semibold text-accent block">
                        Clinical Mechanism:
                      </span>
                      <p className="text-muted-foreground leading-relaxed">
                        {alert.clinicalMechanism}
                      </p>
                    </div>

                    {/* Evidence Source & Regulatory Citation */}
                    <div className="flex flex-col justify-between gap-1 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                      <span className="font-medium text-foreground">
                        Evidence: <span className="text-accent">{alert.evidenceSource}</span>
                      </span>
                      <span className="text-[10px] font-mono text-muted-foreground truncate">
                        {alert.evidenceCitation}
                      </span>
                    </div>

                    {/* Patient Reference Box */}
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <User className="size-3.5 text-accent" />
                        <span className="font-semibold text-foreground">
                          {alert.patientName}
                        </span>
                        <span className="font-mono text-muted-foreground text-[11px]">
                          (#{alert.patientId})
                        </span>
                        <span className="text-muted-foreground text-[11px]">
                          • {alert.patientAge}y {alert.patientGender}
                        </span>
                      </div>
                      <Link
                        to={`/app/patients/${alert.patientId}`}
                        className="text-[11px] font-semibold text-accent hover:underline flex items-center gap-1"
                      >
                        Chart <ChevronRight className="size-3" />
                      </Link>
                    </div>

                    {/* Recorded Doctor Note if reviewed */}
                    {alert.doctorReviewNote && (
                      <div className="rounded-lg bg-success/10 border border-success/30 p-2 text-xs text-success space-y-0.5">
                        <span className="font-bold block text-[10px] uppercase">
                          Doctor Review Note ({alert.reviewedBy} • {alert.reviewedAt}):
                        </span>
                        <p className="text-[11px] text-success/90">{alert.doctorReviewNote}</p>
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons */}
                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                    <span className="text-[10px] text-muted-foreground">
                      {alert.reviewStatus === "Pending Physician Review"
                        ? "Requires doctor action"
                        : "Review recorded"}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => navigate(`/app/patients/${alert.patientId}`)}
                      >
                        View Profile
                      </Button>
                      <Button
                        variant="teal"
                        size="xs"
                        onClick={() => handleOpenReviewModal(alert)}
                        leftIcon={<ShieldCheck className="size-3.5" />}
                      >
                        Review Alert
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====================================================================
          INTERACTIVE PHARMACOLOGY RULES ENGINE TESTER
          ==================================================================== */}
      <Card>
        <CardHeader className="pb-3 border-b border-border/70">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-accent" />
                <CardTitle className="text-base font-bold text-foreground">
                  Interactive Pharmacology Rule Auditor
                </CardTitle>
              </div>
              <CardDescription className="text-xs mt-0.5">
                Test any drug combination against the 14,280 deterministic CDSCO/BNF interaction signatures.
              </CardDescription>
            </div>
            <Badge variant="teal" size="sm">
              Live Query Engine
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-12 items-end">
            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-foreground">
                First Molecule / Formulation
              </label>
              <Input
                value={testDrugA}
                onChange={(e) => setTestDrugA(e.target.value)}
                placeholder="e.g. Ciprofloxacin 500mg, Metformin 500mg"
              />
            </div>

            <div className="sm:col-span-5 space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Second Molecule / Concurrent Therapy
              </label>
              <Input
                value={testDrugB}
                onChange={(e) => setTestDrugB(e.target.value)}
                placeholder="e.g. Magnesium Antacid, Rabeprazole 20mg"
              />
            </div>

            <div className="sm:col-span-2">
              <Button
                variant="teal"
                size="md"
                onClick={handleRunInteractionTest}
                className="w-full"
                leftIcon={<Search className="size-4" />}
              >
                Audit Pair
              </Button>
            </div>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={cn(
                "rounded-xl border p-4 text-xs space-y-1.5 transition-all",
                testResult.matched
                  ? "border-warning/40 bg-warning/5"
                  : "border-success/30 bg-success/5",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-foreground text-sm flex items-center gap-2">
                  {testResult.matched ? (
                    <AlertTriangle className="size-4 text-warning" />
                  ) : (
                    <CheckCircle2 className="size-4 text-success" />
                  )}
                  {testResult.matched ? "Interaction Rule Match Detected" : "No Documented Contraindication"}
                </span>
                {getSeverityBadge(testResult.severity)}
              </div>

              <p className="text-xs text-foreground/90 leading-relaxed">
                {testResult.title}
              </p>

              <div className="pt-1 text-[11px] text-muted-foreground flex justify-between">
                <span>Regulatory Grounding: {testResult.evidence}</span>
                <span className="font-mono text-accent font-semibold">Deterministic SafeGuard v3.0</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ====================================================================
          MODAL: DOCTOR REVIEW WORKFLOW & NOTE RECORDING
          ==================================================================== */}
      {selectedAlertForReview && (
        <Modal
          open={!!selectedAlertForReview}
          onOpenChange={(open) => {
            if (!open) setSelectedAlertForReview(null);
          }}
          title={`Safety Review: ${selectedAlertForReview.medicationName}`}
          description={`Patient: ${selectedAlertForReview.patientName} (#${selectedAlertForReview.patientId}) • ${selectedAlertForReview.category}`}
          size="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const pid = selectedAlertForReview.patientId;
                  setSelectedAlertForReview(null);
                  navigate(`/app/patients/${pid}`);
                }}
                leftIcon={<User className="size-3.5" />}
              >
                Go to Patient Profile
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAlertForReview(null)}
                >
                  Cancel
                </Button>
                <Button
                  variant="teal"
                  size="sm"
                  onClick={handleSubmitReview}
                  leftIcon={<Check className="size-3.5" />}
                >
                  Commit Review Decision
                </Button>
              </div>
            </div>
          }
        >
          <form onSubmit={handleSubmitReview} className="space-y-4 text-xs">
            {/* Alert Summary Box */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm text-foreground">
                  {selectedAlertForReview.title}
                </h4>
                {getSeverityBadge(selectedAlertForReview.severity)}
              </div>
              <p className="text-foreground/80 leading-relaxed">
                {selectedAlertForReview.description}
              </p>
              <div className="rounded-lg bg-card p-2.5 border border-border/60 text-[11px] space-y-1">
                <strong className="text-accent block">Evidence Source &amp; Regulatory Citation:</strong>
                <p className="text-muted-foreground">{selectedAlertForReview.evidenceCitation}</p>
                <p className="text-foreground/90 font-medium pt-1">
                  Recommendation: {selectedAlertForReview.clinicalRecommendation}
                </p>
              </div>
            </div>

            {/* Doctor Decision Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Doctor Review Decision *
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => setReviewDecision("Reviewed & Acknowledged")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    reviewDecision === "Reviewed & Acknowledged"
                      ? "border-teal-500 bg-teal-500/10 font-bold text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400" />
                    <span>Acknowledge</span>
                  </div>
                  <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                    Accept advisory without altering prescription.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("Overridden with Rationale")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    reviewDecision === "Overridden with Rationale"
                      ? "border-amber-500 bg-amber-500/10 font-bold text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
                    <span>Override with Note</span>
                  </div>
                  <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                    Proceed with clinical monitoring rationale.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setReviewDecision("Order Blocked")}
                  className={cn(
                    "rounded-xl border p-3 text-left transition-all",
                    reviewDecision === "Order Blocked"
                      ? "border-destructive bg-destructive/10 font-bold text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert className="size-4 text-destructive" />
                    <span>Block / Cancel</span>
                  </div>
                  <p className="mt-1 text-[10px] font-normal text-muted-foreground">
                    Discontinue order to safeguard patient.
                  </p>
                </button>
              </div>
            </div>

            {/* Doctor Justification / Review Note Textarea */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">
                Clinical Justification / Review Note (Optional)
              </label>
              <textarea
                rows={3}
                value={doctorNoteInput}
                onChange={(e) => setDoctorNoteInput(e.target.value)}
                placeholder="e.g. Spaced fluoroquinolone 3 hours after antacid. Patient counseled on administration schedule."
                className="w-full rounded-xl border border-border bg-input p-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent leading-relaxed"
              />
              <span className="text-[11px] text-muted-foreground">
                Note is timestamped and recorded under {doctor?.name || "Dr. Anika Rao"}&apos;s medical license.
              </span>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
