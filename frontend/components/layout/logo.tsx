import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Use light colors for dark backgrounds (footer). */
  variant?: "default" | "light";
  className?: string;
  /** Link target — defaults to the public homepage. */
  href?: string;
  /** Accessible name for the link; defaults to the homepage label. */
  ariaLabel?: string;
}

export function Logo({
  variant = "default",
  className,
  href = "/",
  ariaLabel = "Adan Online Academy — Home",
}: LogoProps) {
  const isLight = variant === "light";
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 rounded-[var(--radius-sm)]",
        className,
      )}
      aria-label={ariaLabel}
    >
      <span
        lang="ar"
        dir="rtl"
        className={cn(
          "text-[28px] font-bold leading-none",
          isLight ? "text-[var(--gold-400)]" : "text-[var(--gold-700)]",
        )}
      >
        عدن
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-xl font-semibold tracking-tight font-[family-name:var(--font-heading)]",
            isLight ? "text-white" : "text-[var(--green-900)]",
          )}
        >
          Adan
        </span>
        <span
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.12em]",
            isLight ? "text-[var(--green-200)]" : "text-[var(--text-muted)]",
          )}
        >
          Online Academy
        </span>
      </span>
    </Link>
  );
}
