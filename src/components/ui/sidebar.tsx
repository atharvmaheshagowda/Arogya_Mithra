import {
  createContext,
  useContext,
  type Dispatch,
  type HTMLAttributes,
  type ReactNode,
  type SetStateAction,
} from "react";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface SidebarContextValue {
  collapsed: boolean;
  setCollapsed?: Dispatch<SetStateAction<boolean>> | ((value: boolean) => void);
}

const SidebarContext = createContext<SidebarContextValue>({ collapsed: false });

export function useSidebar() {
  return useContext(SidebarContext);
}

/* ==========================================================================
   Sidebar Root
   ========================================================================== */

export interface SidebarProps extends HTMLAttributes<HTMLElement> {
  collapsed?: boolean;
  onCollapsedChange?: Dispatch<SetStateAction<boolean>> | ((collapsed: boolean) => void);
  children: ReactNode;
}

export function Sidebar({
  collapsed = false,
  onCollapsedChange,
  className,
  children,
  ...props
}: SidebarProps) {
  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        setCollapsed: onCollapsedChange,
      }}
    >
      <aside
        className={cn(
          "flex h-full flex-col border-r border-border bg-card transition-[width] duration-300 ease-in-out select-none",
          collapsed ? "w-[4.5rem]" : "w-64",
          className,
        )}
        {...props}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  );
}

/* ==========================================================================
   Sidebar Header
   ========================================================================== */

export function SidebarHeader({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex h-16 items-center justify-between px-4 border-b border-border/70", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Sidebar Content
   ========================================================================== */

export function SidebarContent({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-3 py-4 space-y-6 scrollbar-thin", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Sidebar Group
   ========================================================================== */

export interface SidebarGroupProps extends HTMLAttributes<HTMLDivElement> {
  label?: string;
}

export function SidebarGroup({ label, className, children, ...props }: SidebarGroupProps) {
  const { collapsed } = useSidebar();

  return (
    <div className={cn("space-y-1.5", className)} {...props}>
      {label && (
        <p
          className={cn(
            "px-3 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase transition-opacity",
            collapsed && "sr-only",
          )}
        >
          {label}
        </p>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  );
}

/* ==========================================================================
   Sidebar Item
   ========================================================================== */

export interface SidebarItemProps {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: ReactNode;
  end?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SidebarItem({
  to,
  label,
  icon: Icon,
  badge,
  end = false,
  onClick,
  className,
}: SidebarItemProps) {
  const { collapsed } = useSidebar();

  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground shadow-xs dark:bg-accent dark:text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          collapsed && "justify-center px-0",
          className,
        )
      }
    >
      <Icon className="size-4 shrink-0 transition-transform group-hover:scale-105" />
      <span className={cn("truncate transition-opacity", collapsed && "sr-only")}>{label}</span>
      {!collapsed && badge && <span className="ml-auto">{badge}</span>}
    </NavLink>
  );
}

/* ==========================================================================
   Sidebar Footer
   ========================================================================== */

export function SidebarFooter({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("border-t border-border/70 p-3 space-y-3", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Sidebar Toggle Button
   ========================================================================== */

export function SidebarToggle({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  const { collapsed, setCollapsed } = useSidebar();

  return (
    <button
      type="button"
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      onClick={() => {
        if (onClick) onClick();
        else if (setCollapsed) setCollapsed(!collapsed);
      }}
      className={cn(
        "grid size-8 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
        className,
      )}
    >
      <ChevronLeft
        className={cn("size-4 transition-transform duration-200", collapsed && "rotate-180")}
      />
    </button>
  );
}
