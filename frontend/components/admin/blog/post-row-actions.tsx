"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogRow } from "@/lib/admin-blog";
import { cn } from "@/lib/utils";
import { ActionsMenu, type ActionsMenuItem } from "../ui/actions-menu";
import { usePostMutations } from "./post-mutations";

export const editLinkClasses = cn(
  "inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--green-700)] px-3.5 text-sm font-medium text-[var(--green-800)] transition-colors duration-150 hover:bg-[var(--green-50)] motion-reduce:transition-none",
  "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
);

/** Edit button + "more" menu (Edit, Publish/Unpublish, View on site for published posts, Delete). `relative z-10` sits above the row's stretched link. */
export function PostRowActions({ row, menuOnly = false }: { row: BlogRow; menuOnly?: boolean }) {
  const router = useRouter();
  const { pendingId, publish, requestUnpublish, requestDelete } = usePostMutations();
  const href = `/admin/blog/${row.id}`;

  const items: ActionsMenuItem[] = [
    { label: "Edit", onSelect: () => router.push(href) },
    row.status === "published"
      ? { label: "Unpublish", onSelect: () => requestUnpublish(row) }
      : { label: "Publish", onSelect: () => publish(row) },
    ...(row.status === "published"
      ? [
          {
            label: "View on site",
            hint: "Opens in a new tab",
            onSelect: () => window.open(`/blog/${row.slug}`, "_blank", "noopener,noreferrer"),
          },
        ]
      : []),
    { label: "Delete", tone: "danger", separated: true, onSelect: () => requestDelete(row) },
  ];

  return (
    <div className="relative z-10 flex items-center justify-end gap-1">
      {!menuOnly && (
        <Link href={href} aria-label={`Edit “${row.title}”`} className={editLinkClasses}>
          Edit
        </Link>
      )}
      <ActionsMenu label={`More actions for “${row.title}”`} items={items} pending={pendingId === row.id} />
    </div>
  );
}
