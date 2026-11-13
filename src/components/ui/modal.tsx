import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* ==========================================================================
   Modal (Standard Dialog)
   ========================================================================== */

export interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const modalSizes = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  className,
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="fixed inset-0 bg-primary/40 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Surface */}
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          "relative z-10 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl transition-all duration-200",
          modalSizes[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-5 sm:p-6">
          <div>
            <h2 id="modal-title" className="font-display text-2xl font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close modal"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="p-5 sm:p-6 max-h-[calc(85vh-8rem)] overflow-y-auto">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border/70 bg-muted/30 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}

/* ==========================================================================
   ConfirmDialog (Clinical Action Sign-Off)
   ========================================================================== */

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "teal" | "primary";
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "teal",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="sm"
      title={title}
      description={description}
      footer={
        <>
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={isDanger ? "destructive" : variant === "teal" ? "teal" : "primary"}
            size="sm"
            loading={loading}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-3">
        {(isDanger || isWarning) && (
          <span
            className={cn(
              "grid size-10 shrink-0 place-items-center rounded-xl",
              isDanger ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning",
            )}
          >
            {isDanger ? <AlertCircle className="size-5" /> : <AlertTriangle className="size-5" />}
          </span>
        )}
        <p className="text-sm leading-relaxed text-muted-foreground">
          Please confirm this clinical action. Every output requires treating physician sign-off.
        </p>
      </div>
    </Modal>
  );
}

/* ==========================================================================
   SlideOver / Drawer (Right-docked Inspection Panel)
   ========================================================================== */

export interface SlideOverProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: "md" | "lg" | "xl";
  className?: string;
}

const slideOverWidths = {
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

export function SlideOver({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width = "lg",
  className,
}: SlideOverProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    if (open) {
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close panel"
        className="fixed inset-0 bg-primary/35 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Drawer Panel */}
      <section
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative z-10 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl transition-transform",
          slideOverWidths[width],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border/70 p-5 sm:p-6">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">{title}</h2>
            {description && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close panel"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-border/70 bg-muted/30 px-5 py-4 sm:px-6">
            {footer}
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
