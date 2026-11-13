import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { Button } from "./button";

type ToastVariant = "success" | "error" | "info";
interface Toast { id: number; title: string; description?: string; variant: ToastVariant; }
interface ToastContextValue { toast: (toast: Omit<Toast, "id">) => void; }
const ToastContext = createContext<ToastContextValue | null>(null);
const icons = { success: CheckCircle2, error: XCircle, info: Info };
const colors = { success: "text-success", error: "text-destructive", info: "text-accent" };

export function ToastProvider({ children }: { children: ReactNode }) { const [toasts, setToasts] = useState<Toast[]>([]); const toast = useCallback((next: Omit<Toast, "id">) => { const id = Date.now(); setToasts((all) => [...all, { ...next, id }]); window.setTimeout(() => setToasts((all) => all.filter((item) => item.id !== id)), 5000); }, []); return <ToastContext.Provider value={{ toast }}>{children}<div className="fixed bottom-4 right-4 z-[60] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">{toasts.map((item) => { const Icon = icons[item.variant]; return <div key={item.id} role="status" className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-lg"><Icon className={`mt-0.5 size-5 shrink-0 ${colors[item.variant]}`} /><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{item.title}</p>{item.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p>}</div><Button variant="ghost" size="sm" className="size-6 p-0" aria-label="Dismiss notification" onClick={() => setToasts((all) => all.filter((toast) => toast.id !== item.id))}><X className="size-4" /></Button></div>; })}</div></ToastContext.Provider>; }
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast must be used within ToastProvider"); return context; }
