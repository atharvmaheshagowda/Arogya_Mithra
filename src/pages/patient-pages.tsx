import { useState, useMemo, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck2,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Filter,
  HeartPulse,
  Languages,
  Layers,
  Mail,
  MapPin,
  Mic,
  Pill,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trash2,
  User,
  Users,
  LayoutGrid,
  List,
  X,
} from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
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
import { TeamLanyardRail, type LanyardMember } from "@/components/ui/team-lanyard-rail";
import {
  getPatients,
  getPatientById,
  addPatientRecord,
  updatePatientRecord,
  subscribePatients,
  type PatientProfile,
  type AllergyItem,
  type MedicationItem,
  type DiagnosisItem,
  type LabReportItem,
  type ConsultationItem,
  type TimelineEvent,
} from "@/lib/patient-service";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

/* ==========================================================================
   PATIENTS PAGE — /app/patients
   ========================================================================== */

export function PatientsPage() {
  const navigate = useNavigate();
  const { doctor } = useAuth();
  const { toast } = useToast();

  const [patients, setPatients] = useState<PatientProfile[]>(() => getPatients());

  // Subscribe to patient store updates
  useEffect(() => {
    return subscribePatients(() => {
      setPatients(getPatients());
    });
  }, []);

  // Search & Filter state
  const [search, setSearch] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [allergyFilter, setAllergyFilter] = useState("all"); // "all" | "with-allergies" | "no-allergies"
  const [sortBy, setSortBy] = useState<"name-asc" | "name-desc" | "age-asc" | "age-desc" | "recent">("recent");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // View Mode: Interactive Lanyard Badges vs Table Registry
  const [viewMode, setViewMode] = useState<"badges" | "table">("badges");

  // Transform patient profiles into interactive Lanyard Badges
  const lanyardMembers: LanyardMember[] = useMemo(() => {
    return patients.map((p, idx) => {
      const topConditions = p.diagnoses.map((d) => d.condition).slice(0, 2).join(", ") || "General OPD Triage";
      const critical = p.allergies.some((a) => a.critical);
      return {
        id: p.id,
        name: p.name,
        role: `${p.gender}, ${p.age}y • ${p.preferredLanguage.split(" ")[0]}`,
        team: p.status,
        image: p.avatar || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        bio: `${topConditions}. Blood: ${p.bloodGroup || "O+"}. Vitals: ${p.vitals || "Normal range"}. Last consultation: ${p.lastConsultation}.`,
        tags: [
          p.bloodGroup || "B+",
          critical ? "⚠️ Alert" : "NKDA",
          p.preferredLanguage.split(" ")[0],
          p.status.split(" ")[0],
        ],
        links: [
          { label: "View Profile", href: `/app/patients/${p.id}` },
          { label: "Consultation", href: "/app/consultations" },
        ],
        tone: (((idx % 5) + 1) as 1 | 2 | 3 | 4 | 5),
        drop: (idx % 3) * 6,
      };
    });
  }, [patients]);

  // Add Patient Modal State
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState({
    name: "",
    age: "",
    dob: "",
    gender: "Male" as "Male" | "Female" | "Other",
    preferredLanguage: "Kannada (ಕನ್ನಡ)",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    bloodGroup: "B+",
    knownAllergies: "",
    existingConditions: "",
  });

  // Handle Add Patient Submission
  const handleAddPatientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientForm.name.trim() || !newPatientForm.age.trim()) {
      toast.error("Required Fields Missing", {
        description: "Please enter patient full name and age.",
      });
      return;
    }

    const created = addPatientRecord({
      name: newPatientForm.name.trim(),
      age: parseInt(newPatientForm.age, 10) || 30,
      dob: newPatientForm.dob,
      gender: newPatientForm.gender,
      preferredLanguage: newPatientForm.preferredLanguage,
      phone: newPatientForm.phone || "+91 98450 00000",
      email: newPatientForm.email,
      address: newPatientForm.address,
      emergencyContact: newPatientForm.emergencyContact,
      bloodGroup: newPatientForm.bloodGroup,
      knownAllergies: newPatientForm.knownAllergies,
      existingConditions: newPatientForm.existingConditions,
    });

    setIsAddPatientOpen(false);
    setNewPatientForm({
      name: "",
      age: "",
      dob: "",
      gender: "Male",
      preferredLanguage: "Kannada (ಕನ್ನಡ)",
      phone: "",
      email: "",
      address: "",
      emergencyContact: "",
      bloodGroup: "B+",
      knownAllergies: "",
      existingConditions: "",
    });

    toast.success("Patient Record Created", {
      description: `${created.name} (${created.id}) registered into Apollo Hospitals OPD registry.`,
    });
  };

  // Filtered & Sorted Patients
  const filteredPatients = useMemo(() => {
    let result = patients.filter((p) => {
      // Search
      const q = search.toLowerCase();
      const matchSearch =
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.diagnoses.some((d) => d.condition.toLowerCase().includes(q)) ||
        p.preferredLanguage.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Language filter
      if (languageFilter !== "all") {
        if (!p.preferredLanguage.toLowerCase().includes(languageFilter.toLowerCase())) {
          return false;
        }
      }

      // Allergy filter
      if (allergyFilter === "with-allergies" && p.allergies.length === 0) {
        return false;
      }
      if (allergyFilter === "no-allergies" && p.allergies.length > 0) {
        return false;
      }

      return true;
    });

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name-asc") return a.name.localeCompare(b.name);
      if (sortBy === "name-desc") return b.name.localeCompare(a.name);
      if (sortBy === "age-asc") return a.age - b.age;
      if (sortBy === "age-desc") return b.age - a.age;
      // "recent" (default)
      return b.id.localeCompare(a.id);
    });

    return result;
  }, [patients, search, languageFilter, allergyFilter, sortBy]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage) || 1;
  const paginatedPatients = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredPatients.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredPatients, currentPage, itemsPerPage]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, languageFilter, allergyFilter, sortBy]);

  // Summary counts
  const totalRegistered = 1284;
  const inOpdToday = patients.length;
  const allergyCount = patients.filter((p) => p.allergies.length > 0).length;
  const labPendingCount = patients.reduce(
    (acc, p) => acc + p.labReports.filter((l) => l.status === "Pending Review").length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* ====================================================================
          TOP BANNER & STATISTICS
          ==================================================================== */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow">CONNECT Module • Longitudinal EHR</span>
            <Badge variant="teal" size="sm" dot>
              Live OPD Directory
            </Badge>
            <span className="hidden text-xs text-muted-foreground sm:inline">•</span>
            <span className="text-xs text-muted-foreground">
              {doctor?.clinic || "Apollo Hospitals, Bengaluru"}
            </span>
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Patient Management Interface
          </h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Unified clinical context, allergy flags, medication histories, and diagnostic reports for outpatient consultations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="teal"
            size="md"
            onClick={() => setIsAddPatientOpen(true)}
            leftIcon={<Plus className="size-4" />}
            className="shadow-sm font-semibold"
          >
            Add Patient
          </Button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard
          label="Total Registered Patients"
          value={totalRegistered.toLocaleString()}
          subtitle="Hospital active registry"
          icon={Users}
        />
        <MetricCard
          label="Active In OPD Today"
          value={inOpdToday.toString()}
          subtitle="Room 04 Consultation Queue"
          icon={HeartPulse}
          badge={<Badge variant="teal" size="sm" dot>Queue Active</Badge>}
        />
        <MetricCard
          label="Allergy-Flagged Records"
          value={allergyCount.toString()}
          subtitle="SAFEGUARD protection active"
          icon={ShieldAlert}
          badge={<Badge variant="danger" size="sm">Gated</Badge>}
        />
        <MetricCard
          label="Diagnostic Reports"
          value="14"
          subtitle="98.8% OCR Confidence"
          icon={FileCheck2}
        />
      </div>

      {/* ====================================================================
          INTERACTIVE PATIENT LANYARD RAIL
          ==================================================================== */}
      <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/70">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              <Sparkles className="size-3.5" />
              <span>Active OPD Patient Roster • 3D Lanyard Cards</span>
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold tracking-tight text-foreground font-display">
              Patient Profile Badges
            </h2>
            <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
              Click or drag any patient badge to swing, flip 360°, inspect clinical vitals, QR code, and launch immediate consultations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === "badges" ? "teal" : "outline"}
              size="sm"
              onClick={() => setViewMode("badges")}
              leftIcon={<LayoutGrid className="size-3.5" />}
            >
              Lanyard View
            </Button>
            <Button
              variant={viewMode === "table" ? "teal" : "outline"}
              size="sm"
              onClick={() => setViewMode("table")}
              leftIcon={<List className="size-3.5" />}
            >
              Table View
            </Button>
          </div>
        </div>

        {viewMode === "badges" && (
          <div className="pt-2">
            <TeamLanyardRail
              items={lanyardMembers}
              caption="Interactive patient cards. Click any badge to flip between front photo and rear clinical notes."
              action={
                <Button
                  variant="teal"
                  size="sm"
                  onClick={() => navigate(`/app/patients/${patients[0]?.id || "AM-94021"}`)}
                  rightIcon={<ArrowRight className="size-3.5" />}
                  className="rounded-full px-5 shadow-xs font-semibold"
                >
                  Open First Patient File ({patients[0]?.id || "AM-94021"})
                </Button>
              }
            />
          </div>
        )}
      </div>

      {/* ====================================================================
          PATIENT MANAGEMENT TABLE
          ==================================================================== */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div>
              <CardTitle className="text-lg">Registered Patients Directory</CardTitle>
              <CardDescription className="mt-0.5">
                Showing {filteredPatients.length} patient record{filteredPatients.length === 1 ? "" : "s"} across active clinics.
              </CardDescription>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="w-full sm:w-64">
                <SearchInput
                  placeholder="Search name, MRN, condition..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                />
              </div>

              {/* Language Filter */}
              <select
                value={languageFilter}
                onChange={(e) => setLanguageFilter(e.target.value)}
                aria-label="Filter by language"
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="all">All Languages</option>
                <option value="kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="hindi">Hindi (हिंदी)</option>
                <option value="english">Indian English</option>
              </select>

              {/* Allergy Filter */}
              <select
                value={allergyFilter}
                onChange={(e) => setAllergyFilter(e.target.value)}
                aria-label="Filter by allergy status"
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="all">All Allergy States</option>
                <option value="with-allergies">Documented Allergies</option>
                <option value="no-allergies">No Known Allergies (NKDA)</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort patient list"
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="recent">Sort: Most Recent</option>
                <option value="name-asc">Sort: Name (A to Z)</option>
                <option value="name-desc">Sort: Name (Z to A)</option>
                <option value="age-asc">Sort: Age (Youngest)</option>
                <option value="age-desc">Sort: Age (Oldest)</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                <tr>
                  <th className="px-6 py-3.5">Patient ID</th>
                  <th className="px-4 py-3.5">Patient Name</th>
                  <th className="px-4 py-3.5">Age & Gender</th>
                  <th className="px-4 py-3.5">Preferred Language</th>
                  <th className="px-4 py-3.5">Last Consultation</th>
                  <th className="px-4 py-3.5">Medical History / Conditions</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center">
                        <Users className="size-8 text-muted-foreground/50" />
                        <h4 className="mt-3 text-sm font-semibold text-foreground">
                          No matching patients found
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Try adjusting your search query, language filter, or allergy criteria.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearch("");
                            setLanguageFilter("all");
                            setAllergyFilter("all");
                          }}
                          className="mt-4"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient) => {
                    const initials = patient.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);

                    const hasCriticalAllergy = patient.allergies.some((a) => a.critical);

                    return (
                      <tr
                        key={patient.id}
                        className="group transition-colors hover:bg-muted/30"
                      >
                        {/* Patient ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs font-bold text-accent">
                            {patient.id}
                          </span>
                        </td>

                        {/* Patient Name */}
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-full border border-border/80 shadow-xs bg-muted">
                              {patient.avatar ? (
                                <img
                                  src={patient.avatar}
                                  alt={patient.name}
                                  className="size-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                              ) : null}
                              <div className="absolute inset-0 grid place-items-center bg-accent/15 text-xs font-bold text-accent -z-10">
                                {initials}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/app/patients/${patient.id}`}
                                className="font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-1.5"
                              >
                                {patient.name}
                              </Link>
                              <div className="text-[11px] text-muted-foreground">
                                {patient.phone}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Age & Gender */}
                        <td className="px-4 py-4 text-xs text-foreground">
                          <span className="font-medium">{patient.age} yrs</span>
                          <span className="text-muted-foreground"> • {patient.gender}</span>
                          <span className="block text-[11px] text-muted-foreground">
                            Blood: {patient.bloodGroup}
                          </span>
                        </td>

                        {/* Preferred Language */}
                        <td className="px-4 py-4">
                          <Badge variant="outline" size="sm" className="font-normal text-[11px]">
                            <Languages className="size-3 mr-1 text-accent" />
                            {patient.preferredLanguage}
                          </Badge>
                        </td>

                        {/* Last Consultation */}
                        <td className="px-4 py-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Clock className="size-3 text-muted-foreground" />
                            {patient.lastConsultation}
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {patient.status}
                          </span>
                        </td>

                        {/* Medical History */}
                        <td className="px-4 py-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {patient.diagnoses.map((d) => (
                              <Badge key={d.id} variant="default" size="sm" className="text-[10px]">
                                {d.condition}
                              </Badge>
                            ))}
                            {hasCriticalAllergy && (
                              <Badge variant="danger" size="sm" className="text-[10px]">
                                <AlertTriangle className="size-2.5 mr-0.5" />
                                {patient.allergies[0].allergen.split(" ")[0]} Allergy
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="xs"
                              onClick={() => navigate(`/app/patients/${patient.id}`)}
                              leftIcon={<Eye className="size-3.5" />}
                            >
                              Profile
                            </Button>
                            <Button
                              variant="teal"
                              size="xs"
                              onClick={() => navigate("/app/consultations")}
                              leftIcon={<Mic className="size-3.5" />}
                            >
                              Scribe
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-6 py-3.5 sm:flex-row">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {filteredPatients.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-foreground">
                {Math.min(currentPage * itemsPerPage, filteredPatients.length)}
              </span>{" "}
              of <span className="font-semibold text-foreground">{filteredPatients.length}</span> patients
            </p>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                leftIcon={<ChevronLeft className="size-3.5" />}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1 text-xs">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
                    className={cn(
                      "size-7 rounded-md text-xs font-semibold transition-colors",
                      currentPage === num
                        ? "bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="xs"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                rightIcon={<ChevronRight className="size-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====================================================================
          MODAL: ADD PATIENT
          ==================================================================== */}
      <Modal
        open={isAddPatientOpen}
        onOpenChange={setIsAddPatientOpen}
        title="Register New Patient"
        description="Create an evidence-grounded outpatient record for consultation."
        size="lg"
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
              Create & Enroll
            </Button>
          </div>
        }
      >
        <form onSubmit={handleAddPatientSubmit} className="space-y-4">
          {/* Row 1: Full name & DOB */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-foreground">
                Full Name *
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
                placeholder="e.g. 52"
                value={newPatientForm.age}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, age: e.target.value })
                }
                className="mt-1"
                required
              />
            </div>
          </div>

          {/* Row 2: Date of Birth, Gender, Blood Group */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Date of Birth
              </label>
              <Input
                type="date"
                value={newPatientForm.dob}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, dob: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Gender
              </label>
              <select
                value={newPatientForm.gender}
                onChange={(e) =>
                  setNewPatientForm({
                    ...newPatientForm,
                    gender: e.target.value as any,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Blood Group
              </label>
              <select
                value={newPatientForm.bloodGroup}
                onChange={(e) =>
                  setNewPatientForm({
                    ...newPatientForm,
                    bloodGroup: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="O+">O Positive (O+)</option>
                <option value="A+">A Positive (A+)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB-">AB Negative (AB-)</option>
              </select>
            </div>
          </div>

          {/* Row 3: Preferred Language & Contact Phone */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Preferred Language
              </label>
              <select
                value={newPatientForm.preferredLanguage}
                onChange={(e) =>
                  setNewPatientForm({
                    ...newPatientForm,
                    preferredLanguage: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              >
                <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                <option value="Indian English">Indian English</option>
                <option value="Kannada / English">Kannada / English (Code-mixed)</option>
                <option value="Hindi / English">Hindi / English (Code-mixed)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Contact Phone
              </label>
              <Input
                placeholder="+91 98450 12345"
                value={newPatientForm.phone}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, phone: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Row 4: Email & Address */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="patient@gmail.com"
                value={newPatientForm.email}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, email: e.target.value })
                }
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Address / Locality
              </label>
              <Input
                placeholder="e.g. Jayanagar, Bengaluru"
                value={newPatientForm.address}
                onChange={(e) =>
                  setNewPatientForm({ ...newPatientForm, address: e.target.value })
                }
                className="mt-1"
              />
            </div>
          </div>

          {/* Row 5: Known Allergies */}
          <div>
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Known Drug / Food Allergies</span>
              <span className="text-[11px] text-muted-foreground font-normal">
                Leave blank or write &apos;None&apos; if NKDA
              </span>
            </label>
            <Input
              placeholder="e.g. Penicillin, Sulfa, Aspirin (or None)"
              value={newPatientForm.knownAllergies}
              onChange={(e) =>
                setNewPatientForm({
                  ...newPatientForm,
                  knownAllergies: e.target.value,
                })
              }
              className="mt-1"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              SAFEGUARD Engine automatically parses allergy strings to prevent hazardous prescriptions.
            </p>
          </div>

          {/* Row 6: Existing Medical Conditions */}
          <div>
            <label className="text-xs font-semibold text-foreground">
              Existing Medical Conditions
            </label>
            <Input
              placeholder="e.g. Type 2 Diabetes, Hypertension, Bronchial Asthma (comma-separated)"
              value={newPatientForm.existingConditions}
              onChange={(e) =>
                setNewPatientForm({
                  ...newPatientForm,
                  existingConditions: e.target.value,
                })
              }
              className="mt-1"
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ==========================================================================
   PATIENT PROFILE PAGE — /app/patients/:patientId
   ========================================================================== */

export function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [patientData, setPatientData] = useState<PatientProfile | undefined>(() =>
    patientId ? getPatientById(patientId) : undefined,
  );

  useEffect(() => {
    if (patientId) {
      setPatientData(getPatientById(patientId));
    }
    return subscribePatients(() => {
      if (patientId) {
        setPatientData(getPatientById(patientId));
      }
    });
  }, [patientId]);

  const patient = patientData;

  // Edit Patient Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    age: "",
    gender: "Male" as "Male" | "Female" | "Other",
    phone: "",
    preferredLanguage: "Kannada (ಕನ್ನಡ)",
    bloodGroup: "O+",
    address: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Sync edit form with current patient data whenever modal opens
  useEffect(() => {
    if (patient) {
      setEditForm({
        name: patient.name,
        age: patient.age.toString(),
        gender: patient.gender,
        phone: patient.phone,
        preferredLanguage: patient.preferredLanguage,
        bloodGroup: patient.bloodGroup || "O+",
        address: patient.address || "",
      });
      setEditError(null);
    }
  }, [patient, isEditModalOpen]);

  // Active tab from URL query param or state (default: overview)
  const activeTab = searchParams.get("tab") || "overview";
  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Timeline category filter
  const [timelineFilter, setTimelineFilter] = useState<string>("all");

  // Handle Edit Patient Submit
  const handleEditPatientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (!editForm.name.trim()) {
      setEditError("Patient full name is required.");
      return;
    }
    const ageNum = parseInt(editForm.age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 130) {
      setEditError("Valid age between 0 and 130 is required.");
      return;
    }
    if (!editForm.phone.trim()) {
      setEditError("Contact phone number is required.");
      return;
    }

    try {
      setIsSaving(true);
      await updatePatientRecord(patient!.id, {
        name: editForm.name.trim(),
        age: ageNum,
        gender: editForm.gender,
        phone: editForm.phone.trim(),
        preferredLanguage: editForm.preferredLanguage,
        bloodGroup: editForm.bloodGroup,
        address: editForm.address.trim(),
      });

      setIsEditModalOpen(false);
      toast.success("Patient Details Updated", {
        description: `Successfully updated clinical record for ${editForm.name.trim()} (${patient!.id}).`,
      });
    } catch (err: any) {
      setEditError(err.message || "Failed to update patient details on server.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!patient) {
    return (
      <div className="space-y-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/app/patients")}
          leftIcon={<ArrowLeft className="size-4" />}
        >
          Back to Patient Directory
        </Button>

        <Card className="py-16 text-center">
          <AlertCircle className="mx-auto size-12 text-destructive" />
          <h2 className="mt-4 font-display text-2xl font-bold text-foreground">
            Patient Record Not Found
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No clinical file exists for patient identifier &quot;{patientId}&quot;.
          </p>
          <Button
            variant="teal"
            size="md"
            onClick={() => navigate("/app/patients")}
            className="mt-6"
          >
            Return to Patients List
          </Button>
        </Card>
      </div>
    );
  }

  const initials = patient.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasCriticalAllergy = patient.allergies.some((a) => a.critical);

  // Filtered timeline
  const filteredTimeline = patient.timeline.filter((ev) => {
    if (timelineFilter === "all") return true;
    return ev.type === timelineFilter;
  });

  return (
    <div className="space-y-6">
      {/* ====================================================================
          TOP PATIENT HEADER BANNER
          ==================================================================== */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between pb-4 border-b border-border/70">
          <Button
            variant="ghost"
            size="xs"
            onClick={() => navigate("/app/patients")}
            leftIcon={<ArrowLeft className="size-3.5" />}
          >
            Back to Patients
          </Button>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-accent">
              MRN: #{patient.id}
            </span>
            <Badge variant={patient.statusVariant} size="sm">
              {patient.status}
            </Badge>
          </div>
        </div>

        {/* Patient Identity & Primary Details */}
        <div className="mt-5 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="flex items-start gap-4">
            <div className="relative size-18 sm:size-20 shrink-0 overflow-hidden rounded-2xl border-2 border-accent/40 shadow-md bg-muted">
              {patient.avatar ? (
                <img
                  src={patient.avatar}
                  alt={patient.name}
                  className="size-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : null}
              <div className="absolute inset-0 grid place-items-center bg-accent/15 font-display text-2xl font-bold text-accent -z-10">
                {initials}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                  {patient.name}
                </h1>
                <Badge variant="outline" size="sm">
                  {patient.age} yrs • {patient.gender}
                </Badge>
                <Badge variant="teal" size="sm">
                  Blood: {patient.bloodGroup}
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 text-accent" />
                  {patient.phone}
                </span>
                <span className="flex items-center gap-1.5">
                  <Languages className="size-3.5 text-accent" />
                  {patient.preferredLanguage}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3.5 text-accent" />
                  {patient.address}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Consultation Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<Edit3 className="size-4" />}
            >
              Edit Patient
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/app/reports")}
              leftIcon={<FileCheck2 className="size-4" />}
            >
              Upload Lab
            </Button>
            <Button
              variant="teal"
              size="sm"
              onClick={() => navigate("/app/consultations")}
              leftIcon={<Mic className="size-4" />}
              rightIcon={<ArrowRight className="size-4" />}
              className="shadow-sm font-semibold"
            >
              Start Ambient Scribe
            </Button>
          </div>
        </div>

        {/* High-Visibility Allergy Safety Alert Banner */}
        {hasCriticalAllergy && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-destructive animate-in fade-in">
            <ShieldAlert className="size-5 shrink-0 text-destructive mt-0.5" />
            <div className="min-w-0 flex-1 text-xs">
              <div className="font-bold flex items-center gap-2">
                <span>SAFEGUARD CRITICAL ALLERGY WARNING</span>
                <Badge variant="danger" size="sm">HARD STOP ACTIVE</Badge>
              </div>
              <p className="mt-1 text-destructive/90 leading-relaxed">
                Patient has documented severe hypersensitivity to{" "}
                <span className="font-bold underline">
                  {patient.allergies.map((a) => a.allergen).join(", ")}
                </span>
                . Any prescription containing beta-lactams or related cross-reactive molecules will be intercepted.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ====================================================================
          TAB NAVIGATION (6 TABS)
          1. Overview
          2. Medical History
          3. Medications
          4. Laboratory Reports
          5. Consultations
          6. Timeline
          ==================================================================== */}
      <div className="border-b border-border">
        <div className="flex overflow-x-auto space-x-1 sm:space-x-2 py-1 scrollbar-none">
          {[
            { id: "overview", label: "Overview", icon: Layers },
            { id: "history", label: "Medical History", icon: Activity },
            { id: "medications", label: `Medications (${patient.medications.length})`, icon: Pill },
            { id: "labs", label: `Laboratory Reports (${patient.labReports.length})`, icon: FileSpreadsheet },
            { id: "consultations", label: `Consultations (${patient.consultations.length})`, icon: Stethoscope },
            { id: "timeline", label: `Mithra Safety Timeline (${patient.timeline.length})`, icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-2 text-xs font-semibold transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground shadow-xs"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ====================================================================
          TAB 1: PATIENT OVERVIEW
          ==================================================================== */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Left 8 cols */}
            <div className="space-y-6 lg:col-span-8">
              {/* Patient Information & Vitals Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Clinical Vitals & Demographics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 rounded-xl border border-border bg-muted/20 p-4 sm:grid-cols-4">
                    <div>
                      <span className="text-[11px] text-muted-foreground">Blood Pressure</span>
                      <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                        {patient.vitals.split("•")[0]?.replace("BP:", "").trim() || "120/80"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">Heart Rate</span>
                      <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                        {patient.vitals.split("•")[1]?.replace("HR:", "").trim() || "74 bpm"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">Blood Glucose</span>
                      <p className="mt-0.5 font-display text-lg font-bold text-accent">
                        {patient.vitals.split("•")[2]?.replace("Glucose:", "").trim() || "142 mg/dL"}
                      </p>
                    </div>
                    <div>
                      <span className="text-[11px] text-muted-foreground">Oxygen (SpO2)</span>
                      <p className="mt-0.5 font-display text-lg font-bold text-foreground">
                        {patient.vitals.split("•")[3]?.replace("SpO2:", "").trim() || "98%"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                    <div className="rounded-lg border border-border p-3">
                      <span className="text-muted-foreground">Emergency Contact:</span>
                      <p className="mt-0.5 font-medium text-foreground">{patient.emergencyContact}</p>
                    </div>
                    <div className="rounded-lg border border-border p-3">
                      <span className="text-muted-foreground">Email:</span>
                      <p className="mt-0.5 font-medium text-foreground">{patient.email}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Active Medications Preview */}
              <Card>
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Current Active Medications</CardTitle>
                    <CardDescription className="text-xs">
                      {patient.medications.filter((m) => m.status === "active").length} prescribed active molecules.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => setActiveTab("medications")}
                  >
                    View All
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {patient.medications.filter((m) => m.status === "active").map((med) => (
                    <div
                      key={med.id}
                      className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="grid size-8 place-items-center rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 mt-0.5">
                          <Pill className="size-4" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-xs text-foreground">{med.name}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            {med.dosage} • {med.frequency}
                          </p>
                          <span className="text-[10px] text-accent font-medium">
                            Indication: {med.indication}
                          </span>
                        </div>
                      </div>
                      <Badge variant="teal" size="sm">Active</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Recent Consultation Card */}
              {patient.consultations[0] && (
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base">Recent Consultation Summary</CardTitle>
                      <CardDescription className="text-xs">
                        {patient.consultations[0].date} • {patient.consultations[0].doctor}
                      </CardDescription>
                    </div>
                    <Badge variant="teal" size="sm">Doctor Signed</Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="rounded-xl border border-border bg-muted/20 p-3.5 text-xs font-mono">
                      <span className="font-bold text-accent">Chief Complaint:</span>
                      <p className="mt-1 text-foreground">{patient.consultations[0].chiefComplaint}</p>
                    </div>
                    <div className="rounded-xl border border-border p-3.5 text-xs space-y-2">
                      <div>
                        <span className="font-semibold text-foreground">Assessment:</span>
                        <p className="text-muted-foreground mt-0.5">{patient.consultations[0].soapNote.assessment}</p>
                      </div>
                      <div className="pt-2 border-t border-border">
                        <span className="font-semibold text-foreground">Treatment Plan:</span>
                        <p className="text-muted-foreground whitespace-pre-line mt-0.5">{patient.consultations[0].soapNote.plan}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right 4 cols: Allergies & Diagnoses */}
            <div className="space-y-6 lg:col-span-4">
              {/* Documented Allergies */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Documented Allergies</CardTitle>
                    <Badge
                      variant={patient.allergies.length > 0 ? "danger" : "outline"}
                      size="sm"
                    >
                      {patient.allergies.length > 0 ? `${patient.allergies.length} Documented` : "NKDA"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {patient.allergies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border py-6 text-center text-xs text-muted-foreground">
                      <CheckCircle2 className="mx-auto size-6 text-success" />
                      <p className="mt-2 font-medium text-foreground">No Known Drug Allergies (NKDA)</p>
                      <p className="mt-0.5 text-[11px]">No adverse immunological reactions documented.</p>
                    </div>
                  ) : (
                    patient.allergies.map((alg) => (
                      <div
                        key={alg.id}
                        className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-destructive">{alg.allergen}</span>
                          <Badge variant="danger" size="sm">{alg.severity}</Badge>
                        </div>
                        <p className="mt-1 text-foreground/80">{alg.reaction}</p>
                        <div className="mt-2 text-[10px] text-muted-foreground border-t border-destructive/20 pt-1.5 flex justify-between">
                          <span>Source: {alg.source}</span>
                          <span>{alg.documentedDate}</span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Previous Diagnoses */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Active Diagnoses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {patient.diagnoses.map((diag) => (
                    <div
                      key={diag.id}
                      className="rounded-xl border border-border p-3 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{diag.condition}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{diag.code}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{diag.notes}</p>
                      <div className="pt-1 text-[10px] text-accent font-medium">
                        Onset: {diag.onset} • Status: {diag.status}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 2: MEDICAL HISTORY
          ==================================================================== */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Chronic Conditions & Onsets */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chronic Medical Conditions</CardTitle>
                <CardDescription className="text-xs">
                  ICD-coded clinical history and monitoring state.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {patient.diagnoses.map((diag) => (
                  <div key={diag.id} className="rounded-xl border border-border p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-foreground text-sm">{diag.condition}</h4>
                      <Badge variant="navy" size="sm">{diag.code}</Badge>
                    </div>
                    <p className="text-muted-foreground">{diag.notes}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                      <span>Onset: {diag.onset}</span>
                      <span>•</span>
                      <span>Status: {diag.status}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Surgical History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Surgical & Procedural History</CardTitle>
                <CardDescription className="text-xs">
                  Past surgical interventions and procedures.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patient.surgicalHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    No major surgeries or surgical procedures documented.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {patient.surgicalHistory.map((surg, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-xs">
                        <Check className="size-4 shrink-0 text-accent mt-0.5" />
                        <span className="text-foreground">{surg}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Family Medical History */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Family History (Pedigree)</CardTitle>
                <CardDescription className="text-xs">
                  First-degree familial hereditary predispositions.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {patient.familyHistory.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">
                    Non-contributory or non-documented family history.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {patient.familyHistory.map((fam, i) => (
                      <li key={i} className="flex items-start gap-2.5 rounded-lg border border-border p-3 text-xs">
                        <Users className="size-4 shrink-0 text-muted-foreground mt-0.5" />
                        <span className="text-foreground">{fam}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Lifestyle & Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Social History & Lifestyle</CardTitle>
                <CardDescription className="text-xs">
                  Dietary habits, physical activity, and substance use.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                  <span className="text-muted-foreground">Dietary Pattern:</span>
                  <span className="font-medium text-foreground">{patient.lifestyle.diet}</span>
                </div>
                <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                  <span className="text-muted-foreground">Tobacco / Smoking:</span>
                  <span className="font-medium text-foreground">{patient.lifestyle.smoking}</span>
                </div>
                <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                  <span className="text-muted-foreground">Alcohol Intake:</span>
                  <span className="font-medium text-foreground">{patient.lifestyle.alcohol}</span>
                </div>
                <div className="rounded-lg border border-border p-3 flex justify-between items-center">
                  <span className="text-muted-foreground">Physical Exercise:</span>
                  <span className="font-medium text-foreground">{patient.lifestyle.physicalActivity}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ====================================================================
          TAB 3: MEDICATIONS (ACTIVE & HISTORICAL)
          ==================================================================== */}
      {activeTab === "medications" && (
        <div className="space-y-6">
          {/* SAFEGUARD Interaction Check Bar */}
          <ClinicalCalloutCard
            variant={hasCriticalAllergy ? "danger" : "teal"}
            title="SAFEGUARD Medication Safety Gate"
            icon={hasCriticalAllergy ? ShieldAlert : ShieldCheck}
          >
            {hasCriticalAllergy
              ? `Penicillin class molecules blocked for ${patient.name}. CDSCO contraindication gating active.`
              : `All current medications verified against documented allergies. No drug-drug interactions detected.`}
          </ClinicalCalloutCard>

          {/* Current Active Regimen */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Active Prescription Regimen</CardTitle>
                  <CardDescription className="text-xs">
                    Current medications approved by attending physician.
                  </CardDescription>
                </div>
                <Badge variant="teal" size="sm">
                  {patient.medications.filter((m) => m.status === "active").length} Active
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                    <tr>
                      <th className="px-6 py-3">Medication Name</th>
                      <th className="px-4 py-3">Dosage & Frequency</th>
                      <th className="px-4 py-3">Indication</th>
                      <th className="px-4 py-3">Prescribed By</th>
                      <th className="px-4 py-3">Prescribed Date</th>
                      <th className="px-6 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {patient.medications.filter((m) => m.status === "active").map((med) => (
                      <tr key={med.id} className="hover:bg-muted/30">
                        <td className="px-6 py-3.5">
                          <span className="font-semibold text-foreground block">{med.name}</span>
                          <span className="text-[11px] text-muted-foreground font-mono">{med.genericName}</span>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-foreground">
                          {med.dosage} • {med.frequency}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-accent font-medium">
                          {med.indication}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {med.prescribedBy}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                          {med.prescribedDate}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <Badge variant="teal" size="sm">Active</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Historical & Discontinued Prescriptions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historical & Discontinued Medications</CardTitle>
              <CardDescription className="text-xs">
                Previously ceased medications with clinical rationale and discontinuation reason.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {patient.medications.filter((m) => m.status !== "active").length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No discontinued or historical medications recorded.
                </p>
              ) : (
                patient.medications.filter((m) => m.status !== "active").map((med) => (
                  <div
                    key={med.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-border p-3.5 text-xs gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground line-through opacity-70">
                          {med.name}
                        </span>
                        <Badge variant="danger" size="sm">Discontinued</Badge>
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        Indication: {med.indication} • Prescriber: {med.prescribedBy}
                      </p>
                      {med.discontinuedReason && (
                        <p className="mt-1 font-medium text-destructive">
                          Reason: {med.discontinuedReason}
                        </p>
                      )}
                    </div>
                    <span className="text-muted-foreground text-[11px] shrink-0">
                      Ceased on {med.discontinuedDate || "Prior encounter"}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ====================================================================
          TAB 4: LABORATORY REPORTS
          ==================================================================== */}
      {activeTab === "labs" && (
        <div className="space-y-6">
          {patient.labReports.length === 0 ? (
            <Card className="py-12 text-center">
              <FileSpreadsheet className="mx-auto size-10 text-muted-foreground" />
              <p className="mt-2 text-sm font-semibold text-foreground">No Laboratory Reports Processed</p>
              <p className="text-xs text-muted-foreground">Upload scanned PDFs or lab images via the READ module.</p>
              <Button
                variant="teal"
                size="sm"
                onClick={() => navigate("/app/reports")}
                className="mt-4"
              >
                Upload Lab Report
              </Button>
            </Card>
          ) : (
            patient.labReports.map((lab) => (
              <Card key={lab.id}>
                <CardHeader className="pb-3 border-b border-border/70">
                  <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base">{lab.testName}</CardTitle>
                        <Badge variant="teal" size="sm">{lab.category}</Badge>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        Facility: {lab.facility} • Specimen Date: {lab.date}
                      </CardDescription>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="navy" size="sm">
                        <Sparkles className="size-3 mr-1 text-accent" />
                        {lab.confidence}
                      </Badge>
                      <Badge variant="success" size="sm">
                        {lab.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <div className="px-6 py-3 bg-muted/20 border-b border-border/70 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="relative size-12 shrink-0 rounded-lg overflow-hidden border border-border shadow-xs bg-card">
                      <img
                        src="https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=200&q=80"
                        alt="Pathology report slip"
                        className="size-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <FileText className="size-3.5 text-accent" />
                        <span>Digitized Diagnostic Document • READ Engine</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Extracted {lab.parameters.length} parameters with zero manual data entry.
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" size="sm" className="hidden sm:inline-flex text-[10px]">
                    200 DPI Scan
                  </Badge>
                </div>

                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                        <tr>
                          <th className="px-6 py-3">Parameter Name</th>
                          <th className="px-4 py-3">Measured Value</th>
                          <th className="px-4 py-3">Biological Reference Interval</th>
                          <th className="px-6 py-3 text-right">Diagnostic Flag</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {lab.parameters.map((param, idx) => (
                          <tr key={idx} className="hover:bg-muted/30">
                            <td className="px-6 py-3.5 font-medium text-foreground text-xs">
                              {param.name}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-xs font-bold text-foreground">
                              {param.value} <span className="text-muted-foreground font-normal">{param.unit}</span>
                            </td>
                            <td className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                              {param.referenceRange} {param.unit}
                            </td>
                            <td className="px-6 py-3.5 text-right">
                              {param.flag === "high" ? (
                                <Badge variant="danger" size="sm">ELEVATED (HIGH)</Badge>
                              ) : param.flag === "low" ? (
                                <Badge variant="warning" size="sm">LOW</Badge>
                              ) : (
                                <Badge variant="success" size="sm">NORMAL</Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* ====================================================================
          TAB 5: CONSULTATIONS
          ==================================================================== */}
      {activeTab === "consultations" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-display text-lg font-bold text-foreground">
                Clinical Encounter History
              </h3>
              <p className="text-xs text-muted-foreground">
                Structured notes captured via AAROGYA MITHRA multilingual ambient scribe (LISTEN).
              </p>
            </div>
            <Button
              variant="teal"
              size="sm"
              onClick={() => navigate("/app/consultations")}
              leftIcon={<Mic className="size-4" />}
            >
              New Consultation Scribe
            </Button>
          </div>

          {patient.consultations.map((con) => (
            <Card key={con.id}>
              <CardHeader className="pb-3 border-b border-border/70">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{con.chiefComplaint}</CardTitle>
                      <Badge variant="teal" size="sm">{con.language}</Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      {con.department} • {con.doctor} • {con.date}
                    </CardDescription>
                  </div>

                  <Badge variant="success" size="sm">
                    <Check className="size-3 mr-1" />
                    Verified by Attending Doctor
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4">
                {/* Formatted SOAP Note */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
                    <span className="font-bold text-accent font-mono">[SUBJECTIVE]</span>
                    <p className="text-foreground leading-relaxed">
                      {con.soapNote.subjective}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
                    <span className="font-bold text-accent font-mono">[OBJECTIVE]</span>
                    <p className="text-foreground leading-relaxed">
                      {con.soapNote.objective}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
                    <span className="font-bold text-accent font-mono">[ASSESSMENT]</span>
                    <p className="text-foreground leading-relaxed">
                      {con.soapNote.assessment}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
                    <span className="font-bold text-accent font-mono">[PLAN & PRESCRIPTION]</span>
                    <p className="text-foreground whitespace-pre-line leading-relaxed">
                      {con.soapNote.plan}
                    </p>
                  </div>
                </div>

                {con.signed && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t border-border pt-3">
                    <span>Electronically signed by {con.signedBy}</span>
                    <span>Timestamp: {con.signedAt}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ====================================================================
          TAB 6: MITHRA SAFETY TIMELINE (CONNECT)
          ==================================================================== */}
      {activeTab === "timeline" && (
        <div className="space-y-6">
          {/* Header Banner & Clinical Context */}
          <div className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-eyebrow">CONNECT MODULE • LONGITUDINAL EHR</span>
                <Badge variant="teal" size="sm" dot>ABHA & FHIR Linked</Badge>
              </div>
              <h3 className="font-display text-xl font-bold text-foreground sm:text-2xl">
                Mithra Safety Timeline
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                Unified cross-encounter longitudinal journey. Automatically connects OPD visits, laboratory pathology, active prescriptions, and critical allergy hard-stops into a chronological clinical record.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { id: "all", label: "All Events" },
                { id: "consultation", label: "Consultations" },
                { id: "medication", label: "Medications" },
                { id: "lab", label: "Lab Reports" },
                { id: "allergy", label: "Allergies" },
                { id: "diagnosis", label: "Diagnoses" },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTimelineFilter(f.id)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold transition-all",
                    timelineFilter === f.id
                      ? "bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground shadow-xs"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Timeline Stream */}
          <div className="relative pl-7 sm:pl-9 before:absolute before:bottom-2 before:left-3 sm:before:left-4 before:top-3 before:w-0.5 before:bg-border/80 space-y-6">
            {filteredTimeline.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-8 text-center text-xs text-muted-foreground">
                No clinical events match the &quot;{timelineFilter}&quot; filter.
              </div>
            ) : (
              filteredTimeline.map((item) => {
                const isAllergy = item.type === "allergy";
                const isConsultation = item.type === "consultation";
                const isLab = item.type === "lab";
                const isMed = item.type === "medication";

                return (
                  <div key={item.id} className="relative group">
                    {/* Node Dot / Icon Badge */}
                    <div
                      className={cn(
                        "absolute -left-[1.85rem] sm:-left-[2.1rem] top-3.5 size-4 rounded-full border-2 border-background ring-4 transition-all duration-300 group-hover:scale-125",
                        isAllergy
                          ? "bg-destructive ring-destructive/25 shadow-sm"
                          : isConsultation
                            ? "bg-teal-500 ring-teal-500/25"
                            : isMed
                              ? "bg-primary dark:bg-teal-300 ring-primary/25"
                              : isLab
                                ? "bg-blue-500 ring-blue-500/25"
                                : "bg-amber-500 ring-amber-500/25",
                      )}
                    />

                    {/* Timeline Event Card */}
                    <div
                      className={cn(
                        "rounded-3xl border bg-card p-5 sm:p-6 transition-all duration-300 hover:shadow-md",
                        isAllergy
                          ? "border-destructive/40 bg-destructive/5 hover:border-destructive/60"
                          : "border-border/90 hover:border-accent/40",
                      )}
                    >
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-display text-base sm:text-lg font-semibold text-foreground">
                            {item.title}
                          </h4>
                          <Badge
                            variant={isAllergy ? "danger" : (item.badgeVariant as any)}
                            size="sm"
                            dot={isAllergy}
                          >
                            {item.type.toUpperCase()}
                          </Badge>
                          {isAllergy && (
                            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-bold text-destructive">
                              SAFEGUARD HARD STOP
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {item.date}
                        </span>
                      </div>

                      <p className="mt-2.5 text-xs sm:text-sm leading-relaxed text-foreground/85">
                        {item.description}
                      </p>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                        <span className="font-medium text-accent flex items-center gap-1.5">
                          <span>Provenance:</span>
                          <span className="font-semibold text-foreground/80">{item.source}</span>
                        </span>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/75">
                          ID: #{item.id} • Verified Record
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: EDIT PATIENT DETAILS
          ==================================================================== */}
      <Modal
        open={isEditModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditError(null);
          }
          setIsEditModalOpen(open);
        }}
        title={`Edit Patient Details — ${patient.id}`}
        description="Update patient demographic information and clinical contact details."
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isSaving}
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="teal"
              size="sm"
              disabled={isSaving}
              onClick={handleEditPatientSubmit}
              leftIcon={<Check className="size-4" />}
            >
              {isSaving ? "Saving Changes..." : "Save Changes"}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleEditPatientSubmit} className="space-y-4">
          {editError && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-xs text-destructive flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{editError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Patient Full Name *
              </label>
              <Input
                placeholder="e.g. Ramesh Kumar"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
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
                value={editForm.age}
                onChange={(e) => setEditForm({ ...editForm, age: e.target.value })}
                className="mt-1"
                min={0}
                max={130}
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
                value={editForm.gender}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    gender: e.target.value as "Male" | "Female" | "Other",
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Blood Group
              </label>
              <select
                value={editForm.bloodGroup}
                onChange={(e) => setEditForm({ ...editForm, bloodGroup: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="O+">O Positive (O+)</option>
                <option value="O-">O Negative (O-)</option>
                <option value="A+">A Positive (A+)</option>
                <option value="A-">A Negative (A-)</option>
                <option value="B+">B Positive (B+)</option>
                <option value="B-">B Negative (B-)</option>
                <option value="AB+">AB Positive (AB+)</option>
                <option value="AB-">AB Negative (AB-)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-foreground">
                Contact Phone *
              </label>
              <Input
                placeholder="e.g. +91 98450 12345"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground">
                Preferred Language
              </label>
              <select
                value={editForm.preferredLanguage}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    preferredLanguage: e.target.value,
                  })
                }
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ)</option>
                <option value="Hindi (हिंदी)">Hindi (हिंदी)</option>
                <option value="English">English</option>
                <option value="Kannada / English">Kannada + English Mix</option>
                <option value="Hindi / English">Hindi + English Mix</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground">
              Address / Residence
            </label>
            <Input
              placeholder="e.g. 12th Cross, Indiranagar, Bengaluru"
              value={editForm.address}
              onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
              className="mt-1"
            />
          </div>

          <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-accent" />
            <span>
              Stable MRN identifier ({patient.id}) and all clinical records, encounters, and allergy safeguards will remain intact.
            </span>
          </div>
        </form>
      </Modal>
    </div>
  );
}

