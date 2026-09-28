import Link from "next/link";
import { getAdminEnrollments, getAdminStudents, getAdminSummary } from "@/lib/admin-data";
import { countWithinLastDays } from "@/lib/admin-stats";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, ClockIcon, EnrollmentsIcon, StudentsIcon } from "../admin-icons";
import { fadeIn, Skeleton, WidgetError } from "./widget";

type Tone = "primary" | "neutral" | "warning" | "success";

const TONES: Record<Tone, { card: string; circle: string; label: string; value: string; sub: string }> = {
  primary: {
    card: "border-[var(--green-900)] bg-[var(--green-900)] hover:bg-[var(--green-800)]",
    circle: "bg-white/10 text-[var(--gold-400)]",
    label: "text-white",
    value: "text-[var(--gold-400)]",
    sub: "text-[var(--green-200)]",
  },
  neutral: {
    card: "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green-200)]",
    circle: "bg-[var(--green-50)] text-[var(--green-700)]",
    label: "text-[var(--text-muted)]",
    value: "text-[var(--green-900)]",
    sub: "text-[var(--text-muted)]",
  },
  warning: {
    card: "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--gold-300)]",
    circle: "bg-[var(--warning-bg)] text-[var(--warning)]",
    label: "text-[var(--text-muted)]",
    value: "text-[var(--green-900)]",
    sub: "text-[var(--warning)]",
  },
  success: {
    card: "border-[var(--border)] bg-[var(--surface)] hover:border-[var(--green-200)]",
    circle: "bg-[var(--success-bg)] text-[var(--success)]",
    label: "text-[var(--text-muted)]",
    value: "text-[var(--green-900)]",
    sub: "text-[var(--text-muted)]",
  },
};

function KpiCard({
  href,
  label,
  value,
  sub,
  tone,
  icon: Icon,
}: {
  href: string;
  label: string;
  value: number;
  sub?: string;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const t = TONES[tone];
  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col rounded-[var(--radius-lg)] border p-4 transition-colors duration-150 motion-reduce:transition-none sm:p-5",
        "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
        t.card,
      )}
    >
      <span className={cn("flex size-10 items-center justify-center rounded-[var(--radius-full)]", t.circle)}>
        <Icon className="size-5" />
      </span>
      <span className={cn("mt-3 text-sm font-medium", t.label)}>{label}</span>
      <span className={cn("mt-1 text-[2rem] font-bold leading-none tabular-nums", t.value)}>{value}</span>
      {sub && <span className={cn("mt-2 text-[0.8125rem] leading-snug tabular-nums", t.sub)}>{sub}</span>}
    </Link>
  );
}

export async function KpiRow() {
  const [summary, students, enrollments] = await Promise.all([
    getAdminSummary(),
    getAdminStudents(),
    getAdminEnrollments(),
  ]);
  if (!summary.ok) return <WidgetError title="Key numbers" />;

  const { total_students, total_enrollments, by_status } = summary.data;
  // Sub-lines only appear when their own source loaded — never guessed.
  const newStudents = students.ok
    ? countWithinLastDays(students.data.map((s) => s.created_at), 30)
    : null;
  const newEnrollments = enrollments.ok
    ? countWithinLastDays(enrollments.data.map((e) => e.enrolled_at), 30)
    : null;

  return (
    <section aria-label="Key numbers" className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6", fadeIn)}>
      <KpiCard
        href="/admin/students"
        tone="primary"
        icon={StudentsIcon}
        label="Total students"
        value={total_students}
        sub={newStudents === null ? undefined : `+${newStudents} new in the last 30 days`}
      />
      <KpiCard
        href="/admin/enrollments"
        tone="neutral"
        icon={EnrollmentsIcon}
        label="Total enrollments"
        value={total_enrollments}
        sub={newEnrollments === null ? undefined : `+${newEnrollments} in the last 30 days`}
      />
      <KpiCard
        href="/admin/enrollments?status=on_trial"
        tone="warning"
        icon={ClockIcon}
        label="On trial"
        value={by_status.on_trial}
        sub="Needs follow-up"
      />
      <KpiCard
        href="/admin/enrollments?status=active"
        tone="success"
        icon={CheckCircleIcon}
        label="Active"
        value={by_status.active}
        sub={`${by_status.cancelled} cancelled · ${by_status.alumni} alumni`}
      />
    </section>
  );
}

export function KpiRowSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5">
          <Skeleton className="size-10 rounded-[var(--radius-full)]" />
          <Skeleton className="mt-3 h-4 w-24" />
          <Skeleton className="mt-2 h-8 w-16" />
          <Skeleton className="mt-2 h-4 w-32 max-w-full" />
        </div>
      ))}
    </div>
  );
}
