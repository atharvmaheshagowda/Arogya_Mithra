import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Dropdown Container
   ========================================================================== */

export interface DropdownProps {
  label: ReactNode;
  children: ReactNode;
  align?: "left" | "right";
  triggerVariant?: "ghost" | "outline" | "default";
  className?: string;
  menuClassName?: string;
}

export function Dropdown({
  label,
  children,
  align = "right",
  triggerVariant = "ghost",
  className,
  menuClassName,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open]);

  return (
    <div ref={ref} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          triggerVariant === "ghost" &&
            "text-muted-foreground hover:bg-muted hover:text-foreground",
          triggerVariant === "outline" &&
            "border border-border bg-card text-foreground hover:bg-muted",
          triggerVariant === "default" &&
            "bg-primary text-primary-foreground hover:bg-primary/90",
        )}
      >
        {label}
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={cn(
            "absolute top-[calc(100%+0.5rem)] z-50 min-w-52 overflow-hidden rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95",
            align === "right" ? "right-0" : "left-0",
            menuClassName,
          )}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/* ==========================================================================
   Dropdown Item
   ========================================================================== */

export interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  shortcut?: string;
  destructive?: boolean;
}

export function DropdownItem({
  icon,
  shortcut,
  destructive = false,
  className,
  children,
  ...props
}: DropdownItemProps) {
  return (
    <button
      role="menuitem"
      className={cn(
        "flex w-full items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground/80 hover:bg-muted hover:text-foreground",
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-2.5 truncate">
        {icon && <span className="size-4 shrink-0 text-muted-foreground">{icon}</span>}
        <span>{children}</span>
      </span>
      {shortcut && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
          {shortcut}
        </span>
      )}
    </button>
  );
}

/* ==========================================================================
   Dropdown Header / Label
   ========================================================================== */

export function DropdownHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Dropdown Separator
   ========================================================================== */

export function DropdownSeparator({
  className,
  ...props
}: HTMLAttributes<HTMLHRElement>) {
  return <hr className={cn("my-1 -mx-1 border-t border-border", className)} {...props} />;
}
