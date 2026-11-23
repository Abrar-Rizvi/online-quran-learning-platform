"use server";

import { revalidatePath, updateTag } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { COURSE_FIELDS, type AdminCourseDetail, type CourseField, type CoursePatch } from "@/lib/admin-courses";
import { COURSE_CATALOG_TAG, courseDetailTag } from "@/lib/api";

type SaveCourseResult =
  | { ok: true; course: AdminCourseDetail }
  | { ok: false; message: string; fields?: Partial<Record<CourseField, string>> };

export async function saveCourse(id: number, changes: CoursePatch): Promise<SaveCourseResult> {
  if (!Number.isSafeInteger(id) || id < 1) return { ok: false, message: "Invalid course ID." };

  const body = Object.fromEntries(COURSE_FIELDS.flatMap((key) => {
    const value = changes[key];
    return typeof value === "string" || value === null ? [[key, value]] : [];
  }));
  if (!Object.keys(body).length) return { ok: false, message: "Nothing to save." };

  const res = await adminFetch<AdminCourseDetail>(`/admin/courses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (res.ok) {
    revalidatePath("/admin/courses");
    updateTag(courseDetailTag(id));
    if ("slug" in body || "name" in body || "description" in body) updateTag(COURSE_CATALOG_TAG);
    revalidatePath(`/courses/${res.data.slug}`);
    return { ok: true, course: res.data };
  }

  if (res.status === 502) {
    return { ok: false, message: "The chatbot search data could not be refreshed. Your edits are still here. Try saving again." };
  }
  if (res.status === 403) return { ok: false, message: "You don't have permission to edit this course." };
  if (res.status === 404) return { ok: false, message: "This course could not be found." };
  if (res.status === 409) {
    const field = res.message === "A course with this name already exists" ? "name" : "slug";
    return { ok: false, message: "Check the highlighted field and try again.", fields: { [field]: res.message } };
  }
  if (res.status === 422 && Array.isArray(res.detail)) {
    const fields: Partial<Record<CourseField, string>> = {};
    for (const issue of res.detail as { loc?: unknown; msg?: unknown }[]) {
      const key = Array.isArray(issue.loc) ? issue.loc.at(-1) : undefined;
      if (COURSE_FIELDS.includes(key) && typeof issue.msg === "string" && !fields[key as CourseField]) {
        fields[key as CourseField] = issue.msg.replace(/^Value error, /, "");
      }
    }
    if (Object.keys(fields).length) return { ok: false, message: "Check the highlighted fields and try again.", fields };
  }
  return { ok: false, message: res.message };
}
