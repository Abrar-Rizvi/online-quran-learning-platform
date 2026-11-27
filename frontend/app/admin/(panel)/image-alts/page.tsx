import type { Metadata } from "next";
import { ForbiddenNotice } from "@/components/admin/forbidden";
import { WidgetError } from "@/components/admin/dashboard/widget";
import { ImageAltTable, type ImageAltRow } from "@/components/admin/image-alts/image-alt-table";
import { adminFetch } from "@/lib/admin-api";
import { fetchCourses } from "@/lib/api";
import { COURSE_IMAGE_FILES } from "@/lib/course-images.generated";
import { COURSE_IMAGE_DIR, getCourseImage, isPublicCourse } from "@/lib/courses";
import { localImagePath, type AdminImageAlt } from "@/lib/image-alts";
import { courseImageAlt, SITE_IMAGES } from "@/lib/site-images";

export const metadata: Metadata = { title: "Image alt text" };

export default async function ImageAltsPage() {
  const result = await adminFetch<AdminImageAlt[]>("/admin/image-alts");
  if (!result.ok) {
    return result.status === 403 ? <ForbiddenNotice /> : <WidgetError title="Image alt text" retryHref="/admin/image-alts" />;
  }

  const known = new Map<string, ImageAltRow>();
  for (const { src, alt } of Object.values(SITE_IMAGES)) {
    known.set(src, { path: src, defaultAlt: alt });
  }
  for (const file of COURSE_IMAGE_FILES) {
    const path = `${COURSE_IMAGE_DIR}${encodeURIComponent(file)}`;
    known.set(path, { path, defaultAlt: null });
  }
  for (const course of (await fetchCourses()).filter(isPublicCourse)) {
    const src = getCourseImage(course);
    const path = src && localImagePath(src);
    if (path && known.get(path)?.defaultAlt == null) {
      known.set(path, { path, defaultAlt: courseImageAlt(course.name) });
    }
  }
  for (const override of result.data) {
    const path = override.image_path;
    known.set(path, { path, defaultAlt: known.get(path)?.defaultAlt ?? null, override });
  }

  const rows = Array.from(known.values()).sort((a, b) => (
    Number(!b.override && b.defaultAlt === null) - Number(!a.override && a.defaultAlt === null)
    || a.path.localeCompare(b.path)
  ));
  return <ImageAltTable rows={rows} />;
}
