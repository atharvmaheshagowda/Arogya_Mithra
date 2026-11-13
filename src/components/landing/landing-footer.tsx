import { Link } from "react-router-dom";
import { AarogyaMithraBrand } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-provider";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-card/80 text-card-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 space-y-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-4">
            <AarogyaMithraBrand showSubtitle />
            <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
              Evidence-grounded AI clinical copilot designed for high-volume outpatient departments (OPDs) in Indian hospitals.
            </p>
            <p className="text-xs font-serif italic text-accent">
              &quot;Your Clinical Workflow. Reimagined with Intelligence.&quot;
            </p>
            <div className="pt-2">
              <ThemeSwitcher />
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Core Capabilities
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#capabilities" className="hover:text-foreground transition-colors">
                  LISTEN — Clinical Scribe
                </a>
              </li>
              <li>
                <a href="#capabilities" className="hover:text-foreground transition-colors">
                  READ — Report Intelligence
                </a>
              </li>
              <li>
                <a href="#context-engine" className="hover:text-foreground transition-colors">
                  CONNECT — Context Engine
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-foreground transition-colors">
                  SAFEGUARD — Medication Safety
                </a>
              </li>
            </ul>
          </div>

          {/* Platform */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Clinical Platform
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#workflow" className="hover:text-foreground transition-colors">
                  Interactive Workflow Blueprint
                </a>
              </li>
              <li>
                <Link to="/app" className="hover:text-foreground transition-colors">
                  Doctor Consultation Workspace
                </Link>
              </li>
              <li>
                <Link to="/app/patients" className="hover:text-foreground transition-colors">
                  Patient Context Panel
                </Link>
              </li>
              <li>
                <Link to="/app/reports" className="hover:text-foreground transition-colors">
                  Medical Report Ingestion
                </Link>
              </li>
              <li>
                <Link to="/app/medication-safety" className="hover:text-foreground transition-colors">
                  Medication Safeguard Engine
                </Link>
              </li>
            </ul>
          </div>

          {/* Governance & Compliance */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
              Clinical Governance
            </h4>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#safety" className="hover:text-foreground transition-colors">
                  Human Oversight Standards
                </a>
              </li>
              <li>
                <a href="#safety" className="hover:text-foreground transition-colors">
                  Deterministic Safety Rules
                </a>
              </li>
              <li>
                <span className="text-foreground/70">ABDM &amp; FHIR Compliance</span>
              </li>
              <li>
                <span className="text-foreground/70">DPDP Act (India) Alignment</span>
              </li>
              <li>
                <span className="text-foreground/70">CDSCO Formulary Citations</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Mandatory Medical Disclaimer */}
        <div className="rounded-xl border border-border/80 bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
          <p>
            <strong className="text-foreground font-semibold">Important Clinical Notice:</strong> AAROGYA MITHRA is an assistive clinical decision support copilot designed to reduce administrative documentation burden for licensed healthcare practitioners. It is not an autonomous diagnostic device, medical prescribing software, or a substitute for professional clinical judgment. All clinical notes, lab interpretations, and medication orders require explicit review, modification, and digital sign-off by the attending treating clinician.
          </p>
        </div>

        {/* Bottom Strip */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border/60 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} AAROGYA MITHRA. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Evidence-Grounded AI</span>
            <span>•</span>
            <span>Kannada • Hindi • English</span>
            <span>•</span>
            <span>Indian OPD Specialized</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

