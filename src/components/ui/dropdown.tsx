import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropdownProps { label: ReactNode; children: ReactNode; align?: "left" | "right"; className?: string; }
export function Dropdown({ label, children, align = "right", className }: DropdownProps) {
  const [open, setOpen] = useState(false); const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); }; document.addEventListener("mousedown", close); return () => document.removeEventListener("mousedown", close); }, []);
  return <div ref={ref} className={cn("relative", className)}><button aria-expanded={open} className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => setOpen((value) => !value)}>{label}<ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} /></button>{open && <div className={cn("absolute top-[calc(100%+0.5rem)] z-40 min-w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg", align === "right" ? "right-0" : "left-0")} onClick={() => setOpen(false)}>{children}</div>}</div>;
}
export function DropdownItem({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={cn("flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground", className)} {...props} />; }
