import { Skeleton, cardClasses } from "@/components/admin/dashboard/widget";
import { cn } from "@/lib/utils";

/** Skeleton for the post editor: back link, main column and settings panel. */
export default function PostEditorLoading() {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5" aria-hidden="true">
      <Skeleton className="h-11 w-28" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] xl:items-start">
        <div className={cn(cardClasses, "flex flex-col gap-6")}>
          <Skeleton className="h-14 w-full" />
          <div className="flex justify-end gap-1">
            <Skeleton className="h-11 w-20" />
            <Skeleton className="h-11 w-24" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="flex flex-col gap-5">
          <div className={cn(cardClasses, "flex flex-col gap-4")}>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-11 w-full" />
          </div>
          <div className={cn(cardClasses, "flex flex-col gap-4")}>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
