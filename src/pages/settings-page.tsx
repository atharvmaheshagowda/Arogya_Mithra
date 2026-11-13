import { useState } from "react";
import {
  Bell,
  Check,
  CheckCircle2,
  Cpu,
  Database,
  FileCheck2,
  FileText,
  Globe,
  HardDrive,
  HeartPulse,
  Info,
  Languages,
  Lock,
  Mic,
  Moon,
  Pill,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Sun,
  User,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useTheme } from "@/components/theme-provider";
import { DEMO_DOCTORS, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type SettingsTab = "profile" | "scribe" | "safety" | "abdm" | "system";

export function SettingsPage() {
  const { doctor, updateDoctor, signInAs } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  // Doctor Profile Form State
  const [name, setName] = useState(doctor?.name || "Dr. Anika Rao");
  const [email, setEmail] = useState(doctor?.email || "anika.rao@aarogyamithra.demo");
  const [clinic, setClinic] = useState(doctor?.clinic || "Apollo Hospitals, Bengaluru");
  const [department, setDepartment] = useState(doctor?.department || "General Medicine & Diabetology");
  const [licenseNumber, setLicenseNumber] = useState("KMC-48291-B");
  const [opdRoom, setOpdRoom] = useState("Room 04 • Block B");

  // Multilingual Scribe Settings
  const [primaryLanguage, setPrimaryLanguage] = useState("Kannada (ಕನ್ನಡ)");
  const [enableKannadaLexicon, setEnableKannadaLexicon] = useState(true);
  const [enableHindiLexicon, setEnableHindiLexicon] = useState(true);
  const [preserveNegations, setPreserveNegations] = useState(true);
  const [codeMixingLevel, setCodeMixingLevel] = useState("High (Colloquial mixed dialect)");

  // SAFEGUARD Settings
  const [hardStopOnAnaphylaxis, setHardStopOnAnaphylaxis] = useState(true);
  const [chelationSpacingHours, setChelationSpacingHours] = useState("2");
  const [activeFormularies, setActiveFormularies] = useState<string[]>([
    "CDSCO (India)",
    "BNF 86 (UK)",
  ]);
  const [duplicatePpiAlert, setDuplicatePpiAlert] = useState(true);

  // ABDM & EMR Settings
  const [abdmEnabled, setAbdmEnabled] = useState(true);
  const [fhirVersion, setFhirVersion] = useState("FHIR R4 (ABDM M3 Compliant)");
  const [patientSlipLanguage, setPatientSlipLanguage] = useState("Bilingual (Kannada + English)");

  // Save State
  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);

    setTimeout(() => {
      updateDoctor({
        name,
        email,
        clinic,
        department,
      });

      // Save additional preferences to localStorage
      localStorage.setItem(
        "aarogya-mithra-settings",
        JSON.stringify({
          primaryLanguage,
          enableKannadaLexicon,
          enableHindiLexicon,
          preserveNegations,
          codeMixingLevel,
          hardStopOnAnaphylaxis,
          chelationSpacingHours,
          activeFormularies,
          duplicatePpiAlert,
          abdmEnabled,
          fhirVersion,
          patientSlipLanguage,
          licenseNumber,
          opdRoom,
        }),
      );

      setIsSaving(false);
      toast.success("Preferences Saved", {
        description: `Updated clinical workspace parameters for ${name}.`,
      });
    }, 600);
  };

  const handleSwitchDemoClinician = (id: string) => {
    signInAs(id);
    const target = DEMO_DOCTORS.find((d) => d.id === id);
    if (target) {
      setName(target.name);
      setEmail(target.email);
      setClinic(target.clinic);
      setDepartment(target.department);
      toast.info(`Switched Profile to ${target.name}`, {
        description: `${target.clinic} • ${target.department}`,
      });
    }
  };

  const handleResetDefaults = () => {
    setName("Dr. Anika Rao");
    setEmail("anika.rao@aarogyamithra.demo");
    setClinic("Apollo Hospitals, Bengaluru");
    setDepartment("General Medicine & Diabetology");
    setLicenseNumber("KMC-48291-B");
    setOpdRoom("Room 04 • Block B");
    setPrimaryLanguage("Kannada (ಕನ್ನಡ)");
    setEnableKannadaLexicon(true);
    setEnableHindiLexicon(true);
    setPreserveNegations(true);
    setHardStopOnAnaphylaxis(true);
    setChelationSpacingHours("2");
    setDuplicatePpiAlert(true);
    setAbdmEnabled(true);

    toast.info("Settings Reset", {
      description: "Restored clinical baseline configuration.",
    });
  };

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Top Banner */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-6 shadow-xs sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-eyebrow">SYSTEM Module • Clinical Configuration</span>
            <Badge variant="teal" size="sm" dot>
              Preferences Synced
            </Badge>
          </div>
          <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Workspace Settings &amp; Clinical Preferences
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure physician medical license identity, multilingual speech models, deterministic pharmacology sensitivity, and ABDM health locker gateways.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetDefaults}
            leftIcon={<RotateCcw className="size-3.5" />}
          >
            Reset Defaults
          </Button>
          <Button
            variant="teal"
            size="sm"
            onClick={() => handleSaveProfile()}
            disabled={isSaving}
            leftIcon={<Save className={cn("size-3.5", isSaving && "animate-spin")} />}
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>
      </div>

      {/* Main Grid with Vertical Tabs */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left: Tab Selector Navigation */}
        <div className="lg:col-span-3 space-y-1">
          {[
            {
              id: "profile",
              label: "Doctor Profile & Identity",
              icon: User,
              desc: "Credentials & hospital clinic",
            },
            {
              id: "scribe",
              label: "Multilingual LISTEN Engine",
              icon: Mic,
              desc: "Dialects & negation logic",
            },
            {
              id: "safety",
              label: "SAFEGUARD Safety Gating",
              icon: ShieldCheck,
              desc: "Formularies & allergy matrix",
            },
            {
              id: "abdm",
              label: "ABDM & EMR Export",
              icon: FileCheck2,
              desc: "FHIR R4 & patient care slips",
            },
            {
              id: "system",
              label: "System & Theme",
              icon: HardDrive,
              desc: "Appearance & cache controls",
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={cn(
                  "w-full rounded-xl p-3 text-left transition-all flex items-start gap-3",
                  isSelected
                    ? "bg-accent/10 border border-accent/30 text-accent font-semibold shadow-xs"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <Icon className={cn("size-4.5 mt-0.5 shrink-0", isSelected ? "text-accent" : "text-muted-foreground")} />
                <div>
                  <span className={cn("text-xs block", isSelected ? "text-foreground font-semibold" : "text-muted-foreground")}>
                    {tab.label}
                  </span>
                  <span className="text-[10px] text-muted-foreground line-clamp-1">
                    {tab.desc}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Active Tab Panel */}
        <div className="lg:col-span-9 space-y-6">
          {/* TAB 1: DOCTOR PROFILE */}
          {activeTab === "profile" && (
            <Card className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Physician Profile &amp; Hospital Credentialing
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Information appears on authenticated clinical notes, electronic prescriptions, and ABDM encounter payloads.
                </p>
              </div>

              {/* Demo Clinician Switcher Pills */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Quick Switch Clinician (Demonstration Profiles)
                </span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {DEMO_DOCTORS.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => handleSwitchDemoClinician(d.id)}
                      className={cn(
                        "rounded-xl border p-2.5 text-left transition-all text-xs",
                        doctor?.id === d.id
                          ? "border-accent bg-accent/10 ring-1 ring-accent"
                          : "border-border hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-full bg-primary text-white text-[10px] font-bold">
                          {d.initials}
                        </span>
                        <span className="font-semibold text-foreground truncate">
                          {d.name}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate mt-1">
                        {d.role} • {d.clinic}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Profile Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Attending Doctor Name *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Anika Rao"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. anika.rao@aarogyamithra.demo"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Medical Registration / License Number
                    </label>
                    <Input
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. KMC-48291-B"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Specialty &amp; Department
                    </label>
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. General Internal Medicine"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Hospital / Clinic Facility
                    </label>
                    <Input
                      value={clinic}
                      onChange={(e) => setClinic(e.target.value)}
                      placeholder="e.g. Apollo Hospitals, Bengaluru"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      OPD Cabin / Room Allocation
                    </label>
                    <Input
                      value={opdRoom}
                      onChange={(e) => setOpdRoom(e.target.value)}
                      placeholder="e.g. Room 04 • Block B"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border">
                  <Button
                    variant="teal"
                    size="sm"
                    type="submit"
                    disabled={isSaving}
                    leftIcon={<Check className="size-3.5" />}
                  >
                    Update Doctor Profile
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* TAB 2: MULTILINGUAL SCRIBE (LISTEN) */}
          {activeTab === "scribe" && (
            <Card className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Multilingual Ambient Scribe Settings (LISTEN Module)
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure dialect recognition phonemes, Indian colloquial symptom dictionaries, and clinical negation anchors.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    Primary OPD Consultation Dialect
                  </label>
                  <select
                    value={primaryLanguage}
                    onChange={(e) => setPrimaryLanguage(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <option value="Kannada (ಕನ್ನಡ)">Kannada (ಕನ್ನಡ) — Bengaluru/Mysuru Urban &amp; Rural</option>
                    <option value="Hindi (हिंदी)">Hindi (हिंदी) — Northern &amp; Central Regional</option>
                    <option value="Indian English">Indian English — Clinical Standard</option>
                    <option value="Code-Mixed (ಕನ್ನಡ + English)">Code-Mixed (ಕನ್ನಡ + English)</option>
                    <option value="Hinglish (हिंदी + English)">Hinglish (हिंदी + English)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-foreground">
                    Code-Mixing Comprehension Sensitivity
                  </label>
                  <select
                    value={codeMixingLevel}
                    onChange={(e) => setCodeMixingLevel(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    <option value="High (Colloquial mixed dialect)">High (Seamlessly decode Kannada/Hindi mixed with English medical words)</option>
                    <option value="Standard">Standard (Balanced phonetic mapping)</option>
                    <option value="Strict">Strict (Prefer single dominant language)</option>
                  </select>
                </div>

                <div className="space-y-3 pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Regional Clinical Vocabulary Lexicons
                  </span>

                  <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={enableKannadaLexicon}
                      onChange={(e) => setEnableKannadaLexicon(e.target.checked)}
                      className="mt-0.5 size-4 rounded accent-accent"
                    />
                    <div>
                      <span className="font-semibold text-foreground block">
                        Kannada Medical Colloquial Lexicon
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Translates vernacular phrases like &ldquo;Hotte uri&rdquo; (burning stomach) &rarr; Acid Dyspepsia, &ldquo;Tale suttiro hage&rdquo; &rarr; Vertigo, &ldquo;Usirata kasta&rdquo; &rarr; Dyspnea.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-border p-3 cursor-pointer hover:bg-muted/30">
                    <input
                      type="checkbox"
                      checked={enableHindiLexicon}
                      onChange={(e) => setEnableHindiLexicon(e.target.checked)}
                      className="mt-0.5 size-4 rounded accent-accent"
                    />
                    <div>
                      <span className="font-semibold text-foreground block">
                        Hindi / Hinglish Medical Colloquial Lexicon
                      </span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Translates &ldquo;Chhati mein jalan&rdquo; &rarr; Retrosternal burning, &ldquo;Ghabrahat&rdquo; &rarr; Palpitations, &ldquo;Pait phoolna&rdquo; &rarr; Abdominal distension.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preserveNegations}
                      onChange={(e) => setPreserveNegations(e.target.checked)}
                      className="mt-0.5 size-4 rounded accent-accent"
                    />
                    <div>
                      <span className="font-semibold text-accent block">
                        Mandatory Negation Preservation Shield
                      </span>
                      <p className="text-[11px] text-foreground/80 mt-0.5">
                        Guarantees patient denials (&ldquo;No chest pain&rdquo;, &ldquo;Vomiting absent&rdquo;, &ldquo;Illilla&rdquo;) are explicitly flagged and never hallucinated as active symptoms.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 3: SAFEGUARD SAFETY GATING */}
          {activeTab === "safety" && (
            <Card className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  SAFEGUARD Deterministic Safety Gating
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Pharmacopeia formularies, allergy cross-reactivity trees, and contraindication gating rules.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <label className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hardStopOnAnaphylaxis}
                    onChange={(e) => setHardStopOnAnaphylaxis(e.target.checked)}
                    className="mt-0.5 size-4 rounded accent-destructive"
                  />
                  <div>
                    <span className="font-semibold text-destructive flex items-center gap-1.5">
                      <ShieldAlert className="size-4" />
                      Hard-Stop Block on Documented Anaphylaxis
                    </span>
                    <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed">
                      Prohibits generation of order slips containing beta-lactams (Penicillin, Amoxicillin) or severe NSAIDs for patients with confirmed anaphylaxis records until manually overridden with written rationale.
                    </p>
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Fluoroquinolone / Antacid Chelation Spacing Threshold
                    </label>
                    <select
                      value={chelationSpacingHours}
                      onChange={(e) => setChelationSpacingHours(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <option value="2">2 Hours Minimum Spacing (BNF 86 Standard)</option>
                      <option value="4">4 Hours Strict Spacing (Severe Impairment)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Therapeutic Duplication Alert
                    </label>
                    <select
                      value={duplicatePpiAlert ? "true" : "false"}
                      onChange={(e) => setDuplicatePpiAlert(e.target.value === "true")}
                      className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <option value="true">Active (Flag concurrent dual PPIs/Statins)</option>
                      <option value="false">Mute (Allow multi-agent overlap)</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Active Regulatory Formularies in SAFEGUARD Engine
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="teal" size="sm">Central Drugs Standard Control Organisation (CDSCO)</Badge>
                    <Badge variant="teal" size="sm">British National Formulary (BNF 86)</Badge>
                    <Badge variant="navy" size="sm">National Formulary of India (NFI)</Badge>
                    <Badge variant="outline" size="sm">US FDA Orange Book</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    14,280 deterministic molecule interaction rules loaded in offline-ready in-memory database.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 4: ABDM & EMR EXPORT */}
          {activeTab === "abdm" && (
            <Card className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  Ayushman Bharat Digital Mission (ABDM) &amp; EMR Integration
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  FHIR R4 diagnostic report bundles, ABHA Health Locker sync, and patient vernacular print slips.
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <label className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/5 p-3.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={abdmEnabled}
                    onChange={(e) => setAbdmEnabled(e.target.checked)}
                    className="mt-0.5 size-4 rounded accent-accent"
                  />
                  <div>
                    <span className="font-semibold text-accent flex items-center gap-1.5">
                      <Globe className="size-4" />
                      ABDM Milestone M3 Health Information Provider (HIP) Gateway
                    </span>
                    <p className="text-[11px] text-foreground/80 mt-1 leading-relaxed">
                      Automatically serialize signed outpatient encounters into encrypted FHIR diagnostic report bundles and publish to patient&apos;s ABHA Personal Health Record (PHR).
                    </p>
                  </div>
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      FHIR Data Format Standard
                    </label>
                    <Input value={fhirVersion} disabled className="bg-muted text-muted-foreground" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-foreground">
                      Patient Discharge Care Slip Translation
                    </label>
                    <select
                      value={patientSlipLanguage}
                      onChange={(e) => setPatientSlipLanguage(e.target.value)}
                      className="h-9 w-full rounded-lg border border-border bg-card px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      <option value="Bilingual (Kannada + English)">Bilingual (Kannada + English)</option>
                      <option value="Bilingual (Hindi + English)">Bilingual (Hindi + English)</option>
                      <option value="English Only">English Only</option>
                    </select>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* TAB 5: SYSTEM & APPEARANCE */}
          {activeTab === "system" && (
            <Card className="p-6 space-y-6">
              <div className="border-b border-border pb-4">
                <h3 className="font-display text-lg font-bold text-foreground">
                  System Preferences &amp; Workspace Theme
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Visual theme switching, mock consultation caching, and demonstration sandbox options.
                </p>
              </div>

              <div className="space-y-5 text-xs">
                {/* Theme Selector */}
                <div className="space-y-2">
                  <span className="text-[11px] font-semibold text-foreground block">
                    Interface Theme Mode
                  </span>
                  <div className="grid grid-cols-2 gap-3 max-w-sm">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "rounded-xl border p-3 flex items-center gap-2.5 text-xs font-semibold transition-all",
                        theme === "light"
                          ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Sun className="size-4" />
                      <span>Clinical Light</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "rounded-xl border p-3 flex items-center gap-2.5 text-xs font-semibold transition-all",
                        theme === "dark"
                          ? "border-accent bg-accent/10 text-accent ring-1 ring-accent"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <Moon className="size-4" />
                      <span>Midnight Navy</span>
                    </button>
                  </div>
                </div>

                {/* Storage & Cache Management */}
                <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-foreground block">
                        Demonstration Storage Cache
                      </span>
                      <p className="text-[11px] text-muted-foreground">
                        Clear local session storage to restore original synthetic patient visits and diagnostic reports.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={() => {
                        localStorage.clear();
                        toast.success("Local Cache Purged", {
                          description: "Restored clean state for next evaluation run.",
                        });
                      }}
                    >
                      Purge Cache
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
