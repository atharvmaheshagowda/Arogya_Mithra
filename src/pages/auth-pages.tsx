import { useState, type FormEvent, type ReactNode } from "react";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AarogyaMithraBrand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, FormField, Select } from "@/components/ui/input";
import { ThemeSwitcher } from "@/components/theme-provider";
import { useAuth } from "@/lib/auth";

function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      {/* Editorial Left Hero Panel */}
      <section className="relative hidden overflow-hidden bg-[#102A43] p-12 text-white lg:flex lg:flex-col justify-between">
        <div className="absolute inset-0 surface-dots opacity-20" />
        <div className="relative">
          <AarogyaMithraBrand className="!text-white" showSubtitle />
        </div>

        <div className="relative my-auto max-w-lg">
          <p className="text-eyebrow !text-teal-300">Clinical Intelligence • Human Oversight</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.02] tracking-tight !text-white">
            The workspace for considered clinical care.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-white/75">
            AAROGYA MITHRA brings consultations, context synthesis, and medication safeguards into one calm, doctor-led workflow.
          </p>

          <div className="mt-10 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 text-sm text-white/80 backdrop-blur-sm">
            <CheckCircle2 className="size-5 text-teal-400 shrink-0" />
            <span>Prototype environment — no patient data leaves this session.</span>
          </div>
        </div>

        <p className="relative text-xs text-white/50">
          AI clinical decision support does not replace licensed medical judgment.
        </p>
      </section>

      {/* Auth Interaction Panel */}
      <section className="relative flex items-center justify-center bg-background p-5 sm:p-8">
        <div className="absolute right-5 top-5">
          <ThemeSwitcher />
        </div>
        <div className="w-full max-w-md">{children}</div>
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
        placeholder="At least 8 characters"
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

export function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    signIn(email);
    navigate("/app");
  };

  return (
    <AuthFrame>
      <div className="mb-8 lg:hidden">
        <AarogyaMithraBrand showSubtitle />
      </div>

      <Card className="border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-lg">
        <CardHeader className="px-0 sm:px-6">
          <div className="mb-3 grid size-11 place-items-center rounded-xl bg-accent/10 text-accent dark:bg-accent/20">
            <LockKeyhole className="size-5" />
          </div>
          <CardTitle className="text-3xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your AAROGYA MITHRA clinical copilot workspace.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 sm:px-6">
          <form className="space-y-4" onSubmit={submit}>
            <FormField label="Email address" required>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                placeholder="doctor@hospital.org"
              />
            </FormField>

            <FormField label="Password" required>
              <PasswordInput value={password} onChange={setPassword} />
            </FormField>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer text-xs">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-accent"
                />
                Remember me
              </label>
              <button type="button" className="text-xs font-semibold text-accent hover:underline">
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              rightIcon={<ArrowRight className="size-4" />}
            >
              Sign in to Workspace
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-full"
              onClick={() => {
                signIn("");
                navigate("/app");
              }}
            >
              Try Instant Demo (Dr. Anika Rao)
            </Button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            New to AAROGYA MITHRA?{" "}
            <Link to="/register" className="font-semibold text-accent hover:underline">
              Create an account
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    clinic: "",
    role: "Physician",
  });

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    register({
      name: form.name,
      email: form.email,
      clinic: form.clinic,
      role: form.role,
    });
    navigate("/app");
  };

  return (
    <AuthFrame>
      <div className="mb-8 lg:hidden">
        <AarogyaMithraBrand showSubtitle />
      </div>

      <Card className="border-0 bg-transparent shadow-none sm:border sm:bg-card sm:shadow-lg">
        <CardHeader className="px-0 sm:px-6">
          <CardTitle className="text-3xl">Create clinical profile</CardTitle>
          <CardDescription>
            Configure your mock doctor profile for this hackathon prototype.
          </CardDescription>
        </CardHeader>

        <CardContent className="px-0 sm:px-6">
          <form className="grid gap-3.5" onSubmit={submit}>
            <FormField label="Doctor Full Name" required>
              <Input
                value={form.name}
                onChange={(event) => set("name", event.target.value)}
                required
                placeholder="Dr. Maya Shah"
              />
            </FormField>

            <FormField label="Email address" required>
              <Input
                type="email"
                value={form.email}
                onChange={(event) => set("email", event.target.value)}
                required
                placeholder="maya@cityhospital.in"
              />
            </FormField>

            <FormField label="Password" required>
              <PasswordInput value={form.password} onChange={(val) => set("password", val)} />
            </FormField>

            <FormField label="Hospital / OPD Clinic" required>
              <Input
                value={form.clinic}
                onChange={(event) => set("clinic", event.target.value)}
                required
                placeholder="Apollo Specialty OPD / Northstar Clinic"
              />
            </FormField>

            <FormField label="Professional Role">
              <Select
                value={form.role}
                onChange={(event) => set("role", event.target.value)}
              >
                <option>Consultant Physician (General Medicine)</option>
                <option>Cardiologist</option>
                <option>Diabetologist / Endocrinologist</option>
                <option>Pediatrician</option>
                <option>Resident Medical Officer</option>
                <option>Clinical Pharmacist</option>
              </Select>
            </FormField>

            <Button
              type="submit"
              variant="teal"
              size="lg"
              className="mt-2 w-full"
              rightIcon={<ArrowRight className="size-4" />}
            >
              Create Mock Workspace
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-accent hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthFrame>
  );
}
