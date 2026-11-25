"use server";

import { redirect } from "next/navigation";
import { adminFetch } from "@/lib/admin-api";
import { ADMIN_LOGIN_PATH } from "@/lib/admin-auth";
import type { AdminCourseSummary } from "@/lib/admin-courses";
import type { AdminBlogPostSummary } from "@/lib/admin-data";
import { clearAdminToken } from "@/lib/admin-session";
import { isPublicCourse } from "@/lib/courses";
import { FIXED_PAGE_LINKS, type InternalLinkGroup } from "@/lib/internal-links";

export async function loadInternalLinks(): Promise<
  { ok: true; groups: InternalLinkGroup[] } | { ok: false; message: string }
> {
  const [courses, posts] = await Promise.all([
    adminFetch<AdminCourseSummary[]>("/admin/courses", { redirectOnUnauthorized: false }),
    adminFetch<AdminBlogPostSummary[]>("/admin/blog", { redirectOnUnauthorized: false }),
  ]);
  if (!courses.ok || !posts.ok) {
    if ((!courses.ok && courses.status === 401) || (!posts.ok && posts.status === 401)) {
      // A client-side Server Action redirect does not visit the logout Route Handler in the browser.
      await clearAdminToken();
      redirect(`${ADMIN_LOGIN_PATH}?reason=expired`, "replace");
    }
    const forbidden = (!courses.ok && courses.status === 403) || (!posts.ok && posts.status === 403);
    return {
      ok: false,
      message: forbidden ? "You don't have permission to view these link destinations."
        : "Couldn't load link destinations. Please try again.",
    };
  }
  return {
    ok: true,
    groups: [
      { label: "Pages", links: FIXED_PAGE_LINKS },
      {
        label: "Courses",
        links: courses.data.filter(isPublicCourse).map(({ name, slug }) => ({ title: name, path: `/courses/${slug}` })),
      },
      {
        label: "Blog posts",
        links: posts.data.map(({ title, slug, status }) => ({ title, path: `/blog/${slug}`, status })),
      },
    ],
  };
}
