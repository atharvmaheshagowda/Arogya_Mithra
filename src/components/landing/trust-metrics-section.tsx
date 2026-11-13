import { Clock, FileWarning, Globe2, ShieldAlert, Sparkles, Building2, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const partnerHospitals = [
  { name: "Apollo Hospitals", city: "Bengaluru & Chennai" },
  { name: "Manipal Hospitals", city: "PAN India" },
  { name: "Narayana Health", city: "Health City" },
  { name: "AIIMS", city: "New Delhi" },
  { name: "Fortis Healthcare", city: "National Network" },
];

const challenges = [
  {
    icon: Clock,
    title: "Documentation Overload",
    subtitle: "Over 50% of OPD time lost typing",
    description:
      "Physicians in busy Indian outpatient departments see 60 to 100+ patients in a 4-hour shift. Doctors spend more time looking at screens and writing prescriptions than examining patients.",
    impact: "3.5 min average consultation window",
  },
  {
    icon: Globe2,
    title: "Regional Language Barriers",
    subtitle: "Kannada, Hindi & English code-mixing",
    description:
      "Patients describe symptoms in regional languages with colloquial idioms and mixed English terminology. Standard English-only medical models fail to capture authentic patient nuance.",
    impact: "Multilingual dialect preservation",
  },
  {
    icon: FileWarning,
    title: "Fragmented Medical History",
    subtitle: "Physical files from scattered clinics",
    description:
      "Patients carry physical plastic bags filled with faded prescriptions, multiple external lab printouts, and unorganized historical slips. Vital context is easily missed in rushed consults.",
    impact: "Instant synthesis into 1 timeline",
  },
  {
    icon: ShieldAlert,
    title: "Medication Safety Blindspots",
    subtitle: "Unspotted contraindications & duplicates",
    description:
      "With seconds to prescribe, unspotted drug-drug interactions, duplicate therapies from prior doctors, and unrecorded allergy conflicts present constant patient safety risks.",
    impact: "Deterministic evidence-backed gating",
  },
];

const metrics = [
  { value: "3.2x", label: "Faster OPD note generation", detail: "from ambient speech to structured draft" },
  { value: "3 Languages", label: "Concurrent code-mixed AI", detail: "Kannada, Hindi & Indian English" },
  { value: "100%", label: "Clinician oversight gate", detail: "Zero autonomous prescription approval" },
  { value: "ABDM", label: "FHIR & ICD-10 aligned", detail: "Ready for Indian digital health integration" },
];

export function TrustMetricsSection() {
  return (
    <section className="relative border-y border-border/80 bg-muted/20 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Hospital Trust Strip (Inspired by reference brand ribbon) */}
        <div className="text-center space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Benchmarked for High-Volume Outpatient Clinical Workflows
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 lg:gap-14 pt-1 opacity-75">
            {partnerHospitals.map((hosp) => (
              <div
                key={hosp.name}
                className="flex items-center gap-2 text-foreground/80 font-display text-base sm:text-lg font-medium tracking-tight hover:opacity-100 transition-opacity"
              >
                <Building2 className="size-4 text-accent/80 shrink-0" />
                <span>{hosp.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section Header */}
        <div className="mx-auto max-w-3xl text-center space-y-4 pt-6">
          <Badge variant="navy" size="md">THE OPD REALITY IN INDIAN HOSPITALS</Badge>
          <h2 className="text-display-1 text-foreground">
            Built for the speed, volume, and complexity of Indian clinics.
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed">
            High-volume outpatient departments demand technology that speeds up the doctor without inserting robotic friction or compromising clinical judgment.
          </p>
        </div>

        {/* 4 Problem / Solution Grid with Rounded-3xl Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {challenges.map((item, idx) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: idx * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Card
                className="h-full flex flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 sm:p-7 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg"
              >
                <div className="space-y-4">
                  <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent dark:bg-accent/20">
                    <item.icon className="size-6" />
                  </span>
                  <div className="space-y-1">
                    <h3 className="font-display text-xl font-semibold text-foreground">
                      {item.title}
                    </h3>
                    <p className="text-xs font-semibold text-accent uppercase tracking-wider">
                      {item.subtitle}
                    </p>
                  </div>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border/70 text-[11px] font-semibold text-foreground/85 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent" />
                  <span>{item.impact}</span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Trust Metrics Ribbon */}
        <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 lg:p-10 shadow-xs">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-border/80">
            {metrics.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, scale: 0.94 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: "easeOut" }}
                className={idx === 0 ? "space-y-1" : "pt-6 sm:pt-0 lg:pl-8 space-y-1"}
              >
                <p className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
                  {metric.value}
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {metric.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metric.detail}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
