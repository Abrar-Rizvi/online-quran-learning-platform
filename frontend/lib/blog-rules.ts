/**
 * Blog field rules shared by the admin editor (client) and its Server Actions.
 * They mirror backend/src/backend/schemas/blog.py and models/blog_post.py, so
 * most mistakes are caught before a request is sent; the backend stays the
 * final authority.
 */

export const TITLE_MAX = 200;
export const SLUG_MAX = 200;
export const EXCERPT_MAX = 300;
export const COVER_URL_MAX = 2048;

export type PostStatus = "draft" | "published";

export function isPostStatus(value: unknown): value is PostStatus {
  return value === "draft" || value === "published";
}

/** Lowercase letters and digits separated by single hyphens (backend SLUG_RE). */
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Same rule as the backend's `_slugify`: "Hello, World!" → "hello-world";
 * "post" when nothing usable remains (e.g. an all-Arabic title). The backend
 * may still append -2, -3… if the result is already taken.
 */
export function slugify(title: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug.slice(0, SLUG_MAX).replace(/-+$/, "") || "post";
}

/** Absolute http(s) URL with a host and no spaces (backend `_check_cover_image_url`). */
export function isHttpUrl(value: string): boolean {
  if (!value || value.length > COVER_URL_MAX || /\s/.test(value)) return false;
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.host !== "";
  } catch {
    return false;
  }
}

/** Links the editor may insert: http(s) or site-relative ("/courses", not "//host"). */
export function isAllowedLinkUrl(value: string): boolean {
  return isHttpUrl(value) || /^\/(?!\/)\S*$/.test(value);
}

/** Words that contain at least one letter or digit (Markdown symbols alone don't count). */
export function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** ≈200 words per minute, at least 1 minute once there is any text. */
export function readingMinutes(words: number): number {
  return words === 0 ? 0 : Math.max(1, Math.round(words / 200));
}
