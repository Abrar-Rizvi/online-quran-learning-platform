import { cn } from "@/lib/utils";

/** Opacity-only entrance, once, ~220ms; nothing under prefers-reduced-motion. */
export const fadeIn = "motion-safe:animate-[admin-fade-in_220ms_ease-out]";

export const cardClasses =
  "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6";

export function WidgetTitle({ children, id }: { children: React.ReactNode; id?: string }) {
  return (
    // Inline: the global unlayered h2 rule would override Tailwind size/color utilities.
    <h2 id={id} className="m-0" style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--green-900)" }}>
      {children}
    </h2>
  );
}

/** Standard dashboard card: h2 title, optional muted subtitle and header action. */
export function WidgetCard({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn(cardClasses, fadeIn, "flex flex-1 flex-col", className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <WidgetTitle>{title}</WidgetTitle>
          {subtitle && <p className="mt-1 text-sm text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-5 flex flex-1 flex-col">{children}</div>
    </section>
  );
}

/** Inline failure state — only the widget whose endpoint failed shows this. */
export function WidgetError({
  title,
  className,
  retryHref = "/admin",
}: {
  title: string;
  className?: string;
  retryHref?: string;
}) {
  return (
    <section className={cn(cardClasses, "flex flex-1 flex-col", className)}>
      <WidgetTitle>{title}</WidgetTitle>
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" role="status">
        <span className="text-[var(--error)]">Couldn&apos;t load this section.</span>
        {/* A plain anchor: a full reload re-runs every server fetch. */}
        <a
          href={retryHref}
          className="font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 rounded-[var(--radius-sm)]"
        >
          Try again
        </a>
      </div>
    </section>
  );
}

export function WidgetEmpty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-8 text-center">
      <p className="font-medium text-[var(--green-900)]">{title}</p>
      <p className="mt-1 max-w-[36ch] text-sm text-[var(--text-muted)]">{text}</p>
    </div>
  );
}

export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn("animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-alt)] motion-reduce:animate-none", className)}
    />
  );
}

/** Generic card-shaped placeholder used as each widget's Suspense fallback. */
export function WidgetSkeleton({ className, bodyClassName }: { className?: string; bodyClassName?: string }) {
  return (
    <div className={cn(cardClasses, className)} aria-hidden="true">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-4 w-56 max-w-full" />
      <Skeleton className={cn("mt-5 h-40 w-full", bodyClassName)} />
    </div>
  );
}
