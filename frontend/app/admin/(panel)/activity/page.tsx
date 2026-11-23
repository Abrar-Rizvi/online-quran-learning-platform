import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ActivitySheet } from "@/components/admin/activity/activity-sheet";
import { WidgetEmpty, WidgetError, cardClasses } from "@/components/admin/dashboard/widget";
import { ForbiddenNotice } from "@/components/admin/forbidden";
import { DetailField, SectionTitle, detailLinkClass } from "@/components/admin/ui/detail-list";
import { Pagination } from "@/components/admin/ui/pagination";
import { ViewDetailsLink } from "@/components/admin/ui/view-details-link";
import { Badge, Button, FormField, inputClasses } from "@/components/ui";
import {
  ACTIVITY_PATH,
  ENTITY_TYPES,
  activityHref,
  auditChanges,
  getAdminActivity,
  parseActivityQuery,
  toActivityRow,
} from "@/lib/admin-activity";
import { getAdminUsers, requireOwnerRole } from "@/lib/admin-data";
import { SEO_EDITOR_ROLE } from "@/lib/admin-role";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Activity" };

const COLUMNS = ["When", "Who", "Action", "Item"];
const selectClasses = cn(inputClasses, "cursor-pointer appearance-auto pr-3");
const valueClasses = "whitespace-pre-wrap break-words text-sm text-[var(--text)]";

function SnapshotValue({ value }: { value: string }) {
  const lines = value.split("\n", 4);
  if (value.length <= 240 && lines.length < 4) return <p className={valueClasses}>{value}</p>;

  const preview = lines.slice(0, 3).join("\n").slice(0, 240).trimEnd();
  return (
    <div>
      <details className="group peer">
        <summary className={cn("cursor-pointer text-sm", detailLinkClass)}>
          <span className="group-open:hidden">Show more</span>
          <span className="hidden group-open:inline">Show less</span>
        </summary>
        <p className={cn(valueClasses, "mt-1")}>{value}</p>
      </details>
      <p className={cn(valueClasses, "mt-1 peer-open:hidden")}>{preview}…</p>
    </div>
  );
}

export default async function AdminActivityPage({ searchParams }: PageProps<"/admin/activity">) {
  await requireOwnerRole();
  const query = parseActivityQuery(await searchParams);
  const [activity, users] = await Promise.all([getAdminActivity(query), getAdminUsers()]);

  if (!activity.ok || !users.ok) {
    if ((!activity.ok && activity.status === 403) || (!users.ok && users.status === 403)) {
      return <ForbiddenNotice />;
    }
    return <WidgetError title="Activity" retryHref={activityHref(query)} />;
  }

  const { items, total, limit, offset } = activity.data;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const base = { entity: query.entity, actor: query.actor, page: Math.min(query.page, totalPages) };
  if (query.page > totalPages) redirect(activityHref(base));

  const editors = users.data.filter((user) => user.role === SEO_EDITOR_ROLE);
  const rows = items.map(toActivityRow);
  const selected = items.find((entry) => entry.id === query.view);
  const changes = selected ? auditChanges(selected) : [];
  const hasFilters = Boolean(query.entity || query.actor);
  const viewLink = (row: (typeof rows)[number]) => (
    <ViewDetailsLink id={row.id} name={`${row.action} · ${row.title ?? row.item}`} href={activityHref({ ...base, view: row.id })} />
  );

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <h2 id="activity-heading" tabIndex={-1} className="sr-only">Activity log</h2>
      <section className={cn(cardClasses, "p-0 sm:p-0")} aria-labelledby="activity-heading">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
          <form action={ACTIVITY_PATH} method="get" key={activityHref({ ...base, page: 1 })} className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-start">
            <FormField label="Entity type" htmlFor="activity-entity">
              <select id="activity-entity" name="entity" defaultValue={query.entity ?? ""} className={selectClasses}>
                <option value="">All types</option>
                {ENTITY_TYPES.map(({ value, label }) => <option value={value} key={value}>{label}</option>)}
              </select>
            </FormField>
            <FormField label="Person" htmlFor="activity-person">
              <select id="activity-person" name="actor" defaultValue={query.actor ?? ""} aria-describedby="activity-owner-hint" className={cn(selectClasses, "sm:max-w-64")}>
                <option value="">All people</option>
                <option value="owner" disabled>Owner (unavailable)</option>
                {editors.map(({ id, name, email }) => <option value={id} key={id}>{name} ({email})</option>)}
                {query.actor && !editors.some(({ id }) => id === query.actor) && (
                  <option value={query.actor}>Editor #{query.actor}</option>
                )}
              </select>
              <p id="activity-owner-hint" className="mt-1.5 text-xs text-[var(--text-muted)]">
                Owner activity appears under All people.
              </p>
            </FormField>
            <Button type="submit" variant="secondary" className="sm:mt-6">Apply filters</Button>
          </form>
          {rows.length > 0 && (
            <p className="shrink-0 text-sm text-[var(--text-muted)] tabular-nums sm:mt-9" aria-live="polite">
              Showing {offset + 1}–{offset + rows.length} of {total}
            </p>
          )}
        </div>

        <div className="p-4 sm:p-5">
          {rows.length === 0 ? (
            <WidgetEmpty
              title={hasFilters ? "No activity matches these filters." : "No activity yet"}
              text={hasFilters ? "Choose a different entity type or person." : "Recorded admin changes will appear here."}
            />
          ) : (
            <>
              <ul className="flex flex-col gap-3 lg:hidden">
                {rows.map((row) => (
                  <li key={row.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-4">
                    <p className="break-words font-semibold text-[var(--text)]">{row.action}</p>
                    <p className="mt-1.5 text-sm text-[var(--text-muted)] tabular-nums">{row.when}</p>
                    <dl className="mt-2 divide-y divide-[var(--border)]">
                      <DetailField label="Who">{row.actor} <Badge>{row.role}</Badge></DetailField>
                      <DetailField label="Item">
                        {row.item}
                        {row.title && <span className="block">{row.title}</span>}
                      </DetailField>
                    </dl>
                    <div className="mt-3">{viewLink(row)}</div>
                  </li>
                ))}
              </ul>

              <div className="relative -mx-2 hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[600px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                      {COLUMNS.map((column) => <th key={column} scope="col" className="px-2 pb-2.5 font-medium">{column}</th>)}
                      <th scope="col" className="px-2 pb-2.5 text-right font-medium"><span className="sr-only">Details</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {rows.map((row) => (
                      <tr key={row.id} className="transition-colors duration-150 hover:bg-[var(--bg)] motion-reduce:transition-none">
                        <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{row.when}</td>
                        <td className="max-w-[16rem] break-words px-2 py-3">
                          <p className="mb-1 text-[var(--text)]">{row.actor}</p>
                          <Badge>{row.role}</Badge>
                        </td>
                        <td className="max-w-[16rem] break-words px-2 py-3 text-[var(--text)]">{row.action}</td>
                        <td className="max-w-[16rem] break-words px-2 py-3">
                          <p className="font-medium text-[var(--text)]">{row.item}</p>
                          {row.title && <p className="text-[var(--text-muted)]">{row.title}</p>}
                        </td>
                        <td className="px-2 py-2 text-right">{viewLink(row)}</td>
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
            <Pagination page={base.page} totalPages={totalPages} hrefFor={(page) => activityHref({ ...base, page })} />
          </div>
        )}
      </section>

      {selected && (
        <ActivitySheet key={selected.id} id={selected.id} closeHref={activityHref(base)}>
          <SectionTitle>Changes</SectionTitle>
          {changes.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-muted)]">No field changes recorded.</p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {changes.map((change) => (
                <li key={change.field} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3.5">
                  <p className="break-words font-medium text-[var(--text)]">{change.label}</p>
                  <dl className="mt-2 divide-y divide-[var(--border)]">
                    <DetailField label="Before"><SnapshotValue value={change.before} /></DetailField>
                    <DetailField label="After"><SnapshotValue value={change.after} /></DetailField>
                  </dl>
                </li>
              ))}
            </ul>
          )}
        </ActivitySheet>
      )}
    </div>
  );
}
