import { cn } from "@/lib/utils";

export interface BrandSymbolProps {
  className?: string;
  size?: number;
}

/**
 * Minimal healthcare-inspired brand symbol for AAROGYA MITHRA.
 *
 * Represents:
 * - Trust & Patient Safety (protective outer contour)
 * - Doctor + AI Copilot Synergy (two interlocking harmonic arcs)
 * - Clinical Vitality (illuminated center pulse beacon)
 */
export function AarogyaMithraSymbol({ className = "size-8" }: BrandSymbolProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 select-none", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="am-brand-shield" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0D9488" />
          <stop offset="100%" stopColor="#102A43" />
        </linearGradient>
        <linearGradient id="am-brand-teal" x1="10" y1="8" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0D9488" />
        </linearGradient>
      </defs>

      {/* Rounded container with subtle clinical navy backdrop */}
      <rect width="32" height="32" rx="8" className="fill-[#102A43] dark:fill-card" />

      {/* Protective shield silhouette with soft opacity */}
      <path
        d="M16 4.5C10.5 4.5 7 7.5 7 13.5C7 19.8 12.2 24.5 16 26.5C19.8 24.5 25 19.8 25 13.5C25 7.5 21.5 4.5 16 4.5Z"
        stroke="url(#am-brand-teal)"
        strokeWidth="1.8"
        strokeLinejoin="round"
        opacity="0.45"
      />

      {/* Doctor-led Clinical Anchor (Left embrace loop) */}
      <path
        d="M11.5 14C11.5 10.8 13.5 8.5 16 8.5C18.5 8.5 20.5 10.5 20.5 13.5C20.5 17.5 16 20.8 16 23.2"
        stroke="url(#am-brand-teal)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* Mithra Intelligent Safeguard (Right embrace loop) */}
      <path
        d="M20.5 17C20.5 19.8 18.5 22.2 16 22.2C13.5 22.2 11.5 20 11.5 17C11.5 13.2 16 9.8 16 7.8"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.95"
      />

      {/* Clinical Focal Core / Vital Pulse Node */}
      <circle cx="16" cy="15" r="2.2" fill="#2DD4BF" />
    </svg>
  );
}

export interface BrandProps {
  compact?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

/**
 * Official AAROGYA MITHRA wordmark and identity component.
 */
export function AarogyaMithraBrand({
  compact = false,
  showSubtitle = false,
  className,
}: BrandProps) {
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <AarogyaMithraSymbol className="size-8" />
      {!compact && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-baseline gap-1.5">
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              AAROGYA
            </span>
            <span className="font-sans text-lg font-semibold tracking-tight text-accent">
              MITHRA
            </span>
          </div>
          {showSubtitle && (
            <span className="text-[9px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
              AI Clinical Copilot
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Deprecated alias for backwards compatibility during migration
export const ColossusBrand = AarogyaMithraBrand;
