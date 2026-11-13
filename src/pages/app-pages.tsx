import { Activity, ArrowRight, FileText, ShieldCheck, Users, Plus, CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard, ClinicalCalloutCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";

const pageContent: Record<string, { title: string; description: string; label: string }> = {
  "/app/patients": {
    title: "Patient Context Panel",
    description: "Search, connect, and synthesize longitudinal records across outpatient visits, lab reports, and medication histories.",
    label: "Register New Patient",
  },
  "/app/consultations": {
    title: "Consultation Scribe (LISTEN)",
    description: "Ambient doctor-patient consultation capture supporting Kannada, Hindi, and English with code-mixing awareness.",
    label: "Start New Consultation",
  },
  "/app/reports": {
    title: "Medical Report Intelligence (READ)",
    description: "Ingest laboratory reports, previous prescriptions, and external diagnostic records with confidence scoring.",
    label: "Upload Clinical Document",
  },
  "/app/medication-safety": {
    title: "Medication Safeguard Engine (SAFEGUARD)",
    description: "Real-time verification for drug interactions, allergy cross-reactivity, duplicate therapies, and contraindications.",
    label: "Run Safety Audit",
  },
  "/app/workflow": {
    title: "Clinical Workflow Blueprint",
    description: "End-to-end interactive orchestrator connecting Ambient Listening, OCR Reading, Context Synthesis, and Medication Safety.",
    label: "Explore Blueprint",
  },
  "/app/settings": {
    title: "Clinical Workspace Preferences",
    description: "Configure physician profile, hospital OPD department, multilingual speech models, and safety alert sensitivity.",
    label: "Update Preferences",
  },
};

export function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header Greeting */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-eyebrow">Doctor-Led Clinical Intelligence</span>
            <Badge variant="teal" size="sm" dot pulse>
              Live OPD Session
            </Badge>
          </div>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Good morning, Doctor.
          </h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Your clinical copilot workspace is active. Every AAROGYA MITHRA output remains a draft until you review and approve it.
          </p>
        </div>
        <Button variant="teal" size="md" rightIcon={<ArrowRight className="size-4" />}>
          Start Consultation
        </Button>
      </div>

      {/* OPD Summary Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Patients Today"
          value="28"
          subtitle="18 completed, 10 waiting"
          icon={Users}
          trend={{ value: "+15%", isPositive: true }}
        />
        <MetricCard
          label="Active Consultations"
          value="1"
          subtitle="Room 4 (General OPD)"
          icon={Activity}
          badge={<Badge variant="teal" size="sm" dot>Listening Active</Badge>}
        />
        <MetricCard
          label="Reports to Review"
          value="6"
          subtitle="4 labs, 2 prescriptions"
          icon={FileText}
          badge={<Badge variant="warning" size="sm">Review Pending</Badge>}
        />
        <MetricCard
          label="Safety Checks"
          value="100%"
          subtitle="Zero unverified alerts"
          icon={ShieldCheck}
          badge={<Badge variant="success" size="sm">All Clear</Badge>}
        />
      </div>

      {/* Clinical Advisory Banner */}
      <ClinicalCalloutCard
        variant="teal"
        title="Clinical Copilot Status: Operational"
        icon={Sparkles}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="xs">View Protocol</Button>
            <Button variant="subtle" size="xs">Copilot Settings</Button>
          </div>
        }
      >
        AAROGYA MITHRA is listening for consultations in Kannada, Hindi, and English. Multilingual clinical entities are automatically mapped to standard ICD-10 and RxNorm taxonomies during consultation capture.
      </ClinicalCalloutCard>

      {/* Quick Launchpad */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Core Clinical Modules</CardTitle>
              <CardDescription className="mt-1">
                Access the four evidence-grounded capabilities engineered for Indian outpatient departments.
              </CardDescription>
            </div>
            <Badge variant="navy">v0.1 Prototype</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: "1. LISTEN",
                desc: "Multilingual Clinical Scribe for Kannada, Hindi & English consultations.",
                status: "Ready",
              },
              {
                title: "2. READ",
                desc: "Medical document OCR, lab extraction & prescription digitizer.",
                status: "Ready",
              },
              {
                title: "3. CONNECT",
                desc: "Unified patient history timeline, allergy & conflict detection.",
                status: "Ready",
              },
              {
                title: "4. SAFEGUARD",
                desc: "Drug-drug interaction gating & evidence-linked safety alerts.",
                status: "Ready",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group flex flex-col justify-between rounded-xl border border-border bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-foreground">{item.title}</span>
                    <Badge variant="teal" size="sm">{item.status}</Badge>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ModulePage() {
  const location = useLocation();
  const page = pageContent[location.pathname] ?? pageContent["/app/settings"];

  return (
    <EmptyState
      title={page.title}
      description={page.description}
      action={<Button variant="teal" rightIcon={<Plus className="size-4" />}>{page.label}</Button>}
    />
  );
}
