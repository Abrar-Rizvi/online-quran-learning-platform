"use client";

import { useRouter } from "next/navigation";
import type { TrialRequestRow } from "@/lib/admin-trial-requests";
import { ActionsMenu, type ActionsMenuItem } from "../ui/actions-menu";
import { ViewDetailsLink } from "../ui/view-details-link";
import { useTrialMutations } from "./trial-mutations";

export function TrialRowActions({
  row,
  viewHref,
  enrollHref,
  menuOnly = false,
}: {
  row: TrialRequestRow;
  viewHref: string;
  /** Opens the detail sheet straight into the "Enroll this student" form. */
  enrollHref: string;
  menuOnly?: boolean;
}) {
  const router = useRouter();
  const { pending, request } = useTrialMutations();

  const items: ActionsMenuItem[] = [
    ...(row.status === "on_trial"
      ? [
          { label: "Enroll this student", onSelect: () => router.push(enrollHref, { scroll: false }) },
          { label: "Mark as enrolled", onSelect: () => request("enrolled", row) },
          { label: "Cancel trial", tone: "danger" as const, onSelect: () => request("cancelled", row) },
        ]
      : [{ label: "No further changes", disabled: true }]),
    { label: "Delete permanently", tone: "danger", separated: true, onSelect: () => request("delete", row) },
  ];

  return (
    <div className="flex items-center justify-end gap-1">
      {!menuOnly && <ViewDetailsLink id={row.id} name={row.name} href={viewHref} />}
      <ActionsMenu label={`More actions for ${row.name}`} items={items} pending={pending?.id === row.id} />
    </div>
  );
}
