import Link from "next/link";
import { getAdminEnrollments, type AdminEnrollment } from "@/lib/admin-data";
import { formatAdminDate, parseApiDate } from "@/lib/admin-format";
import { formatPlanLabel } from "@/lib/enrollment";
import { ArrowRightIcon } from "../admin-icons";
import { StatusBadge } from "../status";
import { WidgetCard, WidgetEmpty, WidgetError } from "./widget";

const TITLE = "Recent enrollments";
const LIMIT = 6;

function planLabel(e: AdminEnrollment): string {
  return formatPlanLabel(e.days_per_week, e.fee, e.currency);
}

function ViewAll() {
  return (
    <Link
      href="/admin/enrollments"
      className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-sm)] text-sm font-medium text-[var(--green-700)] hover:text-[var(--green-800)] hover:underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
    >
      View all
      <ArrowRightIcon className="size-4" />
    </Link>
  );
}

export async function RecentEnrollments() {
  const enrollments = await getAdminEnrollments();
  if (!enrollments.ok) return <WidgetError title={TITLE} />;

  const recent = [...enrollments.data]
    .sort((a, b) => parseApiDate(b.enrolled_at).getTime() - parseApiDate(a.enrolled_at).getTime() || b.id - a.id)
    .slice(0, LIMIT);

  if (recent.length === 0) {
    return (
      <WidgetCard title={TITLE} subtitle="The newest sign-ups from the website">
        <WidgetEmpty title="No enrollments yet" text="New enrollments will show up here as soon as families sign up." />
      </WidgetCard>
    );
  }

  return (
    <WidgetCard title={TITLE} subtitle="The newest sign-ups from the website" action={<ViewAll />}>
      {/* Mobile: stacked rows */}
      <ul className="divide-y divide-[var(--border)] md:hidden">
        {recent.map((e) => (
          <li key={e.id} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--text)]">{e.student.name}</p>
                <p className="text-xs text-[var(--text-muted)] tabular-nums">{e.student.registration_no}</p>
              </div>
              <StatusBadge status={e.status} />
            </div>
            <p className="mt-1.5 text-sm text-[var(--text)]">{e.course_name}</p>
            <p className="text-sm text-[var(--text-muted)] tabular-nums">
              {planLabel(e)} · {formatAdminDate(parseApiDate(e.enrolled_at))}
            </p>
          </li>
        ))}
      </ul>

      {/* Tablet/desktop: table (scrolls inside its own box if ever too narrow) */}
      <div className="-mx-2 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
              <th scope="col" className="px-2 pb-2 font-medium">Student</th>
              <th scope="col" className="px-2 pb-2 font-medium">Course</th>
              <th scope="col" className="px-2 pb-2 font-medium">Plan</th>
              <th scope="col" className="px-2 pb-2 font-medium">Status</th>
              <th scope="col" className="px-2 pb-2 font-medium">Enrolled</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {recent.map((e) => (
              <tr key={e.id}>
                <td className="px-2 py-3">
                  <p className="font-medium text-[var(--text)]">{e.student.name}</p>
                  <p className="text-xs text-[var(--text-muted)] tabular-nums">{e.student.registration_no}</p>
                </td>
                <td className="px-2 py-3 text-[var(--text)]">{e.course_name}</td>
                <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{planLabel(e)}</td>
                <td className="px-2 py-3">
                  <StatusBadge status={e.status} />
                </td>
                <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">
                  {formatAdminDate(parseApiDate(e.enrolled_at))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}
