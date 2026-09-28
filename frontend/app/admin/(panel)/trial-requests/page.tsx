import type { Metadata } from "next";
import Link from "next/link";
import { WidgetError, cardClasses } from "@/components/admin/dashboard/widget";
import { TrialStatusBadge } from "@/components/admin/status";
import { TrialMutationsProvider } from "@/components/admin/trial-requests/trial-mutations";
import { TrialRowActions } from "@/components/admin/trial-requests/trial-row-actions";
import { StudentBadge, TrialSheet } from "@/components/admin/trial-requests/trial-sheet";
import { Pagination } from "@/components/admin/ui/pagination";
import { SearchInput } from "@/components/admin/ui/search-input";
import { TabLinks } from "@/components/admin/ui/tab-links";
import { ViewDetailsLink } from "@/components/admin/ui/view-details-link";
import { getAdminStudents, getAdminTrialRequests } from "@/lib/admin-data";
import {
  TRIAL_REQUESTS_PAGE_SIZE,
  TRIAL_TABS,
  countByTrialStatus,
  matchesTrialSearch,
  newestFirst,
  parseTrialRequestsQuery,
  studentsByEmail,
  toCourseOptions,
  toTrialRequestRow,
  trialRequestsHref,
} from "@/lib/admin-trial-requests";
import { fetchCourses, fetchFees } from "@/lib/api";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Trial requests",
};

const textLinkClass =
  "rounded-[var(--radius-sm)] text-[var(--green-700)] underline-offset-4 hover:text-[var(--green-800)] hover:underline focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-10 text-center">
      <p className="font-medium text-[var(--green-900)]">{title}</p>
      {children && <div className="mt-1 text-sm text-[var(--text-muted)]">{children}</div>}
    </div>
  );
}

/**
 * "Book a Free Trial" requests. Filtering (?status, default On trial), search
 * (?q) and pagination (?page) run here on the server. ?view=<id> opens the
 * detail sheet; ?enroll=1 opens it on the "Enroll this student" form.
 */
export default async function AdminTrialRequestsPage({ searchParams }: PageProps<"/admin/trial-requests">) {
  const query = parseTrialRequestsQuery(await searchParams);
  const [requests, students] = await Promise.all([getAdminTrialRequests(), getAdminStudents()]);

  if (!requests.ok) {
    return <WidgetError title="Trial requests" retryHref={trialRequestsHref(query)} />;
  }

  // Student badges are a display-only email match; if students failed, they're simply left out.
  const byEmail = studentsByEmail(students.ok ? students.data : null);
  const all = newestFirst(requests.data);
  const counts = countByTrialStatus(all);
  const filtered = all.filter((r) => (query.status === "all" || r.status === query.status) && matchesTrialSearch(r, query.q));

  const totalPages = Math.max(1, Math.ceil(filtered.length / TRIAL_REQUESTS_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * TRIAL_REQUESTS_PAGE_SIZE;
  const rows = filtered.slice(start, start + TRIAL_REQUESTS_PAGE_SIZE).map((r) => toTrialRequestRow(r, byEmail));

  const base = { status: query.status, q: query.q, page };
  const viewHref = (id: number) => trialRequestsHref({ ...base, view: id });
  const enrollHref = (id: number) => trialRequestsHref({ ...base, view: id, enroll: true });

  const selected = query.view ? all.find((r) => r.id === query.view) : undefined;
  // Courses/plans (public, cached) are only needed once a sheet is open.
  const courses = selected ? toCourseOptions(...(await Promise.all([fetchCourses(), fetchFees()]))) : null;

  return (
    <TrialMutationsProvider>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <h2 id="trial-requests-heading" tabIndex={-1} className="sr-only">
          Trial request list
        </h2>

        <TabLinks
          label="Filter by status"
          items={TRIAL_TABS.map((t) => ({
            label: t.label,
            count: counts[t.key],
            current: query.status === t.key,
            href: trialRequestsHref({ status: t.key, q: query.q }),
          }))}
        />

        <section className={cn(cardClasses, "p-0 sm:p-0")} aria-labelledby="trial-requests-heading">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <SearchInput
              label="Search trial requests"
              placeholder="Search name, email, WhatsApp or country"
              resetParams={["view", "enroll"]}
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
              <Message title="No trial requests yet.">Requests from the Book a Free Trial page will appear here.</Message>
            ) : rows.length === 0 ? (
              <Message title={query.q ? "No trial requests match your search." : "Nothing in this tab."}>
                {query.q && (
                  <Link href={trialRequestsHref({ status: query.status })} className={cn("font-medium underline", textLinkClass)}>
                    Clear search
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
                        <p className="min-w-0 truncate font-semibold text-[var(--text)]">{r.name}</p>
                        <TrialStatusBadge status={r.status} className="shrink-0" />
                      </div>
                      <p className="mt-1.5 truncate text-sm">
                        <a href={`mailto:${r.email}`} className={textLinkClass}>
                          {r.email}
                        </a>
                      </p>
                      <p className="text-sm text-[var(--text-muted)] tabular-nums">
                        {r.whatsapp} · {r.country}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)] tabular-nums">
                        Requested {r.requested}
                        {r.student && <StudentBadge student={r.student} />}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <ViewDetailsLink id={r.id} name={r.name} href={viewHref(r.id)} className="flex-1 justify-center" />
                        <TrialRowActions row={r} viewHref={viewHref(r.id)} enrollHref={enrollHref(r.id)} menuOnly />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop/laptop: table (scrolls inside its own box if ever too narrow). */}
                <div className="relative -mx-2 hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        <th scope="col" className="px-2 pb-2.5 font-medium">Name</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Email</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">WhatsApp</th>
                        <th scope="col" className="hidden px-2 pb-2.5 font-medium xl:table-cell">Country</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Status</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Requested</th>
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
                            {r.student && <StudentBadge student={r.student} className="mt-1" />}
                          </td>
                          <td className="max-w-[15rem] px-2 py-3">
                            <a href={`mailto:${r.email}`} className={cn("block truncate", textLinkClass)}>
                              {r.email}
                            </a>
                          </td>
                          <td className="whitespace-nowrap px-2 py-3">
                            <p className="text-[var(--text)] tabular-nums">{r.whatsapp}</p>
                            {r.whatsappHref && (
                              <a
                                href={r.whatsappHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Chat with ${r.name} on WhatsApp (opens in a new tab)`}
                                className={cn("text-xs", textLinkClass)}
                              >
                                Chat on WhatsApp
                              </a>
                            )}
                          </td>
                          <td className="hidden px-2 py-3 text-[var(--text)] xl:table-cell">{r.country || "—"}</td>
                          <td className="px-2 py-3">
                            <TrialStatusBadge status={r.status} />
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{r.requested}</td>
                          <td className="px-2 py-2">
                            <TrialRowActions row={r} viewHref={viewHref(r.id)} enrollHref={enrollHref(r.id)} />
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
              <Pagination page={page} totalPages={totalPages} hrefFor={(p) => trialRequestsHref({ ...base, page: p })} />
            </div>
          )}
        </section>
      </div>

      {selected && (
        <TrialSheet
          key={selected.id}
          row={toTrialRequestRow(selected, byEmail)}
          courses={courses && courses.length > 0 ? courses : null}
          studentsByEmail={byEmail ? Object.fromEntries(byEmail) : null}
          initialEnroll={query.enroll}
          closeHref={trialRequestsHref(base)}
          viewHref={viewHref(selected.id)}
        />
      )}
    </TrialMutationsProvider>
  );
}
