import { forwardRef, type ReactNode, type HTMLAttributes } from "react";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/* ==========================================================================
   1. FilterPills (Sleek Segmented Filter Bar)
   ========================================================================== */

export interface FilterOption<T extends string = string> {
  value: T;
  label: string;
  icon?: ReactNode;
  count?: number;
}

export interface FilterPillsProps<T extends string = string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "sm" | "xs";
}

export function FilterPills<T extends string = string>({
  options,
  value,
  onChange,
  className,
  size = "sm",
}: FilterPillsProps<T>) {
  return (
    <div
      role="radiogroup"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 text-xs select-none clinical-scrollbar overflow-x-auto",
        className,
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-all duration-150",
              size === "xs" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
              isSelected
                ? "bg-card text-foreground shadow-xs font-semibold ring-1 ring-border text-accent"
                : "text-muted-foreground hover:bg-card/50 hover:text-foreground",
            )}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[10px] tabular-nums",
                  isSelected
                    ? "bg-accent/15 text-accent font-bold"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ==========================================================================
   2. ClinicalVitalsGauge ( Bedside & OPD Vitals Card )
   ========================================================================== */

export interface VitalMetric {
  label: string;
  value: string;
  unit: string;
  status: "normal" | "warning" | "critical" | "optimal";
  statusText?: string;
  normalRange?: string;
  icon?: ReactNode;
}

export function ClinicalVitalsGauge({
  vitals,
  className,
}: {
  vitals: VitalMetric[];
  className?: string;
}) {
  const getStatusColor = (status: VitalMetric["status"]) => {
    switch (status) {
      case "critical":
        return "text-destructive border-destructive/30 bg-destructive/5";
      case "warning":
        return "text-warning border-warning/30 bg-warning/5";
      case "optimal":
      case "normal":
      default:
        return "text-accent border-accent/20 bg-accent/5";
    }
  };

  const getBadgeVariant = (status: VitalMetric["status"]) => {
    switch (status) {
      case "critical":
        return "danger";
      case "warning":
        return "warning";
      case "optimal":
      case "normal":
      default:
        return "teal";
    }
  };

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-4", className)}>
      {vitals.map((v, i) => (
        <div
          key={i}
          className={cn(
            "rounded-xl border p-3.5 transition-all duration-200 hover:shadow-xs",
            getStatusColor(v.status),
          )}
        >
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {v.label}
            </span>
            {v.icon}
          </div>

          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold tracking-tight text-foreground tabular-nums">
              {v.value}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {v.unit}
            </span>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1 text-[11px]">
            <Badge variant={getBadgeVariant(v.status)} size="sm" className="text-[10px] px-1.5 py-0">
              {v.statusText || v.status.toUpperCase()}
            </Badge>
            {v.normalRange && (
              <span className="text-muted-foreground text-[10px] font-mono">
                Ref: {v.normalRange}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ==========================================================================
   3. LabReferenceBar ( Visual Biological Reference Interval Gauge )
   ========================================================================== */

export interface LabReferenceBarProps {
  value: number;
  low: number;
  high: number;
  unit: string;
  flag?: "HIGH" | "LOW" | "NORMAL";
  compact?: boolean;
}

export function LabReferenceBar({
  value,
  low,
  high,
  unit,
  flag = "NORMAL",
  compact = false,
}: LabReferenceBarProps) {
  // Normalize percentage within a scale [minScale, maxScale]
  const buffer = (high - low) * 0.4;
  const minScale = Math.max(0, low - buffer);
  const maxScale = high + buffer;
  const range = maxScale - minScale || 1;

  const valuePercent = Math.min(
    100,
    Math.max(0, ((value - minScale) / range) * 100),
  );
  const lowPercent = ((low - minScale) / range) * 100;
  const highPercent = ((high - minScale) / range) * 100;

  const isHigh = flag === "HIGH" || value > high;
  const isLow = flag === "LOW" || value < low;

  const markerColor = isHigh
    ? "bg-destructive ring-destructive/30"
    : isLow
    ? "bg-warning ring-warning/30"
    : "bg-success ring-success/30";

  return (
    <div className="w-full space-y-1">
      <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden flex">
        {/* Low range */}
        <div style={{ width: `${lowPercent}%` }} className="bg-warning/20 h-full" />
        {/* Normal range */}
        <div
          style={{ width: `${highPercent - lowPercent}%` }}
          className="bg-success/20 h-full"
        />
        {/* High range */}
        <div
          style={{ width: `${100 - highPercent}%` }}
          className="bg-destructive/20 h-full"
        />

        {/* Position marker */}
        <div
          style={{ left: `${valuePercent}%` }}
          className={cn(
            "absolute top-0 bottom-0 w-2.5 -ml-1 rounded-full ring-2 shadow-xs transition-all",
            markerColor,
          )}
        />
      </div>

      {!compact && (
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-0.5">
          <span>{low} {unit}</span>
          <span className="font-semibold text-foreground">
            Normal: {low}–{high}
          </span>
          <span>{high} {unit}</span>
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   4. HardStopAlert ( CDSCO & BNF Grounded Clinical Hard-Stop Barrier )
   ========================================================================== */

export interface HardStopAlertProps {
  title: string;
  message: string;
  alternative?: string;
  citation?: string;
  onOverrideRequest?: () => void;
  className?: string;
}

export function HardStopAlert({
  title,
  message,
  alternative,
  citation = "CDSCO / BNF 86 Clinical Safety Protocol",
  onOverrideRequest,
  className,
}: HardStopAlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "relative overflow-hidden rounded-2xl border-2 border-destructive/50 bg-destructive/10 p-5 text-destructive shadow-sm glow-danger-sm",
        className,
      )}
    >
      <div className="flex items-start gap-3.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-destructive text-destructive-foreground shadow-xs mt-0.5">
          <AlertOctagon className="size-5" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-display text-base font-bold text-destructive">
                {title}
              </span>
              <Badge variant="danger" size="sm" dot>
                HARD STOP ACTIVE
              </Badge>
            </div>
            <span className="font-mono text-[10px] uppercase tracking-wider text-destructive/80 font-bold">
              {citation}
            </span>
          </div>

          <p className="text-xs leading-relaxed text-destructive/95 font-medium">
            {message}
          </p>

          {alternative && (
            <div className="rounded-xl border border-border/80 bg-card p-3 text-xs text-foreground shadow-xs">
              <span className="text-[11px] font-bold text-accent uppercase tracking-wider block mb-0.5">
                Clinical Decision Support Recommendation:
              </span>
              <p className="font-medium text-foreground">{alternative}</p>
            </div>
          )}

          {onOverrideRequest && (
            <div className="pt-1 flex items-center justify-end">
              <button
                type="button"
                onClick={onOverrideRequest}
                className="text-[11px] font-semibold text-destructive underline-offset-4 hover:underline"
              >
                Request Clinician Formal Override Log...
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   5. Table Density Toggle ( Comfortable vs Compact )
   ========================================================================== */

export function TableDensityToggle({
  isCompact,
  onChange,
}: {
  isCompact: boolean;
  onChange: (compact: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5 text-xs">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={cn(
          "px-2 py-1 rounded text-[11px] font-medium transition-colors",
          !isCompact
            ? "bg-muted text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Comfortable
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={cn(
          "px-2 py-1 rounded text-[11px] font-medium transition-colors",
          isCompact
            ? "bg-muted text-foreground font-semibold"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        Compact
      </button>
    </div>
  );
}
