import { useState, type ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, FileQuestion, Inbox, Info, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* ==========================================================================
   Empty State
   ========================================================================== */

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: typeof Inbox;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  secondaryAction,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/60 text-center transition-colors",
        compact ? "p-6 min-h-40" : "px-6 py-12 min-h-64",
        className,
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-2xl border border-border/70 bg-muted/60 text-muted-foreground shadow-xs">
        <Icon className="size-6" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Error State
   ========================================================================== */

export interface ErrorStateProps {
  title?: string;
  description?: string;
  details?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Clinical Service Unavailable",
  description = "A temporary communication error occurred while processing this request. Please verify and retry.",
  details,
  onRetry,
  className,
}: ErrorStateProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-destructive/25 bg-destructive/5 px-6 py-12 text-center",
        className,
      )}
    >
      <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertCircle className="size-6" />
      </div>
      <h3 className="font-display text-xl font-semibold text-foreground tracking-tight">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>

      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          className="mt-6"
          onClick={onRetry}
          leftIcon={<RefreshCw className="size-3.5" />}
        >
          Retry action
        </Button>
      )}

      {details && (
        <div className="mt-4 w-full max-w-md text-left">
          <button
            type="button"
            onClick={() => setShowDetails((p) => !p)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <span>{showDetails ? "Hide technical diagnostic" : "Show technical diagnostic"}</span>
            <ChevronDown className={cn("size-3.5 transition-transform", showDetails && "rotate-180")} />
          </button>
          {showDetails && (
            <pre className="mt-2 max-h-32 overflow-auto rounded-lg border border-border bg-card p-3 font-mono text-[11px] text-muted-foreground">
              {details}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Alert Banner (Inline Clinical Notification)
   ========================================================================== */

export interface AlertBannerProps {
  variant?: "info" | "warning" | "danger" | "success";
  title?: string;
  children: ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const bannerVariants = {
  info: "border-border bg-muted/60 text-foreground",
  warning: "border-warning/30 bg-warning/10 text-foreground",
  danger: "border-destructive/30 bg-destructive/10 text-foreground",
  success: "border-success/30 bg-success/10 text-foreground",
};

const bannerIcons = {
  info: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
  success: CheckCircle2,
};

const bannerIconColors = {
  info: "text-muted-foreground",
  warning: "text-warning",
  danger: "text-destructive",
  success: "text-success",
};

export function AlertBanner({
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  className,
}: AlertBannerProps) {
  const Icon = bannerIcons[variant];

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border p-4 text-sm transition-colors",
        bannerVariants[variant],
        className,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", bannerIconColors[variant])} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold text-foreground mb-0.5">{title}</p>}
        <div className="leading-relaxed text-muted-foreground text-xs sm:text-sm">{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="rounded p-1 text-muted-foreground hover:bg-background/40 hover:text-foreground"
          aria-label="Dismiss alert"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
