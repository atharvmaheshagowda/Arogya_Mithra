import {
  createContext,
  useContext,
  useState,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronRight, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Tabs Component
   ========================================================================== */

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultValue);
  const activeTab = value !== undefined ? value : internalTab;

  const setActiveTab = (nextTab: string) => {
    if (value === undefined) setInternalTab(nextTab);
    onValueChange?.(nextTab);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn("space-y-4", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export function TabsList({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "inline-flex h-11 items-center gap-1 rounded-xl bg-muted/70 p-1 text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export interface TabsTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  value: string;
  disabled?: boolean;
}

export function TabsTrigger({
  value,
  disabled,
  className,
  children,
  ...props
}: TabsTriggerProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const isActive = context.activeTab === value;

  return (
    <button
      type="button"
      role="tab"
      disabled={disabled}
      aria-selected={isActive}
      onClick={() => context.setActiveTab(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-card text-foreground shadow-xs"
          : "text-muted-foreground hover:bg-background/40 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export function TabsContent({ value, className, children, ...props }: TabsContentProps) {
  const context = useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  if (context.activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/* ==========================================================================
   Breadcrumbs Component
   ========================================================================== */

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export function Breadcrumbs({
  items,
  className,
}: {
  items: BreadcrumbItem[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center text-xs", className)}>
      <ol className="flex items-center gap-1.5 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.label} className="flex items-center gap-1.5">
              {item.href && !isLast ? (
                <a
                  href={item.href}
                  className="transition-colors hover:text-foreground hover:underline"
                >
                  {item.label}
                </a>
              ) : (
                <span
                  className={cn(
                    "font-medium",
                    isLast ? "text-foreground font-semibold" : "text-muted-foreground",
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronRight className="size-3.5 text-muted-foreground/60" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ==========================================================================
   Clinical Stepper (Interactive Step Flow)
   ========================================================================== */

export interface StepItem {
  id: string;
  title: string;
  subtitle?: string;
}

export interface StepperProps {
  steps: StepItem[];
  currentStepIndex: number;
  onStepClick?: (index: number) => void;
  className?: string;
}

export function Stepper({
  steps,
  currentStepIndex,
  onStepClick,
  className,
}: StepperProps) {
  return (
    <div className={cn("flex items-center justify-between gap-2 overflow-x-auto py-2", className)}>
      {steps.map((step, index) => {
        const isComplete = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isUpcoming = index > currentStepIndex;

        return (
          <div key={step.id} className="flex items-center gap-2 flex-1 min-w-36">
            <button
              type="button"
              disabled={!onStepClick || isUpcoming}
              onClick={() => onStepClick?.(index)}
              className={cn(
                "group flex items-center gap-2.5 text-left transition-colors",
                onStepClick && !isUpcoming && "cursor-pointer",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-all",
                  isComplete && "bg-accent text-accent-foreground",
                  isCurrent && "border-2 border-accent bg-accent/15 text-accent font-extrabold",
                  isUpcoming && "border border-border bg-muted text-muted-foreground",
                )}
              >
                {isComplete ? <Check className="size-4 stroke-[3]" /> : index + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-xs font-semibold truncate leading-tight",
                    isCurrent ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {step.title}
                </p>
                {step.subtitle && (
                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                    {step.subtitle}
                  </p>
                )}
              </div>
            </button>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 rounded-full transition-colors",
                  isComplete ? "bg-accent" : "bg-border",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
