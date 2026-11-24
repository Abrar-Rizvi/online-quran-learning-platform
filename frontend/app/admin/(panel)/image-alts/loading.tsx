import { WidgetSkeleton } from "@/components/admin/dashboard/widget";

export default function ImageAltsLoading() {
  return <div role="status"><span className="sr-only">Loading image alt text…</span><WidgetSkeleton /></div>;
}
