import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none", {
  variants: {
    variant: {
      default: "border-border bg-muted text-muted-foreground",
      navy: "border-primary/15 bg-primary/10 text-primary dark:text-primary-foreground",
      teal: "border-accent/15 bg-accent/10 text-accent dark:text-accent",
      success: "border-success/15 bg-success/10 text-success",
      warning: "border-warning/20 bg-warning/15 text-warning",
      danger: "border-destructive/15 bg-destructive/10 text-destructive",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
