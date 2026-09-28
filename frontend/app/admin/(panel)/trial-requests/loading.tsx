import { Skeleton, cardClasses } from "@/components/admin/dashboard/widget";
import { cn } from "@/lib/utils";

/** Skeleton for the first load of /admin/trial-requests: tabs, then search + rows. */
export default function TrialRequestsLoading() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5" aria-hidden="true">
      <div className="flex gap-1.5">
        {[96, 92, 104, 60].map((w, i) => (
          <Skeleton key={i} className="h-11 shrink-0" style={{ width: w }} />
        ))}
      </div>
      <div className={cn(cardClasses, "p-0 sm:p-0")}>
        <div className="border-b border-[var(--border)] p-4 sm:p-5">
          <Skeleton className="h-11 w-full sm:max-w-md" />
        </div>
        <div className="flex flex-col gap-3 p-4 sm:p-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
