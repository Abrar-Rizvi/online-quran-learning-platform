import Link from "next/link";
import { cardClasses } from "@/components/admin/dashboard/widget";
import { cn } from "@/lib/utils";

/** Missing or malformed post id (e.g. deleted in another tab, or a mistyped URL). */
export default function PostNotFound() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <section className={cn(cardClasses, "px-4 py-12 text-center")}>
        {/* Inline: the global unlayered h2 rule would override Tailwind size/color utilities. */}
        <h2 className="m-0" style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--green-900)" }}>
          This post doesn&apos;t exist
        </h2>
        <p className="mx-auto mt-2 max-w-[42ch] text-[0.9375rem] text-[var(--text-muted)]">
          It may have been deleted, or the link is incorrect.
        </p>
        <Link
          href="/admin/blog"
          className="mt-5 inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--green-700)] px-4 text-sm font-medium text-[var(--green-800)] transition-colors duration-150 hover:bg-[var(--green-50)] motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">←</span> All posts
        </Link>
      </section>
    </div>
  );
}
