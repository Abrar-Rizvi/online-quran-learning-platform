import "server-only";

import type { AdminBlogPost, AdminBlogPostSummary } from "./admin-data";
import { formatAdminDate, formatAdminDateTime, parseApiDate } from "./admin-format";
import type { PostStatus } from "./blog-rules";

export const BLOG_PATH = "/admin/blog";
export const BLOG_PAGE_SIZE = 25;

export type BlogTab = "all" | PostStatus;

export const BLOG_TABS: { key: BlogTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Drafts" },
  { key: "published", label: "Published" },
];

export interface BlogQuery {
  status: BlogTab;
  q: string;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isTab = (v: string): v is BlogTab => v === "all" || v === "draft" || v === "published";

/** Never throws: unknown values fall back to All / page 1. */
export function parseBlogQuery(params: RawParams): BlogQuery {
  const status = first(params.status);
  const page = Number.parseInt(first(params.page), 10);
  return {
    status: isTab(status) ? status : "all",
    q: first(params.q).trim().slice(0, 100),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

/** URL for the list with defaults omitted. */
export function blogHref(query: Partial<BlogQuery>): string {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  const qs = params.toString();
  return qs ? `${BLOG_PATH}?${qs}` : BLOG_PATH;
}

/** Case-insensitive match on title and slug. */
export function matchesBlogSearch(post: AdminBlogPostSummary, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  return post.title.toLowerCase().includes(needle) || post.slug.includes(needle);
}

/** Serializable list row (dates formatted on the server, in ADMIN_TIME_ZONE). */
export interface BlogRow {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  published: string | null;
  updated: string;
}

export function toBlogRow(post: AdminBlogPostSummary): BlogRow {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    status: post.status,
    published: post.published_at ? formatAdminDate(parseApiDate(post.published_at)) : null,
    updated: formatAdminDate(parseApiDate(post.updated_at)),
  };
}

/** Everything the editor needs, with dates pre-formatted for the admin time zone. */
export interface EditorPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImageUrl: string;
  status: PostStatus;
  publishedLabel: string | null;
  savedLabel: string;
}

export function toEditorPost(post: AdminBlogPost): EditorPost {
  return {
    id: post.id,
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    content: post.content,
    coverImageUrl: post.cover_image_url ?? "",
    status: post.status,
    publishedLabel: post.published_at ? formatAdminDate(parseApiDate(post.published_at)) : null,
    savedLabel: formatAdminDateTime(parseApiDate(post.updated_at)),
  };
}
