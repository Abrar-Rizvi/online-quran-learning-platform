"use server";

import { revalidatePath, updateTag } from "next/cache";
import { adminFetch } from "@/lib/admin-api";
import { BLOG_CACHE_TAG } from "@/lib/api";
import { toEditorPost, type EditorPost } from "@/lib/admin-blog";
import type { AdminBlogPost } from "@/lib/admin-data";
import { fieldFromError } from "@/lib/admin-errors";
import { isPostStatus, type PostStatus } from "@/lib/blog-rules";

export type PostField = "title" | "slug" | "excerpt" | "content" | "cover_image_url";

/** Body of POST /admin/blog. `slug` omitted → the backend generates (and if needed suffixes) one. */
export interface PostCreateInput {
  title: string;
  excerpt: string;
  content: string;
  slug?: string;
  cover_image_url?: string;
  status: PostStatus;
}

/** PATCH body: only changed fields. `cover_image_url: null` clears the cover. */
export type PostChanges = Partial<{
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  status: PostStatus;
}>;

export type PostMutationResult =
  | { ok: true; post: EditorPost }
  | { ok: false; notFound: boolean; field?: PostField; message: string };

export type PostDeleteResult = { ok: true } | { ok: false; notFound: boolean; message: string };

const NOT_FOUND = "This post no longer exists.";
const FIELDS: readonly PostField[] = ["title", "slug", "excerpt", "content", "cover_image_url"];
const TEXT_FIELDS = ["title", "slug", "excerpt", "content"] as const;

function isValidId(id: unknown): id is number {
  return typeof id === "number" && Number.isInteger(id) && id > 0;
}

/**
 * After any change: the admin views (list, editor, dashboard Blog card) and
 * the public blog. updateTag expires every cached public blog fetch at once
 * (list, articles, "More articles"), so the next visitor gets fresh data;
 * revalidatePath also drops the rendered public pages for the affected
 * slugs — both the old and the new one when a slug changed.
 */
function refreshViews(id: number | undefined, slugs: (string | undefined)[] = []) {
  revalidatePath("/admin");
  revalidatePath("/admin/blog");
  if (id) revalidatePath(`/admin/blog/${id}`);
  updateTag(BLOG_CACHE_TAG);
  revalidatePath("/blog");
  for (const slug of new Set(slugs)) if (slug) revalidatePath(`/blog/${slug}`);
}

/** Current slug of a post (before a slug change or a delete), so its old public URL can be refreshed. */
async function currentSlug(id: number): Promise<string | undefined> {
  const res = await adminFetch<AdminBlogPost>(`/admin/blog/${id}`);
  return res.ok ? res.data.slug : undefined;
}

/** Pydantic prefixes custom validator messages with "Value error, ". */
function readable(message: string): string {
  return message.replace(/^Value error, /, "");
}

function failure(status: number, detail: unknown, message: string) {
  // 409 → slug (the only unique field); 422 → the field named in `loc` or the message text.
  const field = fieldFromError(status, detail, message, FIELDS, "slug");
  return { ok: false as const, notFound: false, field, message: readable(message) };
}

/** Keeps only known keys with the right types, so nothing unexpected reaches the backend. */
function cleanChanges(changes: PostChanges): PostChanges {
  const body: PostChanges = {};
  for (const key of TEXT_FIELDS) {
    if (typeof changes[key] === "string") body[key] = changes[key];
  }
  if (changes.cover_image_url === null || typeof changes.cover_image_url === "string") {
    body.cover_image_url = changes.cover_image_url || null;
  }
  if (isPostStatus(changes.status)) body.status = changes.status;
  return body;
}

/** POST /admin/blog → 201 with the created post. */
export async function createPost(input: PostCreateInput): Promise<PostMutationResult> {
  const body: PostCreateInput = {
    title: String(input.title ?? ""),
    excerpt: String(input.excerpt ?? ""),
    content: String(input.content ?? ""),
    status: isPostStatus(input.status) ? input.status : "draft",
  };
  if (typeof input.slug === "string" && input.slug) body.slug = input.slug;
  if (typeof input.cover_image_url === "string" && input.cover_image_url) body.cover_image_url = input.cover_image_url;

  const res = await adminFetch<AdminBlogPost>("/admin/blog", { method: "POST", body: JSON.stringify(body) });

  if (res.ok) {
    refreshViews(res.data.id, [res.data.slug]);
    return { ok: true, post: toEditorPost(res.data) };
  }
  return failure(res.status, res.detail, res.message);
}

/**
 * PATCH /admin/blog/{id} with only the changed fields (and `status` when
 * publishing/unpublishing). Used by the editor and by the list's
 * Publish/Unpublish items.
 */
export async function updatePost(id: number, changes: PostChanges): Promise<PostMutationResult> {
  const body = cleanChanges(changes);
  if (!isValidId(id) || Object.keys(body).length === 0) {
    return { ok: false, notFound: false, message: "Nothing to save." };
  }

  const previousSlug = body.slug !== undefined ? await currentSlug(id) : undefined;
  const res = await adminFetch<AdminBlogPost>(`/admin/blog/${id}`, { method: "PATCH", body: JSON.stringify(body) });

  if (res.ok) {
    refreshViews(id, [previousSlug, res.data.slug]);
    return { ok: true, post: toEditorPost(res.data) };
  }
  if (res.status === 404) {
    refreshViews(id, [previousSlug]);
    return { ok: false, notFound: true, message: NOT_FOUND };
  }
  return failure(res.status, res.detail, res.message);
}

/** DELETE /admin/blog/{id} (hard delete, 204). */
export async function deletePost(id: number): Promise<PostDeleteResult> {
  if (!isValidId(id)) return { ok: false, notFound: false, message: "Invalid request." };

  const slug = await currentSlug(id);
  const res = await adminFetch(`/admin/blog/${id}`, { method: "DELETE" });

  if (res.ok || res.status === 404) {
    refreshViews(id, [slug]);
    return res.ok ? { ok: true } : { ok: false, notFound: true, message: NOT_FOUND };
  }
  return { ok: false, notFound: false, message: res.message };
}
