import { WidgetSkeleton } from "@/components/admin/dashboard/widget";

export default function CoursesLoading() {
  return (
    <div role="status" className="mx-auto max-w-5xl">
      <span className="sr-only">Loading courses…</span>
      <WidgetSkeleton />
    </div>
  );
}
