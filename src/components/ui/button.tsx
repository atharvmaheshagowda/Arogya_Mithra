import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-300 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-lg dark:bg-primary dark:text-primary-foreground border border-white/10",
        teal:
          "bg-accent text-accent-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-teal hover:bg-teal-600 dark:hover:bg-teal-500 border border-teal-400/30",
        glass:
          "liquid-glass text-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md hover:border-accent/40",
        outline:
          "border border-border bg-card/80 backdrop-blur-md text-foreground shadow-xs hover:border-primary/40 hover:bg-muted/70 dark:hover:border-accent/40",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 hover:shadow-md border border-red-400/20",
        subtle:
          "bg-accent/10 text-accent hover:bg-accent/20 dark:bg-accent/15 dark:text-teal-300 border border-accent/20",
        link:
          "h-auto p-0 text-accent underline-offset-4 hover:underline hover:translate-y-0",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md gap-1.5",
        sm: "h-8 px-3 text-xs rounded-md gap-1.5",
        md: "h-10 px-4 text-sm rounded-lg gap-2",
        lg: "h-11 px-5 text-base rounded-xl gap-2.5",
        xl: "h-12 px-6 text-base font-semibold rounded-xl gap-3",
        icon: "size-10 p-0 rounded-lg",
        "icon-sm": "size-8 p-0 rounded-md",
        "icon-xs": "size-7 p-0 rounded",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      type = "button",
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = "Button";
