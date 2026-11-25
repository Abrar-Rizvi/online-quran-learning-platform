import { findMarkdownH1s } from "@/components/markdown/markdown-content";
import { READ_MORE_MARKER, splitCourseContent } from "@/lib/course-seo";

export interface CourseMarkdown {
  lead: string;
  extra: string;
  headingCount: number;
  heading?: { text: string; leadOffset?: number; extraOffset?: number };
}

export function getCourseMarkdown(content: string): CourseMarkdown {
  if (!content.trim()) return { lead: "", extra: "", headingCount: 0 };
  const headings = findMarkdownH1s(content).filter(({ text }) => text.replaceAll(READ_MORE_MARKER, "").trim());
  const { lead, extra } = splitCourseContent(content);
  const marker = content.indexOf(READ_MORE_MARKER);
  const first = headings[0];
  const parts = { lead, extra, headingCount: headings.length };
  if (!first) return parts;

  if (marker === -1) {
    return { ...parts, heading: { text: first.text, leadOffset: first.start } };
  }

  // Splitting Markdown can change how a surrounding block parses. Select a
  // rendered heading only when it maps to a heading in the original text.
  const leadHeadings = findMarkdownH1s(lead);
  const extraHeadings = findMarkdownH1s(extra);
  const extraStart = marker + READ_MORE_MARKER.length;
  const offsetInExtra = (offset: number) =>
    content.slice(extraStart, offset).replaceAll(READ_MORE_MARKER, "").length;

  for (const { start, end } of headings) {
    const visible = leadHeadings.find((heading) => heading.start >= start && heading.start < end);
    if (visible) return { ...parts, heading: { text: visible.text, leadOffset: visible.start } };

    if (end > extraStart) {
      const extraFrom = offsetInExtra(Math.max(start, extraStart));
      const extraTo = offsetInExtra(end);
      const hidden = extraHeadings.find((heading) => heading.start >= extraFrom && heading.start < extraTo);
      if (hidden) return { ...parts, heading: { text: hidden.text, extraOffset: hidden.start } };
    }
  }

  return parts;
}
