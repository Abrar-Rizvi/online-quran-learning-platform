import { getEnrollmentStatusLabel } from "@/lib/enrollment";
import { TRIAL_REQUEST_STATUS_LABELS } from "@/lib/trial-requests";
import { cn } from "@/lib/utils";

/** Display order + brand tones for enrollment statuses (always paired with a text label). */
export const STATUS_ORDER = ["active", "on_trial", "alumni", "cancelled"] as const;
export type StatusKey = (typeof STATUS_ORDER)[number];

export const STATUS_TONES: Record<StatusKey, { fg: string; bg: string; chart: string; chartOpacity?: number }> = {
  active: { fg: "var(--success)", bg: "var(--success-bg)", chart: "var(--success)" },
  on_trial: { fg: "var(--warning)", bg: "var(--warning-bg)", chart: "var(--gold-600)" },
  alumni: { fg: "var(--info)", bg: "var(--info-bg)", chart: "var(--info)" },
  // Muted: cancelled is the least important slice.
  cancelled: { fg: "var(--error)", bg: "var(--error-bg)", chart: "var(--error)", chartOpacity: 0.7 },
};

export function StatusBadge({ status, count, className }: { status: string; count?: number; className?: string }) {
  const tone = STATUS_TONES[status as StatusKey];
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={tone ? { color: tone.fg, backgroundColor: tone.bg } : { color: "var(--text-muted)", backgroundColor: "var(--surface-alt)" }}
    >
      {count !== undefined && <span className="mr-1 tabular-nums">{count}</span>}
      {getEnrollmentStatusLabel(status)}
    </span>
  );
}

/** Blog post status: Draft is neutral, Published uses the success tone. Text is always shown. */
export function PostStatusBadge({ status, className }: { status: "draft" | "published"; className?: string }) {
  const published = status === "published";
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      style={
        published
          ? { color: "var(--success)", backgroundColor: "var(--success-bg)" }
          : { color: "var(--text-muted)", backgroundColor: "var(--surface-alt)" }
      }
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

/**
 * Trial-request status, reusing the enrollment tones where they mean the same:
 * On trial = the on_trial (warning) tone, Enrolled = the active (success)
 * tone, Cancelled = the muted cancelled (error) tone.
 */
export function TrialStatusBadge({ status, className }: { status: string; className?: string }) {
  const tone =
    status === "enrolled" ? STATUS_TONES.active : status === "cancelled" ? STATUS_TONES.cancelled : STATUS_TONES.on_trial;
  const label = TRIAL_REQUEST_STATUS_LABELS[status as keyof typeof TRIAL_REQUEST_STATUS_LABELS] ?? status;
  return (
    <span
      className={cn("inline-flex items-center whitespace-nowrap rounded-[var(--radius-full)] px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ color: tone.fg, backgroundColor: tone.bg }}
    >
      {label}
    </span>
  );
}
