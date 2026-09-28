"use client";

import { getAllowedNextStatuses } from "@/lib/enrollment";
import { ActionsMenu, type ActionsMenuItem } from "../ui/actions-menu";
import { ViewDetailsLink } from "../ui/view-details-link";
import { STATUS_ACTIONS, useEnrollmentMutations } from "./enrollment-mutations";

interface RowTarget {
  id: number;
  name: string;
  course: string;
  status: string;
}

/** Kept under its old name for the Enrollments page. */
export { ViewDetailsLink as ViewEnrollmentLink } from "../ui/view-details-link";

export function EnrollmentRowActions({
  row,
  viewHref,
  menuOnly = false,
}: {
  row: RowTarget;
  /** Omit together with `menuOnly` when the View link is rendered elsewhere (mobile cards). */
  viewHref?: string;
  menuOnly?: boolean;
}) {
  const { pending, requestStatus, requestDelete } = useEnrollmentMutations();
  const next = getAllowedNextStatuses(row.status);

  const items: ActionsMenuItem[] = [
    ...(next.length > 0
      ? next.map((target) => ({ label: STATUS_ACTIONS[target].label, onSelect: () => requestStatus(row, target) }))
      : [{ label: "No further changes", disabled: true }]),
    { label: "Delete permanently", tone: "danger", separated: true, onSelect: () => requestDelete(row) },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {!menuOnly && viewHref && <ViewDetailsLink id={row.id} name={row.name} href={viewHref} />}
      <ActionsMenu label={`More actions for ${row.name}`} items={items} pending={pending?.id === row.id} />
    </div>
  );
}
