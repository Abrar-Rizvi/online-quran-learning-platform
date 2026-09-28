import Link from "next/link";
import { cn } from "@/lib/utils";

const linkClasses =
  "inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

/** Previous / Next links + "Page X of Y". `hrefFor` builds a URL that keeps the current filters. */
export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  const edge = (target: number, label: string, enabled: boolean) =>
    enabled ? (
      <Link href={hrefFor(target)} scroll={false} className={cn(linkClasses, "text-[var(--green-800)] hover:bg-[var(--green-50)]")}>
        {label}
      </Link>
    ) : (
      <span aria-disabled="true" className={cn(linkClasses, "cursor-not-allowed text-[var(--text-muted)] opacity-60")}>
        {label}
      </span>
    );

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3">
      {edge(page - 1, "Previous", page > 1)}
      <p className="text-sm text-[var(--text-muted)] tabular-nums">
        Page {page} of {totalPages}
      </p>
      {edge(page + 1, "Next", page < totalPages)}
    </nav>
  );
}
