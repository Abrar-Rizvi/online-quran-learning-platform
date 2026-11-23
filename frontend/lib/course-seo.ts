import { SITE_NAME, trimDescription } from "./seo";

export const READ_MORE_MARKER = "[[read-more]]";

export function splitCourseContent(content: string) {
  const [lead, ...rest] = content.split(READ_MORE_MARKER);
  const extra = rest.join("");
  return { lead: lead.trim() ? lead : "", extra: extra.trim() ? extra : "" };
}

export function courseSearchSnippet(course: {
  name: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
}) {
  const customTitle = course.meta_title?.trim() || undefined;
  return {
    customTitle,
    title: customTitle ?? `${course.name} | ${SITE_NAME}`,
    description: course.meta_description?.trim() || (course.description
      ? trimDescription(course.description)
      : `Live one-to-one online ${course.name} classes with Adan Online Academy.`),
  };
}
