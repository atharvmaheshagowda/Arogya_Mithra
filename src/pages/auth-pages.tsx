import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Hospital,
  Info,
  LockKeyhole,
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
            <AarogyaMithraBrand className="!text-white" showSubtitle />
          </Link>
        </div>

        <div className="relative my-auto max-w-lg space-y-6 z-10">
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#00A889]/40 bg-[#00A889]/15 px-3.5 py-1.5 text-xs font-semibold text-[#00A889] backdrop-blur-md">
              <span className="size-2 rounded-full bg-[#00A889] animate-pulse" />
              <span className="tracking-wider uppercase text-white font-medium">{badgeText}</span>
            </span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-semibold leading-[1.05] tracking-tight !text-white">
            The workspace for considered clinical care.
          </h1>

          <p className="max-w-md text-base leading-relaxed text-white/80 font-normal">
            AAROGYA MITHRA connects ambient consultation scribing, medical report OCR, and drug interaction safeguards into one calm, doctor-led OPD workflow.
          </p>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/85 backdrop-blur-md space-y-2">
            <div className="flex items-center gap-2 text-[#00A889] font-semibold">
              <ShieldCheck className="size-4" />
              <span>Hackathon Prototype Notice</span>
            </div>
            <p className="text-white/70 leading-relaxed">
              This prototype utilizes mock authentication and synthetic clinical datasets. No real physician credentials or live patient PHI are required or transmitted.
            </p>
          </div>
        </div>

        <div className="relative flex items-center justify-between text-xs text-white/60 pt-6 border-t border-white/10 z-10">
          <span>AI assists the doctor. The doctor makes the decision.</span>
          <span className="font-mono">v0.1.0 Prototype</span>
        </div>
      </section>

      {/* Auth Interaction Panel */}
      <section className="relative flex flex-col items-center justify-center bg-background px-4 py-8 sm:p-10 min-h-screen">
        {/* Top Navigation Bar: Mobile/Tablet Brand on Left, Actions on Right */}
        <div className="w-full max-w-md lg:max-w-none lg:absolute lg:top-6 lg:left-8 lg:right-8 flex items-center justify-between mb-8 lg:mb-0">
          <div className="lg:hidden">
            <Link to="/" className="inline-flex items-center" aria-label="Go to Home">
              <AarogyaMithraBrand showSubtitle={false} />
            </Link>
          </div>
          <div className="hidden lg:block">
            {/* Empty placeholder on desktop to keep justify-between layout clean */}
          </div>
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            <ThemeSwitcher />
            <Link
              to="/"
              className="rounded-full border border-border/80 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-foreground transition-all shadow-xs"
            >
              Back to Home
            </Link>
          </div>
        </div>

        <div className="w-full max-w-md my-auto">{children}</div>
      </section>
    </main>
  );
}

function PasswordInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        minLength={8}
        placeholder="Enter password (e.g. demo1234)"
        className="pr-10"
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}

/* ==========================================================================
   1. LOGIN PAGE
   ========================================================================== */

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signInAs } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [rememberMe, setRememberMe] = useState(true);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    signIn(email || DEMO_DOCTORS[0].email);
    navigate("/app");
  };

  const handleQuickDemo = (presetId: string) => {
    signInAs(presetId);
    navigate("/app");
  };

  return (
    <AuthFrame badgeText="PHYSICIAN SIGN IN • OPD WORKSPACE">
      <Card className="border-0 bg-transparent shadow-none sm:border sm:border-border/80 sm:bg-card sm:p-2 sm:shadow-xl rounded-3xl">
        <CardHeader className="px-0 sm:px-6">
          <div className="mb-2 grid size-11 place-items-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
            <LockKeyhole className="size-5" />
          </div>
          <CardTitle className="text-3xl">Sign in to Workspace</CardTitle>
          <CardDescription>
            Enter your credentials or choose a pre-configured doctor demo profile.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 sm:px-6 space-y-6">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField label="Email address" required>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="doctor@hospital.org"
              />
            </FormField>

            <FormField label="Password" required>
              <PasswordInput value={password} onChange={setPassword} />
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="size-4 rounded border-input accent-accent"
                />
                Remember this terminal
              </label>
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => alert("Prototype mode: Use any demo password or click 'Instant Demo Doctor' below.")}
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="teal"
              size="lg"
              className="w-full mt-2"
              rightIcon={<ArrowRight className="size-4" />}
            >
              Sign In as Clinician
            </Button>
          </form>

          {/* Quick Demo Presets */}
          <div className="space-y-2.5 pt-2 border-t border-border/80">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block text-center">
              Or Instant Demo Presets (1-Click)
            </span>

            <div className="grid gap-2">
              {DEMO_DOCTORS.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => handleQuickDemo(doc.id)}
                  className="group flex items-center justify-between rounded-xl border border-border/80 bg-muted/30 p-2.5 text-left text-xs transition-all hover:border-accent/40 hover:bg-card hover:shadow-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-7 place-items-center rounded-lg bg-accent/15 text-accent font-bold text-[11px]">
                      {doc.initials}
                    </span>
                    <div>
                      <p className="font-semibold text-foreground group-hover:text-accent transition-colors">
                        {doc.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{doc.role} • {doc.clinic}</p>
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
   2. REGISTRATION PAGE
   ========================================================================== */

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    clinic: "",
    role: "Consultant Physician",
    department: "General OPD",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    register({
      name: form.name || "Dr. Maya Shah",
      email: form.email || "maya.shah@clinic.in",
      clinic: form.clinic || "Apex Speciality Clinic",
      role: form.role,
      department: form.department,
    });
    navigate("/app");
  };

  return (
    <AuthFrame badgeText="CLINICIAN PROFILE CREATION • PROTOTYPE">
      <Card className="border-0 bg-transparent shadow-none sm:border sm:border-border/80 sm:bg-card sm:p-2 sm:shadow-xl rounded-3xl">
        <CardHeader className="px-0 sm:px-6">
          <div className="mb-2 grid size-11 place-items-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
            <Stethoscope className="size-5" />
          </div>
          <CardTitle className="text-3xl">Create Doctor Workspace</CardTitle>
          <CardDescription>
            Set up your physician profile for this hackathon session. No real identity verification is performed.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 sm:px-6">
          <form className="grid gap-3.5" onSubmit={handleSubmit}>
            <FormField label="Doctor Full Name" required>
              <Input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                required
                placeholder="Dr. Maya Shah"
              />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Email Address" required>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(event) => set("email", event.target.value)}
                  required
                  placeholder="maya@clinic.in"
                />
              </FormField>

              <FormField label="Password" required>
                <PasswordInput
                  value={form.password}
                  onChange={(val) => set("password", val)}
                />
              </FormField>
            </div>

            <FormField label="Hospital / OPD Clinic" required>
              <Input
                value={form.clinic}
                onChange={(event) => set("clinic", event.target.value)}
                required
                placeholder="e.g. Apollo Specialty OPD, Bengaluru"
              />
            </FormField>

            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Professional Role">
                <Select
                  value={form.role}
                  onChange={(event) => set("role", event.target.value)}
                >
                  <option>Consultant Physician</option>
                  <option>Senior Specialist</option>
                  <option>Resident Medical Officer</option>
                  <option>Clinical Pharmacologist</option>
                  <option>Chief of Medicine</option>
                </Select>
              </FormField>

              <FormField label="Department">
                <Select
                  value={form.department}
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
              <Info className="size-4 text-accent shrink-0 mt-0.5" />
              <span>
                Mock profile stored locally. Instantly navigates to your personalized OPD dashboard upon creation.
              </span>
            </div>

            <Button
              type="submit"
              variant="teal"
              size="lg"
              className="mt-1 w-full"
              rightIcon={<ArrowRight className="size-4" />}
            >
              Initialize Workspace
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already have a test profile?{" "}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
