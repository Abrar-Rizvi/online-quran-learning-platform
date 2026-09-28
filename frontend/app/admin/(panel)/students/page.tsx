import type { Metadata } from "next";
import Link from "next/link";
import { WidgetError, cardClasses } from "@/components/admin/dashboard/widget";
import { StatusBadge, STATUS_ORDER } from "@/components/admin/status";
import { StudentMutationsProvider } from "@/components/admin/students/student-mutations";
import { StudentRowActions } from "@/components/admin/students/student-row-actions";
import { StudentSheet } from "@/components/admin/students/student-sheet";
import { Pagination } from "@/components/admin/ui/pagination";
import { SearchInput } from "@/components/admin/ui/search-input";
import { TabLinks } from "@/components/admin/ui/tab-links";
import { ViewDetailsLink } from "@/components/admin/ui/view-details-link";
import { getAdminEnrollments, getAdminStudents } from "@/lib/admin-data";
import {
  SORT_OPTIONS,
  STUDENTS_PAGE_SIZE,
  enrollmentsByStudent,
  matchesStudentSearch,
  parseStudentsQuery,
  sortStudents,
  studentsHref,
  toStudentDetail,
  toStudentRow,
  type StudentRow,
} from "@/lib/admin-students";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Students",
};

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-10 text-center">
      <p className="font-medium text-[var(--green-900)]">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--text-muted)]">{children}</div>}
    </div>
  );
}

/** "1 Active · 1 On Trial" as compact tone badges, "None" when empty. */
function EnrollmentSummary({ enrollments }: { enrollments: StudentRow["enrollments"] }) {
  if (enrollments === null) return <span className="text-xs text-[var(--text-muted)]">Enrollment data unavailable.</span>;
  if (enrollments.total === 0) return <span className="text-[var(--text-muted)]">None</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {STATUS_ORDER.filter((s) => enrollments.mix[s]).map((s) => (
        <StatusBadge key={s} status={s} count={enrollments.mix[s]} />
      ))}
    </span>
  );
}

/**
 * Search, sort and pagination all happen here on the server from the URL
 * (?q, ?sort, ?page), so every view is shareable. ?view=<id> opens the detail
 * sheet (refresh-safe); ?edit=1 opens it straight into edit mode.
 */
export default async function AdminStudentsPage({ searchParams }: PageProps<"/admin/students">) {
  const query = parseStudentsQuery(await searchParams);
  const [students, enrollments] = await Promise.all([getAdminStudents(), getAdminEnrollments()]);

  if (!students.ok) {
    return <WidgetError title="Students" retryHref={studentsHref(query)} />;
  }

  // If enrollments failed, the list still renders; counts show "Enrollment data unavailable."
  const byStudent = enrollmentsByStudent(enrollments.ok ? enrollments.data : null);
  const filtered = sortStudents(
    students.data.filter((s) => matchesStudentSearch(s, query.q)),
    query.sort,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / STUDENTS_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * STUDENTS_PAGE_SIZE;
  const rows = filtered.slice(start, start + STUDENTS_PAGE_SIZE).map((s) => toStudentRow(s, byStudent));

  const base = { q: query.q, sort: query.sort, page };
  const viewHref = (id: number) => studentsHref({ ...base, view: id });
  const editHref = (id: number) => studentsHref({ ...base, view: id, edit: true });

  const selected = query.view ? students.data.find((s) => s.id === query.view) : undefined;

  return (
    <StudentMutationsProvider>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <h2 id="students-heading" tabIndex={-1} className="sr-only">
          Student list
        </h2>

        <section className={cn(cardClasses, "p-0 sm:p-0")} aria-labelledby="students-heading">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
            <SearchInput
              label="Search students"
              placeholder="Search name, email, phone, AOA number or country"
              resetParams={["view", "edit"]}
              className="w-full xl:max-w-md"
            />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <TabLinks
                label="Sort students"
                items={SORT_OPTIONS.map((o) => ({
                  label: o.label,
                  current: query.sort === o.key,
                  href: studentsHref({ q: query.q, sort: o.key }),
                }))}
              />
              {filtered.length > 0 && (
                <p className="shrink-0 text-sm text-[var(--text-muted)] tabular-nums" aria-live="polite">
                  Showing {start + 1}–{start + rows.length} of {filtered.length}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {students.data.length === 0 ? (
              <Message title="No students yet.">Students are created automatically when someone enrolls on the website.</Message>
            ) : rows.length === 0 ? (
              <Message title="No students match your search.">
                <Link
                  href={studentsHref({ sort: query.sort })}
                  className="rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                >
                  Clear search
                </Link>
              </Message>
            ) : (
              <>
                {/* Mobile/tablet: stacked cards */}
                <ul className="flex flex-col gap-3 lg:hidden">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                      <p className="truncate font-semibold text-[var(--text)]">{r.name}</p>
                      <p className="text-xs text-[var(--text-muted)] tabular-nums">{r.registrationNo}</p>
                      <p className="mt-1.5 truncate text-sm text-[var(--text)]">{r.email}</p>
                      <div className="mt-2 text-sm">
                        <EnrollmentSummary enrollments={r.enrollments} />
                      </div>
                      <p className="mt-2 text-sm text-[var(--text-muted)] tabular-nums">Joined {r.joined}</p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <ViewDetailsLink id={r.id} name={r.name} href={viewHref(r.id)} className="flex-1 justify-center" />
                        <StudentRowActions row={r} viewHref={viewHref(r.id)} editHref={editHref(r.id)} menuOnly />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop/laptop: table. `relative` keeps the sr-only header label inside the scroll box. */}
                <div className="relative -mx-2 hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        <th scope="col" className="px-2 pb-2.5 font-medium">Student</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Contact</th>
                        <th scope="col" className="hidden px-2 pb-2.5 font-medium xl:table-cell">Country</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Enrollments</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Joined</th>
                        <th scope="col" className="px-2 pb-2.5 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {rows.map((r) => (
                        <tr key={r.id} className="transition-colors duration-150 hover:bg-[var(--bg)] motion-reduce:transition-none">
                          <td className="px-2 py-3">
                            <p className="font-medium text-[var(--text)]">{r.name}</p>
                            <p className="text-xs text-[var(--text-muted)] tabular-nums">{r.registrationNo}</p>
                          </td>
                          <td className="max-w-[16rem] px-2 py-3">
                            <p className="truncate text-[var(--text)]">{r.email}</p>
                            {/* Secondary line only where there's room; everything is in the sheet. */}
                            <p className="hidden text-xs text-[var(--text-muted)] tabular-nums xl:block">{r.phone ?? "—"}</p>
                          </td>
                          <td className="hidden px-2 py-3 text-[var(--text)] xl:table-cell">{r.country || "—"}</td>
                          <td className="px-2 py-3">
                            <EnrollmentSummary enrollments={r.enrollments} />
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{r.joined}</td>
                          <td className="px-2 py-2">
                            <StudentRowActions row={r} viewHref={viewHref(r.id)} editHref={editHref(r.id)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-[var(--border)] p-4 sm:p-5">
              <Pagination page={page} totalPages={totalPages} hrefFor={(p) => studentsHref({ ...base, page: p })} />
            </div>
          )}
        </section>
      </div>

      {selected && (
        <StudentSheet
          key={selected.id}
          student={toStudentDetail(selected, byStudent)}
          initialEdit={query.edit}
          closeHref={studentsHref(base)}
          viewHref={viewHref(selected.id)}
        />
      )}
    </StudentMutationsProvider>
  );
}
