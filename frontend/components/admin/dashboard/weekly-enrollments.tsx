import { getAdminEnrollments } from "@/lib/admin-data";
import { weeklyCounts } from "@/lib/admin-stats";
import { WidgetCard, WidgetEmpty, WidgetError } from "./widget";

const TITLE = "New enrollments";
const WEEKS = 8;

/** Enrollments per Monday-start week (admin time zone), last 8 weeks; current week in gold. */
export async function WeeklyEnrollments() {
  const enrollments = await getAdminEnrollments();
  if (!enrollments.ok) return <WidgetError title={TITLE} />;

  const card = (children: React.ReactNode) => (
    <WidgetCard title={TITLE} subtitle="How many families enrolled each week?">
      {children}
    </WidgetCard>
  );

  if (enrollments.data.length === 0) {
    return card(
      <WidgetEmpty
        title="No enrollments yet"
        text="Enrollments from the website form will appear here, week by week."
      />,
    );
  }

  const weeks = weeklyCounts(enrollments.data.map((e) => e.enrolled_at), WEEKS);
  const max = Math.max(1, ...weeks.map((w) => w.count));

  return card(
    <>
      {/* Visual chart — the table below is its text equivalent for screen readers. */}
      <div aria-hidden="true" className="flex flex-1 flex-col">
        <div className="relative flex h-44 items-end gap-2 border-b border-[var(--border)] sm:gap-3">
          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--border)]" />
          {weeks.map((w) => (
            <div key={w.label} className="group relative flex h-full flex-1 flex-col items-center justify-end">
              <span
                className={
                  "mb-1 text-xs font-semibold tabular-nums " +
                  (w.isCurrent ? "text-[var(--gold-700)]" : "text-[var(--text-muted)] group-hover:text-[var(--green-900)]")
                }
              >
                {w.count}
              </span>
              <div
                className="w-full max-w-10 rounded-t-[4px] transition-opacity duration-150 group-hover:opacity-85 motion-reduce:transition-none"
                style={{
                  height: w.count === 0 ? 2 : `${(w.count / max) * 80}%`,
                  backgroundColor: w.isCurrent ? "var(--gold-600)" : "var(--green-700)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2 sm:gap-3">
          {weeks.map((w) => (
            <span
              key={w.label}
              className="flex-1 text-center text-[11px] leading-tight text-[var(--text-muted)] tabular-nums"
            >
              {w.label}
            </span>
          ))}
        </div>
        <p className="mt-3 flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <span className="inline-block size-2.5 rounded-[2px] bg-[var(--gold-600)]" /> This week
          <span className="ml-2 inline-block size-2.5 rounded-[2px] bg-[var(--green-700)]" /> Earlier weeks
          <span className="ml-auto">Weeks start Monday</span>
        </p>
      </div>

      {/* The wrapper does the hiding: tables ignore sr-only's 1px width. */}
      <div className="sr-only">
        <table>
          <caption>New enrollments per week, last {WEEKS} weeks (weeks start Monday)</caption>
          <thead>
            <tr>
              <th scope="col">Week starting</th>
              <th scope="col">Enrollments</th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.label}>
                <th scope="row">
                  {w.label}
                  {w.isCurrent ? " (this week)" : ""}
                </th>
                <td>{w.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>,
  );
}
