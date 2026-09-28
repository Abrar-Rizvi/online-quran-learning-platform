import Link from "next/link";
import { cn } from "@/lib/utils";
import { Container } from "./container";
import { IslamicPattern } from "./islamic-pattern";

export interface BreadcrumbItem {
  label: string;
  /** Omit for the current page (last item) — it renders as plain text, not a link. */
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  heading: string;
  description: string;
  className?: string;
  /** Optional extra content rendered below the description (e.g. feature tiles). Omit for the plain band used by every other page. */
  children?: React.ReactNode;
}

/**
 * Dark khatam-band page title, used at the top of every inner public page
 * (not the homepage, which has its own Hero). Same visual language as the
 * Hero section: green-900 background, khatam pattern at 10% opacity, white
 * heading, green-100/200 supporting text — sized down since this is a
 * compact title band, not a second hero.
 */
export function PageHeader({
  breadcrumbs,
  heading,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <section className={cn("relative overflow-hidden bg-[var(--green-900)] py-12 lg:py-16", className)}>
      <IslamicPattern
        className="absolute inset-0"
        color="var(--gold-400)"
        opacity={0.1}
        patternId="khatam-pageheader"
        variant="detailed"
      />

      <Container className="relative">
        {breadcrumbs.length > 0 && (
          <ol
            className="flex flex-nowrap items-center gap-1.5 overflow-x-auto text-sm"
            style={{ fontFamily: "var(--font-body)" }}
            aria-label="Breadcrumb"
          >
            {breadcrumbs.map((item, i) => {
              const isLast = i === breadcrumbs.length - 1;
              const isLink = Boolean(item.href) && !isLast;

              return (
                <li key={`${item.label}-${i}`} className="flex shrink-0 items-center gap-1.5">
                  {i > 0 && (
                    <span aria-hidden="true" className="text-[var(--green-200)]">
                      /
                    </span>
                  )}
                  {isLink ? (
                    <Link
                      href={item.href as string}
                      className="text-white transition-colors hover:text-[var(--gold-400)] hover:underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2 rounded-[var(--radius-sm)]"
                    >
                      {item.label}
                    </Link>
                  ) : (
                    <span
                      className="text-[var(--green-200)]"
                      aria-current={isLast ? "page" : undefined}
                    >
                      {item.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        <h1
          className="mt-3 max-w-[40ch]"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#fff",
            fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
            fontWeight: 600,
            lineHeight: 1.2,
          }}
        >
          {heading}
        </h1>

        <p className="mt-2 max-w-[65ch] text-[var(--green-100)]">{description}</p>

        {children && <div className="mt-8 lg:mt-10">{children}</div>}
      </Container>
    </section>
  );
}
