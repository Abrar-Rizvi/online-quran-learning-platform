import type { Metadata } from "next";
import { CourseEditor } from "@/components/admin/courses/course-editor";
import { ForbiddenNotice } from "@/components/admin/forbidden";
import { WidgetCard, WidgetError } from "@/components/admin/dashboard/widget";
import { Button } from "@/components/ui";
import { adminFetch } from "@/lib/admin-api";
import type { AdminCourseDetail } from "@/lib/admin-courses";

export const metadata: Metadata = { title: "Edit course" };

function CourseNotFound() {
  return (
    <WidgetCard title="Course not found">
      <p className="mb-3 text-[var(--text-muted)]">This course could not be found in the catalog.</p>
      <Button href="/admin/courses" variant="link" className="self-start">Back to courses</Button>
    </WidgetCard>
  );
}

export default async function AdminEditCoursePage({ params }: PageProps<"/admin/courses/[id]">) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) return <CourseNotFound />;

  const res = await adminFetch<AdminCourseDetail>(`/admin/courses/${id}`);
  if (!res.ok) {
    if (res.status === 403) return <ForbiddenNotice />;
    if (res.status === 404) return <CourseNotFound />;
    return <WidgetError title="Edit course" retryHref={`/admin/courses/${id}`} />;
  }
  return <CourseEditor key={res.data.id} course={res.data} />;
}
