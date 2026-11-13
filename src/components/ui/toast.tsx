import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastOptions {
  description?: string;
  duration?: number;
}

interface ToastFunction {
  (options: { title: string; description?: string; variant?: ToastVariant; duration?: number }): void;
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  warning: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
}

interface ToastContextValue {
  toast: ToastFunction;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastIcons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastColors = {
  success: "text-success border-success/30 bg-card",
  error: "text-destructive border-destructive/30 bg-card",
  warning: "text-warning border-warning/30 bg-card",
  info: "text-accent border-accent/30 bg-card",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({
      title,
      description,
      variant = "info",
      duration = 5000,
    }: {
      title: string;
      description?: string;
      variant?: ToastVariant;
      duration?: number;
    }) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newItem: ToastItem = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newItem]);

      if (duration > 0) {
        window.setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss],
  );

  const toastHandler = Object.assign(
    (opts: { title: string; description?: string; variant?: ToastVariant; duration?: number }) => {
      addToast(opts);
    },
    {
      success: (title: string, opts?: ToastOptions) =>
        addToast({ title, description: opts?.description, variant: "success", duration: opts?.duration }),
      error: (title: string, opts?: ToastOptions) =>
        addToast({ title, description: opts?.description, variant: "error", duration: opts?.duration }),
      warning: (title: string, opts?: ToastOptions) =>
        addToast({ title, description: opts?.description, variant: "warning", duration: opts?.duration }),
      info: (title: string, opts?: ToastOptions) =>
        addToast({ title, description: opts?.description, variant: "info", duration: opts?.duration }),
    },
  ) as ToastFunction;

  return (
    <ToastContext.Provider value={{ toast: toastHandler, dismiss }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[9999] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((item) => {
          const Icon = toastIcons[item.variant];
          return (
            <div
              key={item.id}
              role="status"
              className={cn(
                "pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3",
                toastColors[item.variant],
              )}
            >
              <Icon className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
                {item.description && (
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
