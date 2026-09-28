import { getAdminSummary } from "@/lib/admin-data";
import { getEnrollmentStatusLabel } from "@/lib/enrollment";
import { STATUS_ORDER, STATUS_TONES } from "../status";
import { WidgetCard, WidgetEmpty, WidgetError } from "./widget";

const TITLE = "Enrollment status";

/** Donut of summary.by_status with a text legend (label + count + %) — never color alone. */
export async function StatusBreakdown() {
  const summary = await getAdminSummary();
  if (!summary.ok) return <WidgetError title={TITLE} />;

  const { by_status, total_enrollments } = summary.data;
  const total = STATUS_ORDER.reduce((sum, key) => sum + by_status[key], 0);

  if (total === 0) {
    return (
      <WidgetCard title={TITLE} subtitle="Where every enrollment stands">
        <WidgetEmpty title="No enrollments yet" text="Status breakdown appears after the first enrollment." />
      </WidgetCard>
    );
  }

  const rows = STATUS_ORDER.map((key) => ({
    key,
    label: getEnrollmentStatusLabel(key),
    count: by_status[key],
    pct: Math.round((by_status[key] / total) * 100),
  }));

  // Circumference 100 (r = 100 / 2π) so dash lengths are plain percentages.
  const R = 15.9155;
  const visible = rows.filter((r) => r.count > 0);
  const segments = visible.map((r, i) => ({
    ...r,
    length: (r.count / total) * 100,
    // Each slice starts where the previous ones end.
    offset: visible.slice(0, i).reduce((sum, prev) => sum + (prev.count / total) * 100, 0),
  }));

  const description = rows.map((r) => `${r.label} ${r.count} (${r.pct}%)`).join(", ");

  return (
    <WidgetCard title={TITLE} subtitle="Where every enrollment stands">
      {/* Container query: side-by-side only when the card itself is wide enough (≥ 24rem). */}
      <div className="@container flex flex-1 flex-col">
        <div className="flex flex-1 flex-col items-center gap-6 @sm:flex-row">
          <div className="relative size-36 shrink-0">
            <svg viewBox="0 0 36 36" className="size-full -rotate-90" role="img" aria-label={`Enrollment status: ${description}.`}>
              <circle cx="18" cy="18" r={R} fill="none" stroke="var(--surface-alt)" strokeWidth="4" />
              {segments.map((s) => (
                <circle
                  key={s.key}
                  cx="18"
                  cy="18"
                  r={R}
                  fill="none"
                  stroke={STATUS_TONES[s.key].chart}
                  strokeOpacity={STATUS_TONES[s.key].chartOpacity ?? 1}
                  strokeWidth="4"
                  strokeDasharray={`${s.length} ${100 - s.length}`}
                  strokeDashoffset={-s.offset}
                />
              ))}
            </svg>
            <div aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold leading-none text-[var(--green-900)] tabular-nums">{total_enrollments}</span>
              <span className="mt-1 text-xs text-[var(--text-muted)]">total</span>
            </div>
          </div>

          <ul className="w-full min-w-0 flex-1 space-y-2.5">
            {rows.map((r) => (
              <li key={r.key} className="grid grid-cols-[auto_minmax(0,1fr)_auto_3rem] items-center gap-x-3 text-sm">
                <span
                  aria-hidden="true"
                  className="inline-block size-3 rounded-[3px]"
                  style={{ backgroundColor: STATUS_TONES[r.key].chart, opacity: STATUS_TONES[r.key].chartOpacity ?? 1 }}
                />
                <span className="truncate text-[var(--text)]">{r.label}</span>
                <span className="text-right font-semibold text-[var(--green-900)] tabular-nums">{r.count}</span>
                <span className="text-right text-[var(--text-muted)] tabular-nums">{r.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </WidgetCard>
  );
}
