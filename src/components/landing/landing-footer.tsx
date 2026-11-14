import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileText,
  Lock,
  Scale,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { AarogyaMithraBrand } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-provider";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative z-10 border-t border-border bg-[#0B1D28] text-slate-300">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        {/* Top Header Row: Brand Identity & Live Operational Status */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between pb-10 border-b border-slate-800/80">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <AarogyaMithraBrand showSubtitle={false} />
              <span className="hidden sm:inline-block h-4 w-px bg-slate-700" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 bg-teal-950/60 border border-teal-800/50 rounded-md px-2.5 py-0.5">
                NMC CDSS Compliant
              </span>
            </div>
            <p className="max-w-md text-xs leading-relaxed text-slate-400">
              Clinical decision support copilot engineered for high-volume Indian outpatient departments. Grounded in deterministic statutory rules and physician sign-off.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Live Infrastructure Status Indicator */}
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 shadow-xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span className="font-mono text-[11px]">ABDM M2 Sandbox: Active</span>
            </div>

            <div className="flex items-center gap-2">
              <ThemeSwitcher />
            </div>
          </div>
        </div>

        {/* 4 Structured Clinical Columns */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 text-xs">
          {/* Column 1: Clinical Platform Solutions */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Stethoscope className="size-3.5 text-teal-400" />
              <span>Clinical Platform</span>
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li>
                <Link to="/app" className="hover:text-teal-300 transition-colors">
                  OPD Consultation Workspace
                </Link>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-teal-300 transition-colors">
                  Multilingual Ambient Scribe (Kannada/Hindi)
                </a>
              </li>
              <li>
                <Link to="/app/reports" className="hover:text-teal-300 transition-colors">
                  Multi-Format Report OCR & Biomarkers
                </Link>
              </li>
              <li>
                <Link to="/app/medication-safety" className="hover:text-teal-300 transition-colors">
                  Deterministic Medication Safeguard
                </Link>
              </li>
              <li>
                <Link to="/app/patients" className="hover:text-teal-300 transition-colors">
                  Longitudinal Patient Context Engine
                </Link>
              </li>
              <li>
                <a href="#workflow" className="hover:text-teal-300 transition-colors">
                  Interactive Clinical Workflow Blueprint
                </a>
              </li>
            </ul>
          </div>

          {/* Column 2: Clinical Specialties */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Activity className="size-3.5 text-teal-400" />
              <span>Medical Specialties</span>
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li className="hover:text-slate-300">Internal Medicine &amp; General OPD</li>
              <li className="hover:text-slate-300">Cardiology &amp; Hypertension Monitoring</li>
              <li className="hover:text-slate-300">Endocrinology &amp; Diabetes Management</li>
              <li className="hover:text-slate-300">Pediatrics &amp; Pediatric Dosage Safety</li>
              <li className="hover:text-slate-300">Nephrology &amp; Renal Clearance Dosing</li>
              <li className="hover:text-slate-300">Pulmonology &amp; Acute Respiratory Triage</li>
            </ul>
          </div>

          {/* Column 3: Standards & Statutory Certifications */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Scale className="size-3.5 text-teal-400" />
              <span>Standards &amp; Governance</span>
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-teal-400 shrink-0" />
                <span>NHA ABDM Milestone 2 Certified</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-teal-400 shrink-0" />
                <span>HL7 FHIR R4 Interoperability</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-teal-400 shrink-0" />
                <span>SNOMED CT &amp; ICD-10 Clinical Terminology</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-teal-400 shrink-0" />
                <span>DPDP Act (India) 2023 Compliant</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-teal-400 shrink-0" />
                <span>CDSCO &amp; Indian National Formulary</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-teal-400 shrink-0" />
                <span>Strict Doctor-in-the-Loop Protocol</span>
              </li>
            </ul>
          </div>

          {/* Column 4: Hospital Integration & Security */}
          <div className="space-y-3.5">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
              <Lock className="size-3.5 text-teal-400" />
              <span>Hospital Systems</span>
            </h4>
            <ul className="space-y-2.5 text-slate-400">
              <li className="flex items-center gap-2">
                <Building2 className="size-3 text-slate-400 shrink-0" />
                <span>HIS / EMR Webhook Integration</span>
              </li>
              <li className="flex items-center gap-2">
                <Lock className="size-3 text-slate-400 shrink-0" />
                <span>Zero-Retention Ephemeral Audio</span>
              </li>
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-3 text-slate-400 shrink-0" />
                <span>TLS 1.3 &amp; AES-256 Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <FileText className="size-3 text-slate-400 shrink-0" />
                <span>Tamper-Evident Audit Logging</span>
              </li>
              <li className="pt-2">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-teal-400 font-semibold hover:text-teal-300 transition-colors"
                >
                  <span>Physician Onboarding &amp; Verification</span>
                  <span aria-hidden="true">&rarr;</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Statutory Medical Disclaimer & Emergency Callout */}
        <div className="space-y-3 pt-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 text-[11px] leading-relaxed text-slate-300">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="size-4 text-teal-400 mt-0.5 shrink-0" />
              <div>
                <strong className="text-slate-100 font-semibold">Statutory Clinical Notice: </strong>
                AAROGYA MITHRA is an assistive Clinical Decision Support System (CDSS) designed to reduce administrative documentation burden for licensed healthcare practitioners. It is not an autonomous diagnostic device, prescribing software, or a replacement for clinical judgment. In accordance with National Medical Commission (NMC) regulations, all generated SOAP notes, lab extractions, and medication interaction advisories require mandatory physician review, verification, and digital sign-off before being committed to patient records.
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-900/50 bg-amber-950/20 px-4 py-2.5 text-[11px] leading-relaxed text-amber-300/90 flex items-center gap-2">
            <AlertTriangle className="size-3.5 text-amber-400 shrink-0" />
            <span>
              <strong>Emergency Notice:</strong> AAROGYA MITHRA is not an emergency response or critical care triage tool. In acute clinical emergencies, dial 112 (National Emergency) or 108 (Ambulance), or transfer the patient to the hospital casualty unit immediately.
            </span>
          </div>
        </div>

        {/* Bottom Legal & Compliance Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-800 text-xs text-slate-400">
          <p>© {currentYear} AAROGYA MITHRA Clinical Systems. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-6 text-[11px]">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy (DPDP 2023)</span>
            <span className="hover:text-slate-300 cursor-pointer">Clinical Terms of Service</span>
            <span className="hover:text-slate-300 cursor-pointer">Business Associate Agreement</span>
            <span className="hover:text-slate-300 cursor-pointer">Security Architecture</span>
            <span className="hover:text-slate-300 cursor-pointer">NMC Compliance</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
