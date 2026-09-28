/** Lightweight server-side API helpers. */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Cache lifetime for course/fee data — short enough that a bad entry self-heals quickly. */
const CATALOG_REVALIDATE_SECONDS = 300;

export interface CourseListItem {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
}

export interface FeePlanItem {
  id: number;
  course_id: number;
  days_per_week: number;
  fee: string;
  currency: string;
}

export interface CoursePlanItem {
  id: number;
  days_per_week: number;
  fee: string;
  currency: string;
}

export interface CourseDetailItem extends CourseListItem {
  course_plans: CoursePlanItem[];
}

export interface EnrollmentStudentItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp?: string | null;
  country: string | null;
  /** Not part of the API yet — render conditionally and omit when absent. */
  registration_no?: string | null;
  created_at: string;
}

export interface EnrollmentDetailItem {
  id: number;
  status: string;
  /** "HH:MM:SS" (the backend's `time` serialization), or null on older enrollments. */
  preferred_time: string | null;
  enrolled_at: string;
  student: EnrollmentStudentItem;
  course_plan: CoursePlanItem;
}

/**
 * Fetch courses from the backend (server-side, cached briefly).
 * Returns an empty array on failure so the page always renders.
 */
export async function fetchCourses(): Promise<CourseListItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/courses`, {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return (await res.json()) as CourseListItem[];
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[footer] Failed to fetch courses:", err);
    }
    return [];
  }
}

/**
 * Fetch fee plans from the backend (server-side, cached briefly).
 * Returns an empty array on failure so the page always renders.
 */
export async function fetchFees(): Promise<FeePlanItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/fees`, {
      next: { revalidate: CATALOG_REVALIDATE_SECONDS },
    });
    if (!res.ok) return [];
    return (await res.json()) as FeePlanItem[];
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[fees] Failed to fetch fees:", err);
    }
    return [];
  }
}

/**
 * Strict variant of fetchCourses: throws on failure instead of swallowing it.
 * For pages with their own loading/error boundaries (app/courses, app/courses/[slug]),
 * where a real error state is preferable to a silently-empty list.
 */
export async function fetchCoursesOrThrow(): Promise<CourseListItem[]> {
  const res = await fetch(`${BASE_URL}/courses`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`Failed to load courses (${res.status})`);
  }
  return (await res.json()) as CourseListItem[];
}

/**
 * Strict variant of fetchFees: throws on failure instead of swallowing it.
 * For the enrollment confirmation page, which needs fees to resolve a course
 * name and has its own error boundary.
 */
export async function fetchFeesOrThrow(): Promise<FeePlanItem[]> {
  const res = await fetch(`${BASE_URL}/fees`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`Failed to load fees (${res.status})`);
  }
  return (await res.json()) as FeePlanItem[];
}

/**
 * Fetch one course's full record (with its course_plans) by id.
 * Returns null for a real 404 (course not found); throws on any other failure.
 */
export async function fetchCourseDetail(
  id: number,
): Promise<CourseDetailItem | null> {
  const res = await fetch(`${BASE_URL}/courses/${id}`, {
    next: { revalidate: CATALOG_REVALIDATE_SECONDS },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load course ${id} (${res.status})`);
  }
  return (await res.json()) as CourseDetailItem;
}

/** Thrown by searchCourses; `status` lets the UI tell "busy" (429) from "unavailable" (503). */
export class CourseSearchError extends Error {
  constructor(public status: number) {
    super(`Search failed (${status})`);
  }
}

/**
 * Semantic course search (client-safe: NEXT_PUBLIC_API_URL is inlined for the browser too).
 * Throws CourseSearchError on failure so callers can show an explicit error state instead of a blank result.
 */
export async function searchCourses(
  query: string,
  signal?: AbortSignal,
): Promise<CourseListItem[]> {
  const res = await fetch(
    `${BASE_URL}/courses/search?q=${encodeURIComponent(query)}`,
    { signal },
  );
  if (!res.ok) {
    throw new CourseSearchError(res.status);
  }
  return (await res.json()) as CourseListItem[];
}

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  whatsapp: "WhatsApp number",
  country: "Country",
  preferred_time: "Preferred time",
  course_plan_id: "Plan",
};

/**
 * Field errors from a FastAPI 422 body, keyed by the API field name
 * ({ phone: "Phone must contain 7 to 15 digits." }). Messages that are already
 * sentences ("Enter a valid email address") are used as they are; short rules
 * ("must be at most 100 characters") get the field's label in front.
 */
function fieldErrorsFrom422(detail: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(detail)) return out;
  for (const item of detail as { loc?: unknown; msg?: unknown }[]) {
    if (typeof item?.msg !== "string" || !Array.isArray(item.loc)) continue;
    const field = String(item.loc.at(-1));
    const label = FIELD_LABELS[field];
    if (!label || out[field]) continue;
    const msg = item.msg.replace(/^Value error, /, "").replace(/\.$/, "");
    out[field] = /^[A-Z]/.test(msg) ? `${msg}.` : `${label} ${msg}.`;
  }
  return out;
}

export interface EnrollmentPayload {
  name: string;
  email: string;
  phone: string;
  country: string;
  course_plan_id: number;
  /** "HH:MM" (24h) — matches the backend's `time` field; minutes 00 or 30 for new submissions. */
  preferred_time: string;
  /** Optional; omitted when empty. */
  whatsapp?: string;
}

export type CreateEnrollmentResult =
  | { ok: true; id: number; confirmationToken: string }
  /** fieldErrors (422) is keyed by API field name, for inline messages. */
  | { ok: false; status: number; message: string; fieldErrors?: Record<string, string> };

/**
 * Fetch one enrollment (student + course_plan nested) by its unguessable
 * confirmation token — the only public way to read an enrollment.
 * Returns null for a real 404 (unknown token); throws on any other failure.
 * Never cached — an enrollment's status can change after it's created.
 */
export async function fetchEnrollmentByToken(token: string): Promise<EnrollmentDetailItem | null> {
  const res = await fetch(`${BASE_URL}/enrollments/confirmation/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load enrollment confirmation (${res.status})`);
  }
  return (await res.json()) as EnrollmentDetailItem;
}

/** Client-safe: submits the enrollment form. Never throws — every outcome is in the return value. */
export async function createEnrollment(
  payload: EnrollmentPayload,
): Promise<CreateEnrollmentResult> {
  try {
    const res = await fetch(`${BASE_URL}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const body = (await res.json()) as { id: number; confirmation_token: string };
      return { ok: true, id: body.id, confirmationToken: body.confirmation_token };
    }

    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "Too many submissions. Please try again later.",
      };
    }
    if (res.status === 409) {
      return {
        ok: false,
        status: 409,
        message: "You're already enrolled in this plan.",
      };
    }
    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        message: "That plan is no longer available — please choose again.",
      };
    }

    let detail = "";
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
      else if (res.status === 422) {
        const fieldErrors = fieldErrorsFrom422(body.detail);
        return { ok: false, status: 422, message: "Please check the highlighted fields.", fieldErrors };
      }
    } catch {
      // Body wasn't JSON — fall through to the generic message.
    }
    return {
      ok: false,
      status: res.status,
      message: detail || "Something went wrong. Please try again.",
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[enroll] Failed to submit enrollment:", err);
    }
    return {
      ok: false,
      status: 0,
      message: "Network error — please check your connection and try again.",
    };
  }
}

export interface TrialRequestPayload {
  name: string;
  email: string;
  /** The form's "WhatsApp Number" field (stored as `whatsapp`, separate from a student's phone). */
  whatsapp: string;
  country: string;
}

export type CreateTrialRequestResult =
  | { ok: true }
  | { ok: false; status: number; message: string; fieldErrors?: Record<string, string> };

/** Client-safe: submits the free-trial form to POST /trial-requests (not /enrollments). Never throws — every outcome is in the return value. */
export async function createTrialRequest(
  payload: TrialRequestPayload,
): Promise<CreateTrialRequestResult> {
  try {
    const res = await fetch(`${BASE_URL}/trial-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) return { ok: true };

    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        message: "Too many submissions. Please try again later.",
      };
    }
    if (res.status === 422) {
      let fieldErrors: Record<string, string> = {};
      try {
        fieldErrors = fieldErrorsFrom422(((await res.json()) as { detail?: unknown }).detail);
      } catch {
        // Body wasn't JSON — no field to point at.
      }
      return { ok: false, status: 422, message: "Please check your details and try again.", fieldErrors };
    }

    return {
      ok: false,
      status: res.status,
      message: "Something went wrong. Please try again.",
    };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[trial] Failed to submit trial request:", err);
    }
    return {
      ok: false,
      status: 0,
      message: "Network error — please check your connection and try again.",
    };
  }
}

// ── Blog (public, published posts only) ────────────────────────────────────

/**
 * Server-to-server base URL for the blog fetchers: API_URL (server-only,
 * optional, read at runtime) wins, like lib/admin-api.ts, then the public URL.
 */
const SERVER_BASE_URL = process.env.API_URL || BASE_URL;

/**
 * Every blog fetch carries this tag. The admin blog Server Actions call
 * updateTag(BLOG_CACHE_TAG) after each change, so the public pages show it on
 * the very next request; the 300s revalidate is only a safety net.
 */
export const BLOG_CACHE_TAG = "blog";
const BLOG_REVALIDATE_SECONDS = 300;

export interface BlogPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string | null;
  updated_at: string;
}

export interface BlogPostDetail extends BlogPostSummary {
  /** Raw Markdown — render only with components/markdown/markdown-content.tsx. */
  content: string;
}

export interface BlogPostPage {
  items: BlogPostSummary[];
  total: number;
  limit: number;
  offset: number;
}

/** "Not found" (missing or draft post) is kept apart from "the backend failed". */
export type BlogResult<T> = { ok: true; data: T } | { ok: false; notFound: boolean };

const BLOG_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** GET /blog?limit&offset (limit 1–50). Never throws. */
export async function fetchBlogPosts({
  limit,
  offset,
}: {
  limit: number;
  offset: number;
}): Promise<BlogResult<BlogPostPage>> {
  const params = new URLSearchParams({
    limit: String(Math.min(50, Math.max(1, Math.trunc(limit)))),
    offset: String(Math.max(0, Math.trunc(offset))),
  });
  try {
    const res = await fetch(`${SERVER_BASE_URL}/blog?${params}`, {
      next: { revalidate: BLOG_REVALIDATE_SECONDS, tags: [BLOG_CACHE_TAG] },
    });
    if (!res.ok) return { ok: false, notFound: false };
    return { ok: true, data: (await res.json()) as BlogPostPage };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[blog] Failed to fetch posts:", err);
    }
    return { ok: false, notFound: false };
  }
}

/**
 * GET /blog/{slug}. A 404 (missing or draft) is `notFound: true`; a slug that
 * can't exist (wrong format) is answered without calling the backend. Never throws.
 */
export async function fetchBlogPost(slug: string): Promise<BlogResult<BlogPostDetail>> {
  if (!BLOG_SLUG_RE.test(slug) || slug.length > 200) return { ok: false, notFound: true };
  try {
    const res = await fetch(`${SERVER_BASE_URL}/blog/${slug}`, {
      next: { revalidate: BLOG_REVALIDATE_SECONDS, tags: [BLOG_CACHE_TAG] },
    });
    if (res.status === 404) return { ok: false, notFound: true };
    if (!res.ok) return { ok: false, notFound: false };
    return { ok: true, data: (await res.json()) as BlogPostDetail };
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(`[blog] Failed to fetch post "${slug}":`, err);
    }
    return { ok: false, notFound: false };
  }
}
