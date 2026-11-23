import Link from "next/link";
import { WidgetTitle, cardClasses } from "./dashboard/widget";

/**
 * Calm "no permission" state shown when the backend returns 403 on an admin
 * fetch (valid token, wrong role). Deliberately NOT a logout and NOT an error
 * page — the admin stays signed in and is pointed at a section they can use.
 */
export function ForbiddenNotice() {
  return (
    <section className={cardClasses} role="status">
      <WidgetTitle>You don&apos;t have permission</WidgetTitle>
      <p className="mt-1.5 text-sm text-[var(--text-muted)]">
        Your role can&apos;t access this section. If you need it, ask the owner to change your access.
      </p>
      <Link
        href="/admin/blog"
        className="mt-4 inline-flex rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
      >
        Go to Blog
      </Link>
    </section>
  );
}
