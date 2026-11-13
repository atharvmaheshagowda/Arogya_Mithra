import { useState } from "react";
import {
  Bell,
  ChevronLeft,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { AarogyaMithraBrand } from "@/components/brand";
import { ThemeSwitcher } from "@/components/theme-provider";
import { Dropdown, DropdownItem, DropdownSeparator, DropdownHeader } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/input";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "OVERVIEW",
    items: [{ to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true }],
  },
  {
    label: "CLINICAL COPILOT",
    items: [
      { to: "/app/patients", label: "Patient Panel", icon: Users },
      { to: "/app/consultations", label: "Consultation Scribe", icon: HeartPulse },
      { to: "/app/reports", label: "Medical Reports", icon: FileText },
      { to: "/app/medication-safety", label: "Medication Safety", icon: ShieldCheck },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [{ to: "/app/workflow", label: "Workflow Orchestrator", icon: Workflow }],
  },
  {
    label: "SYSTEM",
    items: [{ to: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const titleByPath: Record<string, string> = {
  "/app": "Clinical Overview",
  "/app/patients": "Patient Context Panel",
  "/app/consultations": "Consultation Scribe (LISTEN)",
  "/app/reports": "Medical Report Intelligence (READ)",
  "/app/medication-safety": "Medication Safeguard Engine (SAFEGUARD)",
  "/app/workflow": "Interactive Workflow Blueprint",
  "/app/settings": "Workspace Settings",
};

export function ApplicationShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { doctor, signOut } = useAuth();

  const title = titleByPath[location.pathname] ?? "AAROGYA MITHRA";

  const renderSidebar = (isMobile = false) => (
    <Sidebar
      collapsed={isMobile ? false : collapsed}
      onCollapsedChange={setCollapsed}
      className={isMobile ? "w-72 border-r-0" : undefined}
    >
      <SidebarHeader>
        <AarogyaMithraBrand compact={!isMobile && collapsed} showSubtitle={!collapsed} />
        {isMobile && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <X className="size-4" />
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <SidebarItem
                key={item.to}
                to={item.to}
                label={item.label}
                icon={item.icon}
                end={item.end}
                onClick={() => isMobile && setMobileOpen(false)}
              />
            ))}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <div
          className={cn(
            "rounded-xl border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground",
            !isMobile && collapsed && "hidden",
          )}
        >
          <p className="font-semibold text-foreground/80">Clinical Decision Support</p>
          <p className="mt-0.5 text-[11px]">AI assists the doctor. The doctor makes the decision.</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="fixed inset-y-0 left-0 z-40 hidden lg:block">
        {renderSidebar(false)}
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 bg-card shadow-2xl">
            {renderSidebar(true)}
          </div>
        </div>
      )}

      {/* Main Workspace Frame */}
      <div
        className={cn(
          "min-h-screen transition-[margin] duration-300 ease-in-out",
          collapsed ? "lg:ml-[4.5rem]" : "lg:ml-64",
        )}
      >
        {/* Top Clinical Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="Open navigation"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              aria-label="Toggle navigation"
              onClick={() => setCollapsed((v) => !v)}
            >
              <ChevronLeft
                className={cn("size-5 transition-transform duration-200", collapsed && "rotate-180")}
              />
            </Button>
            <h1 className="truncate font-display text-xl font-semibold sm:text-2xl text-foreground">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden w-64 md:block">
              <SearchInput
                placeholder="Search patient, MRN, lab..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
              />
            </div>

            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>

            <ThemeSwitcher />

            {/* Clinician Profile Dropdown */}
            <Dropdown
              label={
                <span className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-accent text-xs font-bold text-accent-foreground shadow-xs">
                    {doctor?.name
                      .split(" ")
                      .slice(1)
                      .map((p) => p[0])
                      .join("") || "DR"}
                  </span>
                  <span className="hidden text-left sm:block">
                    <span className="block max-w-32 truncate text-xs font-semibold text-foreground">
                      {doctor?.name || "Dr. Anika Rao"}
                    </span>
                    <span className="block max-w-32 truncate text-[10px] text-muted-foreground">
                      {doctor?.role || "Consultant Physician"}
                    </span>
                  </span>
                </span>
              }
            >
              <DropdownHeader>Doctor Profile</DropdownHeader>
              <DropdownItem
                icon={<User className="size-4" />}
                onClick={() => navigate("/app/settings")}
              >
                Account settings
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                destructive
                icon={<LogOut className="size-4" />}
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
              >
                Sign out
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-200">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
