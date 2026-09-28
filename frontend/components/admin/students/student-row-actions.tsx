"use client";

import { useRouter } from "next/navigation";
import type { StudentRow } from "@/lib/admin-students";
import { ActionsMenu, type ActionsMenuItem } from "../ui/actions-menu";
import { ViewDetailsLink } from "../ui/view-details-link";
import { useStudentMutations } from "./student-mutations";

/** Students with enrollments can't be deleted (the backend answers 409), so the item is disabled with a reason. */
export function deleteBlockedReason(row: Pick<StudentRow, "enrollments">): string | null {
  const total = row.enrollments?.total ?? 0;
  return total > 0 ? `Has ${total} ${total === 1 ? "enrollment" : "enrollments"}` : null;
}

export function StudentRowActions({
  row,
  viewHref,
  editHref,
  menuOnly = false,
}: {
  row: StudentRow;
  viewHref: string;
  editHref: string;
  menuOnly?: boolean;
}) {
  const router = useRouter();
  const { pendingId, requestDelete } = useStudentMutations();
  const blocked = deleteBlockedReason(row);

  const items: ActionsMenuItem[] = [
    { label: "Edit details", onSelect: () => router.push(editHref, { scroll: false }) },
    {
      label: "Delete student",
      tone: blocked ? "default" : "danger",
      separated: true,
      disabled: blocked !== null,
      hint: blocked ?? undefined,
      onSelect: () => requestDelete(row),
    },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {!menuOnly && <ViewDetailsLink id={row.id} name={row.name} href={viewHref} />}
      <ActionsMenu label={`More actions for ${row.name}`} items={items} pending={pendingId === row.id} />
    </div>
  );
}
