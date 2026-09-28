import { Skeleton, cardClasses } from "@/components/admin/dashboard/widget";
import { cn } from "@/lib/utils";

/** Skeleton for the first load of /admin/blog: header row, toolbar + rows. */
export default function BlogLoading() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5" aria-hidden="true">
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-4 w-56 max-w-[50%]" />
        <Skeleton className="h-11 w-32" />
      </div>
      <div className={cn(cardClasses, "p-0 sm:p-0")}>
        <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
          <Skeleton className="h-11 w-full xl:max-w-md" />
          <div className="flex gap-1.5">
            {[64, 84, 104].map((w, i) => (
              <Skeleton key={i} className="h-11 shrink-0" style={{ width: w }} />
            ))}
          </div>
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
