/** Static placeholder grid shown while courses are loading — no hooks, usable from server or client. */
export function CourseGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]"
        >
          <div className="aspect-[3/2] w-full animate-pulse bg-[var(--surface-alt)]" />
          <div className="flex flex-1 flex-col gap-3 p-4">
            <div className="h-5 w-20 animate-pulse rounded-[var(--radius-full)] bg-[var(--surface-alt)]" />
            <div className="h-5 w-3/4 animate-pulse rounded bg-[var(--surface-alt)]" />
            <div className="h-4 w-full animate-pulse rounded bg-[var(--surface-alt)]" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-[var(--surface-alt)]" />
          </div>
        </div>
      ))}
    </div>
  );
}
