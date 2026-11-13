import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Core Card Primitives
   ========================================================================== */

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow-xs transition-colors",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 p-5 sm:p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
  <h3
    className={cn(
      "font-display text-xl font-semibold leading-snug tracking-tight text-foreground",
      className,
    )}
    {...props}
  />
);

export const CardDescription = ({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn("text-sm leading-relaxed text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("px-5 pb-5 sm:px-6 sm:pb-6", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("flex items-center justify-between border-t border-border px-5 py-4 sm:px-6", className)}
    {...props}
  />
);

/* ==========================================================================
   Interactive Card
   ========================================================================== */

export interface InteractiveCardProps extends HTMLAttributes<HTMLDivElement> {
  selected?: boolean;
}

export const InteractiveCard = forwardRef<HTMLDivElement, InteractiveCardProps>(
  ({ className, selected = false, ...props }, ref) => (
    <div
      ref={ref}
      tabIndex={0}
      role="button"
      className={cn(
        "group cursor-pointer rounded-xl border border-border bg-card p-5 text-card-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "border-accent ring-2 ring-accent/20 bg-accent/5",
        className,
      )}
      {...props}
    />
  ),
);
InteractiveCard.displayName = "InteractiveCard";

/* ==========================================================================
   Metric Card (For OPD Statistics)
   ========================================================================== */

export interface MetricCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  badge?: ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
}

export function MetricCard({
  label,
  value,
  subtitle,
  icon: Icon,
  badge,
  trend,
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/80 bg-card p-5 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-lg",
        className,
      )}
      {...props}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground tabular-nums">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground leading-normal">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1.5 pt-1 text-xs font-medium">
              <span
                className={cn(
                  "font-semibold",
                  trend.isPositive ? "text-success" : "text-destructive",
                )}
              >
                {trend.value}
              </span>
              <span className="text-muted-foreground">vs previous OPD shift</span>
            </div>
          )}
        </div>
        {Icon && (
          <span className="grid size-12 place-items-center rounded-2xl bg-accent/10 text-accent dark:bg-accent/20 group-hover:bg-accent group-hover:text-white transition-all duration-300 shrink-0">
            <Icon className="size-5 sm:size-6" />
          </span>
        )}
      </div>
      {badge && <div className="mt-3.5 pt-2 border-t border-border/50">{badge}</div>}
    </Card>
  );
}

/* ==========================================================================
   Clinical Callout Card
   ========================================================================== */

const calloutVariants = cva("rounded-xl border p-4 text-sm transition-colors", {
  variants: {
    variant: {
      teal: "border-accent/30 bg-accent/5 text-foreground dark:bg-accent/10",
      navy: "border-primary/20 bg-primary/5 text-foreground dark:border-primary/40 dark:bg-primary/10",
      warning: "border-warning/30 bg-warning/10 text-foreground dark:bg-warning/15",
      danger: "border-destructive/30 bg-destructive/10 text-foreground dark:bg-destructive/15",
      success: "border-success/30 bg-success/10 text-foreground dark:bg-success/15",
      info: "border-border bg-muted/50 text-foreground",
    },
  },
  defaultVariants: {
    variant: "teal",
  },
});

const defaultIcons: Record<string, LucideIcon> = {
  teal: Sparkles,
  navy: Info,
  warning: AlertTriangle,
  danger: AlertCircle,
  success: CheckCircle2,
  info: Info,
};

export interface ClinicalCalloutCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof calloutVariants> {
  title?: string;
  icon?: LucideIcon;
  action?: ReactNode;
}

export function ClinicalCalloutCard({
  variant = "teal",
  title,
  icon,
  action,
  children,
  className,
  ...props
}: ClinicalCalloutCardProps) {
  const IconComponent = icon ?? defaultIcons[variant ?? "teal"];

  return (
    <div className={cn(calloutVariants({ variant }), className)} {...props}>
      <div className="flex items-start gap-3">
        <IconComponent
          className={cn(
            "mt-0.5 size-5 shrink-0",
            variant === "teal" && "text-accent",
            variant === "navy" && "text-primary dark:text-primary-foreground",
            variant === "warning" && "text-warning",
            variant === "danger" && "text-destructive",
            variant === "success" && "text-success",
            variant === "info" && "text-muted-foreground",
          )}
        />
        <div className="min-w-0 flex-1">
          {title && <h4 className="font-semibold text-foreground mb-1">{title}</h4>}
          <div className="leading-relaxed text-muted-foreground">{children}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
