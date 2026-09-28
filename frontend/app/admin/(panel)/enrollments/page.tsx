import type { Metadata } from "next";
import Link from "next/link";
import { WidgetError, cardClasses } from "@/components/admin/dashboard/widget";
import { EnrollmentMutationsProvider } from "@/components/admin/enrollments/enrollment-mutations";
import { EnrollmentRowActions, ViewEnrollmentLink } from "@/components/admin/enrollments/enrollment-row-actions";
import { EnrollmentSheet } from "@/components/admin/enrollments/enrollment-sheet";
import { StatusBadge } from "@/components/admin/status";
import { Pagination } from "@/components/admin/ui/pagination";
import { SearchInput } from "@/components/admin/ui/search-input";
import { TabLinks } from "@/components/admin/ui/tab-links";
import { getAdminEnrollments, getAdminStudents } from "@/lib/admin-data";
import {
  ENROLLMENTS_PAGE_SIZE,
  STATUS_TABS,
  contactFor,
  countByStatus,
  enrollmentsHref,
  matchesSearch,
  newestFirst,
  parseEnrollmentsQuery,
  toEnrollmentRow,
} from "@/lib/admin-enrollments";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Enrollments",
};

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-10 text-center">
      <p className="font-medium text-[var(--green-900)]">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--text-muted)]">{children}</div>}
    </div>
  );
}

/**
 * All filtering, search and pagination happen here on the server from the
 * URL (?status, ?q, ?page), so every view is shareable. ?view=<id> opens the
 * detail sheet — refresh-safe and always rendered from fresh data.
 */
export default async function AdminEnrollmentsPage({ searchParams }: PageProps<"/admin/enrollments">) {
  const query = parseEnrollmentsQuery(await searchParams);
  const [enrollments, students] = await Promise.all([getAdminEnrollments(), getAdminStudents()]);

  if (!enrollments.ok) {
    return <WidgetError title="Enrollments" retryHref={enrollmentsHref(query)} />;
  }

  const all = newestFirst(enrollments.data);
  const counts = countByStatus(all);
  const filtered = all.filter(
    (e) => (query.status === "all" || e.status === query.status) && matchesSearch(e, query.q),
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / ENROLLMENTS_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * ENROLLMENTS_PAGE_SIZE;
  const rows = filtered.slice(start, start + ENROLLMENTS_PAGE_SIZE).map(toEnrollmentRow);

  const base = { status: query.status, q: query.q, page };
  const viewHref = (id: number) => enrollmentsHref({ ...base, view: id });

  const selected = query.view ? all.find((e) => e.id === query.view) : undefined;
  const hasFilters = query.status !== "all" || query.q !== "";

  return (
    <EnrollmentMutationsProvider>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <h2 id="enrollments-heading" tabIndex={-1} className="sr-only">
          Enrollment list
        </h2>

        <TabLinks
          label="Filter by status"
          items={STATUS_TABS.map((t) => ({
            label: t.label,
            count: counts[t.key],
            current: query.status === t.key,
            href: enrollmentsHref({ status: t.key, q: query.q }),
          }))}
        />

        <section className={cn(cardClasses, "p-0 sm:p-0")} aria-labelledby="enrollments-heading">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <SearchInput
              label="Search enrollments"
              placeholder="Search name, email, AOA number or course"
              resetParams={["view"]}
              className="w-full sm:max-w-md"
            />
            {filtered.length > 0 && (
              <p className="shrink-0 text-sm text-[var(--text-muted)] tabular-nums" aria-live="polite">
                Showing {start + 1}–{start + rows.length} of {filtered.length}
              </p>
            )}
          </div>

          <div className="p-4 sm:p-5">
            {all.length === 0 ? (
              <Message title="No enrollments yet.">New sign-ups from the website will appear here.</Message>
            ) : rows.length === 0 ? (
              <Message title="No enrollments match your filters.">
                {hasFilters && (
                  <Link
                    href="/admin/enrollments"
                    className="font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] rounded-[var(--radius-sm)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                  >
                    Clear filters
                  </Link>
                )}
              </Message>
            ) : (
              <>
                {/* Mobile/tablet: stacked cards */}
                <ul className="flex flex-col gap-3 lg:hidden">
                  {rows.map((r) => (
                    <li key={r.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-[var(--text)]">{r.name}</p>
                          <p className="text-xs text-[var(--text-muted)] tabular-nums">{r.registrationNo}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      <p className="mt-2 text-sm text-[var(--text)]">{r.course}</p>
                      <p className="text-sm text-[var(--text-muted)] tabular-nums">
                        {r.plan} · {r.enrolled}
                      </p>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <ViewEnrollmentLink id={r.id} name={r.name} href={viewHref(r.id)} className="flex-1 justify-center" />
                        <EnrollmentRowActions row={r} menuOnly />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop/laptop: table (scrolls inside its own box if ever too narrow).
                    `relative` keeps the sr-only header label inside this box, not the page. */}
                <div className="relative -mx-2 hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        <th scope="col" className="px-2 pb-2.5 font-medium">Student</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Course</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Plan</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Status</th>
                        <th scope="col" className="hidden px-2 pb-2.5 font-medium xl:table-cell">Preferred time</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Enrolled</th>
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
                            {/* No room at laptop width; the email is one click away in the detail sheet. */}
                            <p className="hidden text-xs text-[var(--text-muted)] xl:block">{r.email}</p>
                          </td>
                          <td className="px-2 py-3 text-[var(--text)]">{r.course}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{r.plan}</td>
                          <td className="px-2 py-3">
                            <StatusBadge status={r.status} />
                          </td>
                          <td className="hidden whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums xl:table-cell">
                            {r.preferredTime ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{r.enrolled}</td>
                          <td className="px-2 py-2">
                            <EnrollmentRowActions row={r} viewHref={viewHref(r.id)} />
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
              <Pagination page={page} totalPages={totalPages} hrefFor={(p) => enrollmentsHref({ ...base, page: p })} />
            </div>
          )}
        </section>
      </div>

      {selected && (
        <EnrollmentSheet
          key={selected.id}
          row={toEnrollmentRow(selected)}
          contact={contactFor(selected.student.id, students.ok ? students.data : null)}
          closeHref={enrollmentsHref(base)}
        />
      )}
    </EnrollmentMutationsProvider>
  );
}
