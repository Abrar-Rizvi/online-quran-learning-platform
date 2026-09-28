"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createPost,
  deletePost,
  updatePost,
  type PostChanges,
  type PostField,
  type PostMutationResult,
} from "@/app/admin/(panel)/blog/actions";
import { Button, FormField, inputClasses } from "@/components/ui";
import type { EditorPost } from "@/lib/admin-blog";
import {
  EXCERPT_MAX,
  SLUG_MAX,
  SLUG_RE,
  TITLE_MAX,
  countWords,
  isHttpUrl,
  readingMinutes,
  slugify,
  type PostStatus,
} from "@/lib/blog-rules";
import { changedFields, cn } from "@/lib/utils";
import { cardClasses } from "../dashboard/widget";
import { ExternalLinkIcon } from "../admin-icons";
import { PostStatusBadge } from "../status";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { SectionTitle } from "../ui/detail-list";
import { useToast } from "../ui/toast";
import { ContentEditor } from "./content-editor";
import { DELETE_CONFIRM, POST_TOASTS, UNPUBLISH_CONFIRM } from "./post-mutations";

type Field = "title" | "slug" | "excerpt" | "content" | "coverImageUrl";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field | "form", string>>;
type Action = "draft" | "publish" | "update" | "unpublish" | "delete";

const EMPTY: Values = { title: "", slug: "", excerpt: "", content: "", coverImageUrl: "" };
const FIELD_ORDER: Field[] = ["title", "content", "slug", "excerpt", "coverImageUrl"];
const API_FIELD: Record<PostField, Field> = {
  title: "title",
  slug: "slug",
  excerpt: "excerpt",
  content: "content",
  cover_image_url: "coverImageUrl",
};

const dangerOutline =
  "[--btn-secondary-fg:var(--error)] [--btn-secondary-border:var(--error)] [--btn-secondary-hover:var(--error-bg)] [--btn-secondary-active:var(--error-bg)] [--focus-ring-color:var(--error)]";

function valuesOf(post: EditorPost | null): Values {
  if (!post) return EMPTY;
  return { title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, coverImageUrl: post.coverImageUrl };
}

/** As the backend stores them: title/slug/excerpt/cover trimmed, content as written. */
function normalize(v: Values): Values {
  return {
    title: v.title.trim(),
    slug: v.slug.trim(),
    excerpt: v.excerpt.trim(),
    content: v.content,
    coverImageUrl: v.coverImageUrl.trim(),
  };
}

/** Only the changed fields, in the API's shape; a cleared cover is sent as null. */
function toChanges(original: Values, current: Values): PostChanges {
  const diff = changedFields(normalize(original), normalize(current));
  const out: PostChanges = {};
  if (diff.title !== undefined) out.title = diff.title;
  if (diff.slug !== undefined) out.slug = diff.slug;
  if (diff.excerpt !== undefined) out.excerpt = diff.excerpt;
  if (diff.content !== undefined) out.content = diff.content;
  if (diff.coverImageUrl !== undefined) out.cover_image_url = diff.coverImageUrl || null;
  return out;
}

/** Mirrors the backend's BlogPostCreate/BlogPostUpdate rules. */
function validate(v: Values, slugRequired: boolean): Errors {
  const n = normalize(v);
  const errors: Errors = {};
  if (!n.title) errors.title = "Enter a title.";
  else if (n.title.length > TITLE_MAX) errors.title = `Keep the title to ${TITLE_MAX} characters or fewer.`;
  if (!n.content.trim()) errors.content = "Write the article before saving.";
  if (!n.slug) {
    if (slugRequired) errors.slug = "Enter the address for this post.";
  } else if (n.slug.length > SLUG_MAX) errors.slug = `Keep the address to ${SLUG_MAX} characters or fewer.`;
  else if (!SLUG_RE.test(n.slug)) errors.slug = "Use lowercase letters, numbers and single hyphens only, like my-first-post.";
  if (!n.excerpt) errors.excerpt = "Write a short summary.";
  else if (n.excerpt.length > EXCERPT_MAX) errors.excerpt = `Keep the summary to ${EXCERPT_MAX} characters or fewer.`;
  if (n.coverImageUrl && !isHttpUrl(n.coverImageUrl)) {
    errors.coverImageUrl = "Enter a full image link starting with https:// (or http://).";
  }
  return errors;
}

function Counter({ id, length, max, alwaysShow = false }: { id: string; length: number; max: number; alwaysShow?: boolean }) {
  const near = length >= max * 0.8;
  if (!alwaysShow && !near) return null;
  return (
    <p
      id={id}
      className={cn("shrink-0 whitespace-nowrap text-xs tabular-nums", length > max ? "font-medium text-[var(--error)]" : near ? "text-[var(--warning)]" : "text-[var(--text-muted)]")}
    >
      {length} / {max}
      {length > max && <span className="sr-only"> — too long</span>}
    </p>
  );
}

function CoverPreview({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--surface-alt)] px-3 py-2.5 text-xs text-[var(--text-muted)]">
        Couldn&apos;t load this image. Check that the link opens the picture itself.
      </p>
    );
  }
  return (
    // A plain <img>: cover links can point at any host (next/image would need each one allow-listed).
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="mt-2 aspect-[16/9] w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-alt)] object-cover"
    />
  );
}

/**
 * Full-page editor for /admin/blog/new (post = null) and /admin/blog/[id].
 * Saves through Server Actions; existing posts send only the changed fields.
 */
export function PostEditor({ post: initialPost }: { post: EditorPost | null }) {
  const router = useRouter();
  const toast = useToast();
  const ids = {
    title: useId(),
    titleCount: useId(),
    content: useId(),
    slug: useId(),
    slugHint: useId(),
    excerpt: useId(),
    excerptHint: useId(),
    coverImageUrl: useId(),
    coverHint: useId(),
  };

  const [post, setPost] = useState(initialPost);
  const isNew = post === null;
  const [values, setValues] = useState<Values>(() => valuesOf(initialPost));
  // New posts: the slug follows the title until the admin edits it.
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Errors>({});
  const [running, setRunning] = useState<Action | null>(null);
  const [, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<"unpublish" | "delete" | "discard" | null>(null);
  const leaving = useRef(false);
  const focusAfterSave = useRef<Field | null>(null);

  const pending = running !== null;
  const baseline = valuesOf(post);
  const changes = isNew ? {} : toChanges(baseline, values);
  const dirty = isNew
    ? Object.values(normalize(values)).some((v) => v.trim() !== "")
    : Object.keys(changes).length > 0;

  const autoSlug = values.title.trim() ? slugify(values.title) : "";
  const shownSlug = isNew && !slugTouched ? autoSlug : values.slug;
  const slugChanged = !isNew && normalize(values).slug !== post.slug;
  const words = countWords(values.content);
  const minutes = readingMinutes(words);
  const coverValue = values.coverImageUrl.trim();

  // Native "Leave site?" prompt on reload/close while there are unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (leaving.current) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Fields are read-only while saving; a server-side field error is focused afterwards.
  useEffect(() => {
    if (!pending && focusAfterSave.current) {
      document.getElementById(ids[focusAfterSave.current])?.focus();
      focusAfterSave.current = null;
    }
  });

  const set = (key: Field) => (value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    if (errors[key] || errors.form) setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  function onSlugChange(raw: string) {
    // Help with the format as they type: lowercase, spaces become hyphens.
    set("slug")(raw.toLowerCase().replace(/\s+/g, "-"));
    setSlugTouched(true);
  }

  function leave(href: string) {
    leaving.current = true;
    router.push(href);
  }

  /** Validates, then shows the errors and focuses the first one. Returns true when valid. */
  function check(): boolean {
    const found = validate(values, !isNew);
    const keys = FIELD_ORDER.filter((k) => found[k]);
    if (keys.length === 0) return true;
    setErrors(found);
    // After the re-render: a content error first switches the editor from Preview back to Write.
    const first = ids[keys[0]];
    requestAnimationFrame(() => document.getElementById(first)?.focus());
    return false;
  }

  function handleResult(res: PostMutationResult, success: string, onSaved?: (post: EditorPost) => void) {
    if (res.ok) {
      toast(success);
      setErrors({});
      if (onSaved) onSaved(res.post);
      else {
        setPost(res.post);
        setValues(valuesOf(res.post));
      }
      return;
    }
    if (res.notFound) {
      toast(res.message, "error");
      leave("/admin/blog");
      return;
    }
    const field = res.field ? API_FIELD[res.field] : undefined;
    if (field) {
      setErrors({ [field]: res.message });
      focusAfterSave.current = field;
    } else {
      setErrors({ form: res.message });
    }
  }

  function save(action: Exclude<Action, "delete">) {
    // Unpublishing with no edits needs no validation (nothing but the status is sent).
    const needsCheck = isNew || action !== "unpublish" || Object.keys(changes).length > 0;
    if (needsCheck && !check()) return;
    setRunning(action);

    startTransition(async () => {
      if (post === null) {
        const n = normalize(values);
        const status: PostStatus = action === "publish" ? "published" : "draft";
        const res = await createPost({
          title: n.title,
          excerpt: n.excerpt,
          content: n.content,
          // Omitted until the admin types their own, so the backend generates (and de-duplicates) it.
          slug: slugTouched && n.slug ? n.slug : undefined,
          cover_image_url: n.coverImageUrl || undefined,
          status,
        });
        setRunning(null);
        handleResult(res, status === "published" ? POST_TOASTS.published : "Draft saved.", (created) => {
          leave(`/admin/blog/${created.id}`);
        });
        return;
      }

      const body: PostChanges = { ...changes };
      if (action === "publish") body.status = "published";
      if (action === "unpublish") body.status = "draft";
      const res = await updatePost(post.id, body);
      setRunning(null);
      setConfirm(null);
      const message =
        action === "publish" ? POST_TOASTS.published : action === "unpublish" ? POST_TOASTS.unpublished : action === "draft" ? "Draft saved." : "Changes saved.";
      handleResult(res, message);
    });
  }

  function runDelete() {
    if (post === null) return;
    setRunning("delete");
    startTransition(async () => {
      const res = await deletePost(post.id);
      setRunning(null);
      setConfirm(null);
      if (res.ok) {
        toast(POST_TOASTS.deleted);
        leave("/admin/blog");
      } else {
        toast(res.message, "error");
        if (res.notFound) leave("/admin/blog");
      }
    });
  }

  const describe = (...list: (string | false | undefined)[]) => list.filter(Boolean).join(" ") || undefined;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
      <div>
        <Link
          href="/admin/blog"
          onClick={(e) => {
            if (dirty && !pending) {
              e.preventDefault();
              setConfirm("discard");
            }
          }}
          className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-sm)] px-2 text-sm font-medium text-[var(--green-700)] hover:bg-[var(--green-50)] hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">←</span> All posts
        </Link>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)] xl:items-start">
        {/* Main column */}
        <section aria-label="Post" className={cn(cardClasses, "flex min-w-0 flex-col gap-6")}>
          <div>
            <label htmlFor={ids.title} className="mb-1.5 block text-sm font-medium text-[var(--text)]">
              Title<span className="text-[var(--error)]"> *</span>
            </label>
            <input
              id={ids.title}
              value={values.title}
              onChange={(e) => set("title")(e.target.value)}
              readOnly={pending}
              dir="auto"
              autoComplete="off"
              required
              aria-invalid={errors.title ? true : undefined}
              aria-describedby={describe(errors.title && `${ids.title}-error`, ids.titleCount)}
              placeholder="Post title"
              className={cn(inputClasses, "h-auto min-h-14 py-2.5 text-[1.5rem] font-semibold text-[var(--green-900)]", errors.title && "border-[var(--error)]")}
              style={{ fontFamily: "var(--font-heading)" }}
            />
            <div className="mt-1.5 flex items-start justify-between gap-3">
              {errors.title ? (
                <p id={`${ids.title}-error`} role="alert" className="text-xs text-[var(--error)]">
                  {errors.title}
                </p>
              ) : (
                <span />
              )}
              <Counter id={ids.titleCount} length={values.title.trim().length} max={TITLE_MAX} />
            </div>
          </div>

          <div>
            <ContentEditor
              id={ids.content}
              value={values.content}
              onChange={set("content")}
              title={values.title}
              readOnly={pending}
              error={errors.content}
              describedBy={errors.content ? `${ids.content}-error` : undefined}
            />
            {errors.content && (
              <p id={`${ids.content}-error`} role="alert" className="mt-1 text-xs text-[var(--error)]">
                {errors.content}
              </p>
            )}
          </div>
        </section>

        {/* Settings */}
        <aside aria-label="Post settings" className="flex min-w-0 flex-col gap-5 xl:sticky xl:top-24">
          <section aria-label="Publishing" className={cn(cardClasses, "flex flex-col gap-4")}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <PostStatusBadge status={post?.status ?? "draft"} />
              {post?.status === "published" && post.publishedLabel && (
                <span className="text-sm text-[var(--text-muted)] tabular-nums">Published {post.publishedLabel}</span>
              )}
            </div>
            {post?.status === "published" && (
              <a
                href={`/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="-my-1 inline-flex min-h-11 items-center gap-1.5 self-start rounded-[var(--radius-sm)] text-sm font-medium text-[var(--green-700)] underline-offset-4 hover:text-[var(--green-800)] hover:underline focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
              >
                View on site
                <ExternalLinkIcon className="size-4" />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
            <p className="text-sm text-[var(--text-muted)] tabular-nums" aria-live="polite">
              {post ? `Last saved ${post.savedLabel}` : "Not saved yet"}
              {dirty && <span className="font-medium text-[var(--warning)]"> · Unsaved changes</span>}
            </p>

            <div aria-live="polite">
              {errors.form && (
                <p className="rounded-[var(--radius-sm)] border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
                  {errors.form}
                </p>
              )}
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              {post?.status === "published" ? (
                <>
                  <Button className="h-11" onClick={() => save("update")} loading={running === "update"} disabled={pending || !dirty}>
                    Update
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-11"
                    onClick={() => {
                      const needsCheck = Object.keys(changes).length > 0;
                      if (!needsCheck || check()) setConfirm("unpublish");
                    }}
                    loading={running === "unpublish"}
                    disabled={pending}
                  >
                    Unpublish
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="secondary"
                    className="h-11"
                    onClick={() => save("draft")}
                    loading={running === "draft"}
                    disabled={pending || (!isNew && !dirty)}
                  >
                    Save draft
                  </Button>
                  <Button className="h-11" onClick={() => save("publish")} loading={running === "publish"} disabled={pending}>
                    Publish
                  </Button>
                </>
              )}
            </div>
            {post?.status === "published" && dirty && (
              <p className="-mt-1 text-xs text-[var(--text-muted)]">Update saves your changes to the live post.</p>
            )}
          </section>

          <section aria-label="Details" className={cn(cardClasses, "flex flex-col gap-5")}>
            <SectionTitle>Details</SectionTitle>

            <FormField label="Address" htmlFor={ids.slug} required={!isNew} error={errors.slug}>
              <div
                className={cn(
                  "flex h-12 items-stretch overflow-hidden rounded-[var(--radius-sm)] border bg-[var(--surface)] transition-colors duration-150 motion-reduce:transition-none",
                  // Same field look as inputClasses: the 1px border turns green-700 on focus, no ring.
                  errors.slug
                    ? "border-[var(--error)]"
                    : "border-[var(--border-input)] hover:border-[var(--border-strong)] focus-within:border-[var(--green-700)]",
                )}
              >
                <span aria-hidden="true" className="flex items-center border-r border-[var(--border)] bg-[var(--surface-alt)] px-3 text-sm text-[var(--text-muted)]">
                  /blog/
                </span>
                <input
                  id={ids.slug}
                  value={shownSlug}
                  onChange={(e) => onSlugChange(e.target.value)}
                  readOnly={pending}
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  inputMode="url"
                  placeholder={isNew ? "generated-from-title" : ""}
                  aria-invalid={errors.slug ? true : undefined}
                  aria-describedby={ids.slugHint}
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)]"
                />
              </div>
              <div id={ids.slugHint} className="mt-1.5 text-xs text-[var(--text-muted)]">
                {isNew && !(slugTouched && values.slug.trim()) ? (
                  <p>Will be generated from the title. If that address is already used, a number is added (for example -2).</p>
                ) : (
                  <p>Lowercase letters, numbers and hyphens.</p>
                )}
                {isNew && slugTouched && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlugTouched(false);
                      set("slug")("");
                    }}
                    className="mt-1 inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                  >
                    Generate from the title instead
                  </button>
                )}
                {post?.status === "published" && slugChanged && (
                  <p className="mt-2 rounded-[var(--radius-sm)] bg-[var(--warning-bg)] px-3 py-2 font-medium text-[var(--warning)]" role="status">
                    Changing the address breaks links that were already shared.
                  </p>
                )}
              </div>
            </FormField>

            <FormField label="Summary (excerpt)" htmlFor={ids.excerpt} required error={errors.excerpt}>
              <textarea
                id={ids.excerpt}
                value={values.excerpt}
                onChange={(e) => set("excerpt")(e.target.value)}
                readOnly={pending}
                dir="auto"
                rows={4}
                required
                aria-invalid={errors.excerpt ? true : undefined}
                aria-describedby={ids.excerptHint}
                className={cn(inputClasses, "h-auto resize-y py-3 leading-relaxed", errors.excerpt && "border-[var(--error)]")}
              />
              <div id={ids.excerptHint} className="mt-1.5 flex items-start justify-between gap-3">
                <p className="text-xs text-[var(--text-muted)]">Shown on the blog list and in Google results.</p>
                <Counter id={`${ids.excerptHint}-count`} length={values.excerpt.trim().length} max={EXCERPT_MAX} alwaysShow />
              </div>
            </FormField>

            <FormField label="Cover image link" htmlFor={ids.coverImageUrl} error={errors.coverImageUrl}>
              <input
                id={ids.coverImageUrl}
                type="url"
                inputMode="url"
                value={values.coverImageUrl}
                onChange={(e) => set("coverImageUrl")(e.target.value)}
                readOnly={pending}
                autoComplete="off"
                spellCheck={false}
                placeholder="https://"
                aria-invalid={errors.coverImageUrl ? true : undefined}
                aria-describedby={ids.coverHint}
                className={cn(inputClasses, errors.coverImageUrl && "border-[var(--error)]")}
              />
              <p id={ids.coverHint} className="mt-1.5 text-xs text-[var(--text-muted)]">
                Optional. Paste an image link. Image upload comes later.
              </p>
              {isHttpUrl(coverValue) && <CoverPreview key={coverValue} url={coverValue} alt={values.title.trim() || "Cover image"} />}
            </FormField>

            <dl className="grid grid-cols-2 gap-3 rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-3 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Words</dt>
                <dd className="m-0 font-semibold text-[var(--green-900)] tabular-nums">{words.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Reading time</dt>
                <dd className="m-0 font-semibold text-[var(--green-900)] tabular-nums">{minutes === 0 ? "—" : `${minutes} min`}</dd>
              </div>
            </dl>
          </section>

          {post && (
            <section aria-label="Danger zone" className={cn(cardClasses, "flex flex-col gap-3 border-[var(--error)]/25")}>
              <SectionTitle>Danger zone</SectionTitle>
              <Button
                variant="secondary"
                className={cn("h-11 w-full", dangerOutline)}
                onClick={() => setConfirm("delete")}
                loading={running === "delete"}
                disabled={pending}
              >
                Delete post
              </Button>
              <p className="text-xs text-[var(--text-muted)]">Removes the post permanently.</p>
            </section>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === "unpublish"}
        {...UNPUBLISH_CONFIRM}
        description={
          Object.keys(changes).length > 0
            ? `${UNPUBLISH_CONFIRM.description} Your unsaved changes will be saved too.`
            : UNPUBLISH_CONFIRM.description
        }
        pending={running === "unpublish"}
        onConfirm={() => save("unpublish")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        {...DELETE_CONFIRM}
        tone="danger"
        pending={running === "delete"}
        onConfirm={runDelete}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "discard"}
        title="Discard your changes?"
        description="Your edits to this post haven't been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          leave("/admin/blog");
        }}
      />
    </div>
  );
}
