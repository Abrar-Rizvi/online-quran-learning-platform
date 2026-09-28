import { getCourseEnrollmentCounts } from "@/lib/admin-data";
import { WidgetCard, WidgetEmpty, WidgetError } from "./widget";

const TITLE = "Popular courses";
const LIMIT = 5;

/** Top courses by all-time enrollment count (backend already sorts most-enrolled first). */
export async function PopularCourses() {
  const counts = await getCourseEnrollmentCounts();
  if (!counts.ok) return <WidgetError title={TITLE} />;

  const top = counts.data.slice(0, LIMIT);
  const max = Math.max(1, ...top.map((c) => c.enrollment_count));

  return (
    <WidgetCard title={TITLE} subtitle="All-time enrollments">
      {top.length === 0 ? (
        <WidgetEmpty title="No enrollments yet" text="Courses are ranked here once families start enrolling." />
      ) : (
        <ol className="space-y-4">
          {top.map((c) => (
            <li key={c.course_id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-[var(--text)]">{c.course_name}</span>
                <span className="shrink-0 font-semibold text-[var(--green-900)] tabular-nums">
                  {c.enrollment_count}
                  <span className="sr-only"> {c.enrollment_count === 1 ? "enrollment" : "enrollments"}</span>
                </span>
              </div>
              <div aria-hidden="true" className="mt-1.5 h-2 overflow-hidden rounded-[var(--radius-full)] bg-[var(--surface-alt)]">
                <div
                  className="h-full rounded-[var(--radius-full)] bg-[var(--green-700)]"
                  style={{ width: `${(c.enrollment_count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </WidgetCard>
  );
}
