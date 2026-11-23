import type { Metadata } from "next";
import { ForbiddenNotice } from "@/components/admin/forbidden";
import { WidgetCard, WidgetEmpty, WidgetError } from "@/components/admin/dashboard/widget";
import { Button } from "@/components/ui";
import { adminFetch } from "@/lib/admin-api";
import type { AdminCourseSummary } from "@/lib/admin-courses";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  const result = await adminFetch<AdminCourseSummary[]>("/admin/courses");
  if (!result.ok) {
    return result.status === 403
      ? <ForbiddenNotice />
      : <WidgetError title="Courses" retryHref="/admin/courses" />;
  }

  return (
    <div className="mx-auto max-w-5xl">
      <WidgetCard title="Course catalog">
        {result.data.length === 0 ? (
          <WidgetEmpty title="No courses yet" text="Courses will appear here when they are added to the catalog." />
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {result.data.map((course) => {
              const missing = [
                !course.meta_title?.trim() && "meta title",
                !course.meta_description?.trim() && "meta description",
                !course.has_seo_content && "course content",
              ].filter(Boolean);
              return (
                <li key={course.id} className="grid gap-3 py-4 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p dir="auto" className="font-semibold wrap-anywhere text-[var(--green-900)]">{course.name}</p>
                    <p className="text-sm wrap-anywhere text-[var(--text-muted)]">
                      {course.slug} · {course.category || "Uncategorized"}
                    </p>
                    <p className={`mt-2 text-sm ${missing.length ? "text-[var(--warning)]" : "text-[var(--green-700)]"}`}>
                      {missing.length ? `Missing ${missing.join(", ")}` : "SEO fields complete"}
                    </p>
                  </div>
                  <Button href={`/admin/courses/${course.id}`} variant="secondary" aria-label={`Edit ${course.name}`} className="justify-self-start">
                    Edit course
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </WidgetCard>
    </div>
  );
}
