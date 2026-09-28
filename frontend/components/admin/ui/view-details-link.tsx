"use client";

import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

function ViewLabel() {
  const { pending } = useLinkStatus();
  return (
    <>
      {pending && (
        <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
      )}
      View
    </>
  );
}

/** Opens a detail sheet by linking to ?view=<id> on the current page (filters kept). */
export function ViewDetailsLink({ id, name, href, className }: { id: number; name: string; href: string; className?: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      data-view-trigger={id}
      aria-label={`View details for ${name}`}
      className={cn(
        "inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--green-700)] px-3.5 text-sm font-medium text-[var(--green-800)] transition-colors duration-150 hover:bg-[var(--green-50)] motion-reduce:transition-none",
        "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
        className,
      )}
    >
      <ViewLabel />
    </Link>
  );
}
