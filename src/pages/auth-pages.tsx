import { useState, type FormEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Hospital,
  Info,
  KeyRound,
  LockKeyhole,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AarogyaMithraBrand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField, Select } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeSwitcher } from "@/components/theme-provider";
import { DEMO_DOCTORS, useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

function DoctorAvatar({ doc }: { doc: (typeof DEMO_DOCTORS)[number] }) {
  const [imgError, setImgError] = useState(false);
  if (!doc.avatar || imgError) {
    return (
      <span className="grid size-full place-items-center bg-teal-500/15 text-teal-700 dark:text-teal-300 font-bold text-xs">
        {doc.initials}
      </span>
    );
  }
  return (
    <img
      src={doc.avatar}
      alt={doc.name}
      onError={() => setImgError(true)}
      className="size-full object-cover"
    />
  );
}

function AuthFrame({
  children,
  badgeText = "Clinical Intelligence • Human Oversight",
}: {
  children: ReactNode;
  badgeText?: string;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      {/* Editorial Left Hero Panel with Deep Atlantic and Electric Jade aura */}
      <section className="relative hidden overflow-hidden bg-[#102B3F] p-12 xl:p-16 text-white lg:flex lg:flex-col justify-between">
        {/* Real Clinical Context Background Photography with Deep Tint */}
        <div className="pointer-events-none absolute inset-0 z-0 select-none">
          <img
            src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=1400&q=80"
            alt="Modern Outpatient Clinical Care"
            className="w-full h-full object-cover opacity-15 filter saturate-50"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 surface-dots opacity-20 z-0" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 size-[480px] rounded-full bg-[#00A889]/20 blur-[130px] z-0" />

        <div className="relative z-10">
          <Link to="/" className="inline-block" aria-label="Go to Home">
            <AarogyaMithraBrand inverted showSubtitle />
          </Link>
        </div>

        <div className="relative my-auto max-w-lg space-y-6 z-10">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00A889]/40 bg-[#00A889]/15 px-3.5 py-1.5 text-xs font-semibold text-[#00A889] backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#00A889] animate-pulse" />
              <span className="tracking-wider uppercase text-white font-medium">{badgeText}</span>
            </span>
          </div>

          <h1 className="font-sans text-4xl sm:text-5xl font-bold leading-[1.08] tracking-[-0.03em] !text-white">
            The workspace for considered clinical care.
          </h1>

          <p className="max-w-md text-base leading-relaxed text-white/90 font-normal">
            AAROGYA MITHRA connects ambient consultation scribing, medical report OCR, and drug interaction safeguards into one calm, doctor-led OPD workflow.
          </p>

          <div className="rounded-2xl border border-white/15 bg-white/10 p-5 text-xs text-white/90 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2 text-[#00A889] font-semibold text-sm">
              <ShieldCheck className="size-4" />
              <span>National Medical Commission (NMC) Node</span>
            </div>
            <p className="text-white/80 leading-relaxed text-xs">
              Secured with TLS 1.3 encryption and cryptographic clinician tokens. Every prescription and consultation sign-off is logged into the EHR hospital audit registry.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/70 pt-6 border-t border-white/10 z-10 font-medium">
          <span>AI assists the doctor. The doctor makes the decision.</span>
          <span className="font-mono text-white/80">ABDM / EHR Validated Node</span>
        </div>
      </section>

      {/* Auth Interaction Panel: Clean Top Header, Centered Content, and No Overflow Clashing */}
      <section className="relative flex flex-col justify-between bg-background min-h-screen overflow-y-auto">
        {/* Top Navigation Bar: Symmetrically aligned on both mobile & desktop */}
        <header className="w-full px-4 sm:px-8 lg:px-10 py-4 sm:py-6 flex items-center justify-between border-b border-border/40 lg:border-none shrink-0 z-20">
          {/* Top Left: Back Navigation Link + Compact Brand on Mobile */}
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-foreground transition-all shadow-xs group"
              aria-label="Back to Aarogya Mithra Home"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 text-accent" />
              <span className="hidden sm:inline">Back to Home</span>
              <span className="sm:hidden font-medium">Home</span>
            </Link>
            <div className="lg:hidden pl-1">
              <AarogyaMithraBrand compact />
            </div>
          </div>

          {/* Top Right: Status Badge & Theme Switcher */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <span className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-semibold text-accent">
              <span className="size-1.5 rounded-full bg-accent animate-pulse" />
              NMC Secure Node
            </span>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Center Card Content: Perfectly centered with natural padding and smooth scrolling */}
        <div className="w-full flex-1 flex flex-col items-center justify-center px-4 py-6 sm:py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Minimal Clinical Footer */}
        <footer className="w-full px-4 sm:px-8 py-3.5 text-center text-[11px] text-muted-foreground/60 shrink-0">
          Aarogya Mithra • Licensed OPD Provider Network • 256-Bit TLS Audit Log
        </footer>
      </section>
    </main>
  );
}

function PasswordInput({
  value,
  onChange,
  disabled = false,
  placeholder = "Enter password (e.g. doctor@2026)",
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        disabled={disabled}
        minLength={6}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        disabled={disabled}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-50"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* ==========================================================================
   1. LOGIN PAGE — REAL AUTHENTICATION
   ========================================================================== */

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInAs } = useAuth();

  // Controlled credentials with pre-filled default for convenient testing
  const [email, setEmail] = useState("maya.shah@aarogyamithra.in");
  const [password, setPassword] = useState("doctor@2026");
  const [rememberMe, setRememberMe] = useState(true);

  // Authentication submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    const result = await signIn(email, password, rememberMe);

    if (result.success) {
      navigate("/app");
    } else {
      setAuthError(result.error || "Authentication failed. Please verify your physician credentials.");
      setIsSubmitting(false);
    }
  };

  const handleQuickPreset = async (presetId: string) => {
    setAuthError(null);
    setIsSubmitting(true);
    const result = await signInAs(presetId);
    if (result.success) {
      navigate("/app");
    } else {
      setAuthError("Failed to authenticate preset. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFrame badgeText="PHYSICIAN SIGN IN • OPD WORKSPACE">
      <Card className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-black/5 space-y-6">
        <CardHeader className="p-0">
          <div className="flex items-center justify-between mb-3">
            <div className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
              <LockKeyhole className="size-5" />
            </div>
            <Badge variant="teal" size="sm" className="text-[10px] font-semibold tracking-wider uppercase">
              Physician Access
            </Badge>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-foreground">
            Sign in to Workspace
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Enter your certified clinician email and password to access the OPD copilot.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 space-y-5">
          {/* Real Authentication Error Alert */}
          {authError && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Authentication Error</span>
                <span className="text-[11px] leading-relaxed opacity-90">{authError}</span>
              </div>
            </div>
          )}

          {/* Credential Helper Hint Banner */}
          <div className="rounded-xl border border-teal-500/30 bg-teal-500/10 p-3 text-xs text-teal-800 dark:text-teal-200 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <KeyRound className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="text-[11px]">
                <strong className="font-semibold">Demo Pass:</strong> <code className="font-mono bg-teal-500/20 px-1 py-0.5 rounded">doctor@2026</code>
              </span>
            </div>
            <Badge variant="teal" size="sm" className="text-[10px]">
              Verified Attending
            </Badge>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField label="Clinician Email Address" required>
              <Input
                type="email"
                value={email}
                disabled={isSubmitting}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (authError) setAuthError(null);
                }}
                placeholder="doctor@hospital.org"
                required
              />
            </FormField>

            <FormField label="Password" required>
              <PasswordInput
                value={password}
                disabled={isSubmitting}
                onChange={(val) => {
                  setPassword(val);
                  if (authError) setAuthError(null);
                }}
              />
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  disabled={isSubmitting}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-input accent-accent"
                />
                Remember this hospital terminal
              </label>
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => {
                  setPassword("doctor@2026");
                  setAuthError(null);
                }}
              >
                Reset demo password
              </button>
            </div>

            <Button
              type="submit"
              variant="teal"
              size="lg"
              disabled={isSubmitting}
              className="w-full mt-2"
              leftIcon={isSubmitting ? <RefreshCw className="size-4 animate-spin" /> : undefined}
              rightIcon={!isSubmitting ? <ArrowRight className="size-4" /> : undefined}
            >
              {isSubmitting ? "Verifying Medical Credentials..." : "Sign In as Clinician"}
            </Button>
          </form>

          {/* Certified Clinician One-Click Presets */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold uppercase tracking-wider text-muted-foreground">
                Attending Physician Roster
              </span>
              <span className="text-muted-foreground/70">1-Click Fast Access</span>
            </div>

            <div className="grid gap-2">
              {DEMO_DOCTORS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => {
                    setEmail(doc.email);
                    setPassword("doctor@2026");
                    handleQuickPreset(doc.id);
                  }}
                  className="group flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-2.5 text-left text-xs transition-all hover:border-accent/40 hover:bg-card hover:shadow-xs disabled:opacity-50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-8 shrink-0 rounded-lg overflow-hidden border border-border shadow-2xs">
                      <DoctorAvatar doc={doc} />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                        {doc.name}
                        {doc.nmcNumber && (
                          <span className="font-mono text-[9.5px] text-muted-foreground font-normal">
                            ({doc.nmcNumber.split("-")[0]})
                          </span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {doc.role} • {doc.department}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground group-hover:text-accent transition-transform group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Need a custom clinic profile?{" "}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              Register here
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}

/* ==========================================================================
   2. REGISTRATION PAGE — REAL CLINICIAN ENROLLMENT
   ========================================================================== */

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    clinic: "Apollo Hospitals OPD, Bengaluru",
    role: "Consultant Physician",
    department: "General Medicine",
    nmcNumber: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setRegError(null);
    setIsSubmitting(true);

    const result = await register({
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      clinic: form.clinic.trim(),
      role: form.role,
      department: form.department,
      nmcNumber: form.nmcNumber.trim(),
    });

    if (result.success) {
      navigate("/app");
    } else {
      setRegError(result.error || "Registration failed. Please check form inputs.");
      setIsSubmitting(false);
    }
  };

  return (
    <AuthFrame badgeText="CLINICIAN ENROLLMENT • HOSPITAL NETWORK">
      <Card className="rounded-3xl border border-border/80 bg-card/95 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-black/5 space-y-6">
        <CardHeader className="p-0">
          <div className="flex items-center justify-between mb-3">
            <div className="grid size-11 place-items-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
              <Stethoscope className="size-5" />
            </div>
            <Badge variant="teal" size="sm" className="text-[10px] font-semibold tracking-wider uppercase">
              New Enrollment
            </Badge>
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-sans font-bold tracking-tight text-foreground">Create Doctor Workspace</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            Register your clinical profile with hospital institution and medical council license credentials.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {regError && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Registration Error</span>
                <span className="text-[11px] leading-relaxed opacity-90">{regError}</span>
              </div>
            </div>
          )}

          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Doctor Full Name" required>
                <Input
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="Dr. Rajesh Varma"
                />
              </FormField>

              <FormField label="NMC / Medical Council Reg. #">
                <Input
                  value={form.nmcNumber}
                  onChange={(event) => set("nmcNumber", event.target.value)}
                  disabled={isSubmitting}
                  placeholder="e.g. KMC-64019-IND"
                />
              </FormField>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Clinical Email Address" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                  required
                  disabled={isSubmitting}
                  placeholder="rajesh.varma@apollo.org"
                />
              </FormField>

              <FormField label="Password" required>
                <PasswordInput
                  value={form.password}
                  disabled={isSubmitting}
                  placeholder="Min 6 characters"
                  onChange={(val) => set("password", val)}
                />
              </FormField>
            </div>

            <FormField label="Hospital / OPD Clinic" required>
              <Input
                value={form.clinic}
                onChange={(event) => set("clinic", event.target.value)}
                required
                disabled={isSubmitting}
                placeholder="e.g. Apollo Specialty OPD, Bengaluru"
              />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Professional Role">
                <Select
                  value={form.role}
                  disabled={isSubmitting}
                  onChange={(event) => set("role", event.target.value)}
                >
                  <option>Consultant Physician</option>
                  <option>Senior Consultant</option>
                  <option>Resident Medical Officer</option>
                  <option>Clinical Pharmacologist</option>
                  <option>Chief of Medicine</option>
                </Select>
              </FormField>

              <FormField label="Department">
                <Select
                  value={form.department}
                  disabled={isSubmitting}
                  onChange={(event) => set("department", event.target.value)}
                >
                  <option>General Medicine</option>
                  <option>Cardiology &amp; HTN</option>
                  <option>Endocrinology &amp; Diabetes</option>
                  <option>Pediatrics</option>
                  <option>Pulmonology</option>
                </Select>
              </FormField>
            </div>

            <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
              <ShieldCheck className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                Issues an ABDM-compliant physician JWT session. Your clinical notes will automatically reflect this credentials signature.
              </span>
            </div>

            <Button
              type="submit"
              variant="teal"
              size="lg"
              disabled={isSubmitting}
              className="mt-1 w-full"
              leftIcon={isSubmitting ? <RefreshCw className="size-4 animate-spin" /> : undefined}
              rightIcon={!isSubmitting ? <ArrowRight className="size-4" /> : undefined}
            >
              {isSubmitting ? "Registering Clinician..." : "Initialize Doctor Workspace"}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already have a doctor profile?{" "}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
