import { Skeleton, cardClasses } from "@/components/admin/dashboard/widget";
import { cn } from "@/lib/utils";

export default function TeamLoading() {
  return (
    <div className="mx-auto max-w-[1400px]" role="status">
      <span className="sr-only">Loading team…</span>
      <div className={cn(cardClasses, "p-0 sm:p-0")} aria-hidden="true">
        <div className="flex justify-end border-b border-[var(--border)] p-4 sm:p-5">
          <Skeleton className="h-12 w-32" />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {[0, 1, 2].map((row) => <Skeleton key={row} className="h-16 w-full" />)}
        </div>
      </div>
    </div>
  );
}
