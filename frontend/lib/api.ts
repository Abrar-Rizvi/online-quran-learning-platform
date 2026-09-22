/** Lightweight server-side API helpers. */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

/**
 * Fetch courses from the backend (server-side, cached for 1 hour).
 * Returns an empty array on failure so the page always renders.
 */
export async function fetchCourses(): Promise<CourseListItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/courses`, {
      next: { revalidate: 3600 },
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
 * Fetch fee plans from the backend (server-side, cached for 1 hour).
 * Returns an empty array on failure so the page always renders.
 */
export async function fetchFees(): Promise<FeePlanItem[]> {
  try {
    const res = await fetch(`${BASE_URL}/fees`, {
      next: { revalidate: 3600 },
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
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Failed to load courses (${res.status})`);
  }
  return (await res.json()) as CourseListItem[];
}

/**
 * Fetch one course's full record (with its course_plans) by id.
 * Returns null for a real 404 (course not found); throws on any other failure.
 */
export async function fetchCourseDetail(
  id: number,
): Promise<CourseDetailItem | null> {
  const res = await fetch(`${BASE_URL}/courses/${id}`, {
    next: { revalidate: 3600 },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Failed to load course ${id} (${res.status})`);
  }
  return (await res.json()) as CourseDetailItem;
}

/**
 * Semantic course search (client-safe: NEXT_PUBLIC_API_URL is inlined for the browser too).
 * Throws on failure so callers can show an explicit error state instead of a blank result.
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
    throw new Error(`Search failed (${res.status})`);
  }
  return (await res.json()) as CourseListItem[];
}

export interface EnrollmentPayload {
  name: string;
  email: string;
  phone?: string;
  country?: string;
  course_plan_id: number;
  /** "HH:MM" — matches the backend's `time` field and <input type="time"> output. */
  preferred_time?: string;
}

export type CreateEnrollmentResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

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

    if (res.ok) return { ok: true };

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
  country?: string;
}

export type CreateTrialRequestResult =
  | { ok: true }
  | { ok: false; status: number; message: string };

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

    if (res.status === 422) {
      return {
        ok: false,
        status: 422,
        message: "Please check your details and try again.",
      };
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
