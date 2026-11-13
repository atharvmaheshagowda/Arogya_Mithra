import { useState, useEffect } from "react";
import {
  Activity,
  AlertCircle,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Command,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Sun,
  User,
  Users,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AarogyaMithraBrand } from "@/components/brand";
import { ThemeSwitcher, useTheme } from "@/components/theme-provider";
import { Dropdown, DropdownItem, DropdownSeparator, DropdownHeader } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { Input, SearchInput } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { DEMO_DOCTORS, useAuth } from "@/lib/auth";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  badge?: string;
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
    label: "CLINICAL",
    items: [
      { to: "/app/patients", label: "Patients", icon: Users, badge: "28" },
      { to: "/app/consultations", label: "Consultations", icon: HeartPulse, badge: "Active" },
      { to: "/app/reports", label: "Medical Reports", icon: FileText, badge: "6 New" },
      { to: "/app/medication-safety", label: "Medication Safety", icon: ShieldCheck },
    ],
  },
  {
    label: "INTELLIGENCE",
    items: [{ to: "/app/workflow", label: "Workflow", icon: Workflow }],
  },
  {
    label: "SYSTEM",
    items: [{ to: "/app/settings", label: "Settings", icon: Settings }],
  },
];

const titleByPath: Record<string, { title: string; subtitle: string }> = {
  "/app": { title: "Clinical Overview", subtitle: "OPD queue & daily consultation triage" },
  "/app/patients": { title: "Patient Context Panel", subtitle: "Unified longitudinal records & history" },
  "/app/consultations": { title: "Consultation Scribe", subtitle: "Multilingual ambient clinical capture (LISTEN)" },
  "/app/reports": { title: "Medical Reports", subtitle: "Diagnostic report OCR & entity intelligence (READ)" },
  "/app/medication-safety": { title: "Medication Safety Engine", subtitle: "Deterministic drug interaction gating (SAFEGUARD)" },
  "/app/workflow": { title: "Workflow Orchestrator", subtitle: "Interactive 8-stage clinical blueprint" },
  "/app/settings": { title: "Workspace Settings", subtitle: "OPD profile, language models & alert preferences" },
};

interface NotificationItem {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "warning" | "danger" | "success" | "info";
  unread: boolean;
}

const initialNotifications: NotificationItem[] = [
  {
    id: "notif-1",
    title: "SAFEGUARD Alert: Allergy Intercepted",
    desc: "Penicillin class attempted for Patient #AM-94021 (Rajesh Kumar). Alternative Azithromycin suggested.",
    time: "4 mins ago",
    type: "danger",
    unread: true,
  },
  {
    id: "notif-2",
    title: "New Lab Report Ingested (OCR Ready)",
    desc: "Thyrocare CMP PDF for Patient #AM-88310. Fasting Glucose 182 mg/dL flagged out-of-range.",
    time: "18 mins ago",
    type: "warning",
    unread: true,
  },
  {
    id: "notif-3",
    title: "Draft Note Awaiting Doctor Sign-off",
    desc: "Kannada consultation transcription completed for Room 04. Ready for review.",
    time: "25 mins ago",
    type: "info",
    unread: false,
  },
];

export function ApplicationShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(initialNotifications);

  const location = useLocation();
  const navigate = useNavigate();
  const { doctor, signInAs, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const currentMeta = titleByPath[location.pathname] ?? {
    title: "AAROGYA MITHRA",
    subtitle: "Clinical Copilot",
  };

  // Keyboard shortcut Cmd+K / Ctrl+K for Global Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const filteredSearchResults = [
    { type: "Patient", title: "Rajesh Kumar (54y M)", detail: "MRN: #AM-94021 • Type 2 Diabetes, HTN", path: "/app/patients" },
    { type: "Patient", title: "Lakshmi Gowda (48y F)", detail: "MRN: #AM-93112 • Hypothyroidism", path: "/app/patients" },
    { type: "Consultation", title: "Kannada Ambient Scribe (Room 04)", detail: "Acute Epigastric Pain x 3 Days", path: "/app/consultations" },
    { type: "Report", title: "Thyrocare Metabolic Profile (HbA1c 9.2%)", detail: "Scanned PDF • Ingested today", path: "/app/reports" },
    { type: "Safety", title: "Drug Interaction Audit (Metformin + Contrast)", detail: "SAFEGUARD Matrix • 1 Warning", path: "/app/medication-safety" },
  ].filter(
    (item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.detail.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      {/* ====================================================================
          PERSISTENT SIDEBAR (DESKTOP)
         ==================================================================== */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 hidden lg:flex flex-col border-r border-border bg-card transition-[width] duration-300 ease-in-out select-none",
          collapsed ? "w-[4.5rem]" : "w-64",
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-border/70">
          <Link to="/app" className="flex items-center gap-2">
            <AarogyaMithraBrand compact={collapsed} showSubtitle={!collapsed} />
          </Link>
          <button
            type="button"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setCollapsed(!collapsed)}
            className="grid size-7 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeft
              className={cn("size-4 transition-transform duration-200", collapsed && "rotate-180")}
            />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-1.5">
              <p
                className={cn(
                  "px-3 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase transition-opacity",
                  collapsed && "sr-only",
                )}
              >
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    title={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-xs dark:bg-accent dark:text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        collapsed && "justify-center px-0",
                      )
                    }
                  >
                    <item.icon className="size-4 shrink-0 transition-transform group-hover:scale-105" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="ml-auto">
                        <Badge variant="teal" size="sm" className="text-[10px] px-1.5 py-0">
                          {item.badge}
                        </Badge>
                      </span>
                    )}

                    {/* Tooltip in collapsed mode */}
                    {collapsed && (
                      <div className="pointer-events-none absolute left-full ml-3 z-50 hidden rounded-md bg-popover px-2.5 py-1 text-xs font-semibold text-popover-foreground shadow-lg group-hover:block whitespace-nowrap border border-border">
                        {item.label}
                      </div>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Clinical Disclaimer & Quick Hospital Strip */}
        <div className="border-t border-border/70 p-3 space-y-2">
          {!collapsed ? (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <div className="flex items-center gap-1.5 font-semibold text-foreground/90 mb-0.5">
                <ShieldCheck className="size-3.5 text-accent" />
                <span>Doctor-In-The-Loop</span>
              </div>
              <p className="text-[11px]">AI assists the doctor. The doctor makes the decision.</p>
            </div>
          ) : (
            <div className="grid place-items-center py-1" title="Clinical Decision Support Active">
              <ShieldCheck className="size-5 text-accent" />
            </div>
          )}
        </div>
      </aside>

      {/* ====================================================================
          MOBILE DRAWER NAVIGATION
         ==================================================================== */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 bg-card shadow-2xl flex flex-col">
            <div className="flex h-16 items-center justify-between px-4 border-b border-border">
              <AarogyaMithraBrand showSubtitle />
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {navGroups.map((group) => (
                <div key={group.label} className="space-y-1.5">
                  <p className="px-3 text-[10px] font-bold tracking-[0.14em] text-muted-foreground uppercase">
                    {group.label}
                  </p>
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                          cn(
                            "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground dark:bg-accent dark:text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )
                        }
                      >
                        <item.icon className="size-4 shrink-0" />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto">
                            <Badge variant="teal" size="sm" className="text-[10px]">
                              {item.badge}
                            </Badge>
                          </span>
                        )}
                      </NavLink>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  setMobileOpen(false);
                  navigate("/");
                }}
              >
                Exit to Public Website
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MAIN CONTENT WORKSPACE AREA
         ==================================================================== */}
      <div
        className={cn(
          "min-h-screen transition-[margin] duration-300 ease-in-out",
          collapsed ? "lg:ml-[4.5rem]" : "lg:ml-64",
        )}
      >
        {/* Top Clinical Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/80 bg-background/90 px-4 backdrop-blur-md sm:px-6">
          {/* Left: Mobile Menu Trigger & Route Title */}
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

            <div className="min-w-0">
              <h1 className="truncate font-display text-lg sm:text-xl font-bold text-foreground leading-tight">
                {currentMeta.title}
              </h1>
              <p className="hidden sm:block text-[11px] text-muted-foreground leading-none mt-0.5">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Right: Search, Notifications, Theme & Profile */}
          <div className="flex items-center gap-2">
            {/* Global Search Trigger Bar */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-3 h-9 w-64 rounded-lg border border-input bg-card px-3 text-xs text-muted-foreground shadow-xs hover:border-accent/40 transition-colors"
            >
              <Search className="size-3.5 text-muted-foreground" />
              <span className="flex-1 text-left truncate">Search patients, MRN, labs...</span>
              <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1.5 font-mono text-[10px] text-muted-foreground">
                <Command className="size-3" />K
              </kbd>
            </button>

            {/* Mobile Search Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Search workspace"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-4" />
            </Button>

            {/* Notifications Trigger */}
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open notifications"
                onClick={() => setNotificationsOpen(true)}
              >
                <Bell className="size-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                  </span>
                )}
              </Button>
            </div>

            {/* Reusable Theme Switcher */}
            <ThemeSwitcher />

            {/* Doctor Profile Dropdown with Presets & Sign Out */}
            <Dropdown
              label={
                <span className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-accent text-xs font-bold text-accent-foreground shadow-xs">
                    {doctor?.initials || "DR"}
                  </span>
                  <span className="hidden text-left xl:block">
                    <span className="block max-w-32 truncate text-xs font-semibold text-foreground">
                      {doctor?.name || "Dr. Anika Rao"}
                    </span>
                    <span className="block max-w-32 truncate text-[10px] text-muted-foreground">
                      {doctor?.role || "Consultant"}
                    </span>
                  </span>
                </span>
              }
            >
              <DropdownHeader>Treating Clinician</DropdownHeader>
              <div className="px-3 py-1.5">
                <p className="text-xs font-semibold text-foreground">{doctor?.name}</p>
                <p className="text-[10px] text-muted-foreground">{doctor?.clinic}</p>
                <p className="text-[10px] text-accent font-medium mt-0.5">{doctor?.department}</p>
              </div>

              <DropdownSeparator />
              <DropdownHeader>Switch Doctor Preset</DropdownHeader>
              {DEMO_DOCTORS.map((d) => (
                <DropdownItem
                  key={d.id}
                  onClick={() => signInAs(d.id)}
                  className={cn(d.id === doctor?.id && "font-bold text-accent")}
                >
                  <span className="flex items-center justify-between w-full">
                    <span>{d.name}</span>
                    {d.id === doctor?.id && <Check className="size-3 text-accent" />}
                  </span>
                </DropdownItem>
              ))}

              <DropdownSeparator />
              <DropdownItem
                icon={<Settings className="size-3.5" />}
                onClick={() => navigate("/app/settings")}
              >
                Workspace Settings
              </DropdownItem>
              <DropdownItem
                icon={<User className="size-3.5" />}
                onClick={() => navigate("/")}
              >
                Public Landing Site
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem
                destructive
                icon={<LogOut className="size-3.5" />}
                onClick={() => {
                  signOut();
                  navigate("/login");
                }}
              >
                Sign out of Terminal
              </DropdownItem>
            </Dropdown>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8 animate-in fade-in-50 duration-200">
          <Outlet />
        </main>
      </div>

      {/* ====================================================================
          GLOBAL SEARCH MODAL (CMD + K)
         ==================================================================== */}
      <Modal
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Global Clinical Search"
        description="Search across registered patients, consultation transcripts, lab reports, and medication safety records."
        size="lg"
      >
        <div className="space-y-4">
          <SearchInput
            autoFocus
            placeholder="Type patient name, MRN, symptom, or drug name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onClear={() => setSearchQuery("")}
          />

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {filteredSearchResults.length > 0 ? (
              filteredSearchResults.map((result, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSearchOpen(false);
                    navigate(result.path);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-border/80 bg-muted/20 p-3 text-left transition-all hover:border-accent/40 hover:bg-card"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-foreground">{result.title}</span>
                      <Badge variant="teal" size="sm">{result.type}</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{result.detail}</p>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </button>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-muted-foreground">
                No matching records found for &quot;{searchQuery}&quot;.
              </p>
            )}
          </div>
        </div>
      </Modal>

      {/* ====================================================================
          CLINICAL NOTIFICATIONS SLIDEOVER
         ==================================================================== */}
      <Modal
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        title="Clinical Alerts & Notifications"
        description="Real-time medication safety alerts, newly ingested lab reports, and pending consultation reviews."
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all as read
            </Button>
            <Button variant="outline" size="sm" onClick={() => setNotificationsOpen(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className={cn(
                "rounded-xl border p-3.5 space-y-1 transition-all",
                notif.type === "danger" && "border-destructive/30 bg-destructive/5",
                notif.type === "warning" && "border-warning/30 bg-warning/5",
                notif.type === "info" && "border-accent/30 bg-accent/5",
                notif.unread && "ring-1 ring-accent/30",
              )}
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  {notif.type === "danger" && <AlertCircle className="size-3.5 text-destructive" />}
                  {notif.type === "warning" && <AlertCircle className="size-3.5 text-warning" />}
                  {notif.type === "info" && <Sparkles className="size-3.5 text-accent" />}
                  <span>{notif.title}</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{notif.time}</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{notif.desc}</p>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
