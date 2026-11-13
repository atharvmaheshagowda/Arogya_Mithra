import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface ModalProps { open: boolean; onOpenChange: (open: boolean) => void; title: string; description?: string; children: ReactNode; className?: string; }
export function Modal({ open, onOpenChange, title, description, children, className }: ModalProps) {
  useEffect(() => { const close = (event: KeyboardEvent) => event.key === "Escape" && onOpenChange(false); if (open) { document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); } }, [open, onOpenChange]);
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-50 grid place-items-center p-4"><button aria-label="Close modal" className="absolute inset-0 bg-primary/35 backdrop-blur-sm" onClick={() => onOpenChange(false)} /><section role="dialog" aria-modal="true" aria-labelledby="modal-title" className={cn("relative w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl", className)}><div className="flex items-start justify-between gap-4"><div><h2 id="modal-title" className="font-display text-2xl font-semibold">{title}</h2>{description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}</div><Button variant="ghost" size="icon" aria-label="Close modal" onClick={() => onOpenChange(false)}><X className="size-4" /></Button></div><div className="mt-6">{children}</div></section></div>, document.body);
}
