import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border font-semibold leading-none select-none transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-border bg-muted text-muted-foreground",
        navy:
          "border-primary/20 bg-primary/10 text-primary dark:border-primary/40 dark:text-primary-foreground",
        teal:
          "border-accent/25 bg-accent/10 text-accent dark:border-accent/40 dark:text-teal-300",
        success:
          "border-success/25 bg-success/10 text-success dark:border-success/40 dark:text-emerald-400",
        warning:
          "border-warning/30 bg-warning/15 text-warning dark:border-warning/40 dark:text-amber-300",
        danger:
          "border-destructive/25 bg-destructive/10 text-destructive dark:border-destructive/40 dark:text-rose-400",
        outline:
          "border-border bg-transparent text-foreground",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        md: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

const dotColors = {
  default: "bg-muted-foreground",
  navy: "bg-primary dark:bg-primary-foreground",
  teal: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  outline: "bg-foreground",
};

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
  icon?: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "default",
      size = "md",
      dot = false,
      pulse = false,
      icon,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span className="relative flex size-1.5 shrink-0">
            {pulse && (
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                  dotColors[variant ?? "default"],
                )}
              />
            )}
            <span
              className={cn(
                "relative inline-flex size-1.5 rounded-full",
                dotColors[variant ?? "default"],
              )}
            />
          </span>
        )}
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{children}</span>
      </span>
    );
  },
);
Badge.displayName = "Badge";
