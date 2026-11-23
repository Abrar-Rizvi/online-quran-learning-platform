import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { adminFetch } from "./admin-api";
import { SEO_EDITOR_ROLE } from "./admin-role";

/** Response shapes of the admin endpoints (see backend/api_information.txt). */

/** GET /admin/me: the authenticated admin's identity + role. */
export interface AdminMe {
  name: string;
  email: string | null;
  role: string;
}

export type EnrollmentStatusValue = "on_trial" | "active" | "cancelled" | "alumni";

export interface AdminSummary {
  total_students: number;
  total_enrollments: number;
  by_status: Record<EnrollmentStatusValue, number>;
}

export interface AdminEnrollment {
  id: number;
  student: { id: number; name: string; email: string; registration_no: string; whatsapp?: string | null };
  course_name: string;
  days_per_week: number;
  /** Decimal string, e.g. "30.00". */
  fee: string;
  currency: string;
  status: EnrollmentStatusValue;
  enrolled_at: string;
  preferred_time: string | null;
}

export interface AdminStudent {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  whatsapp?: string | null;
  country: string | null;
  registration_no: string;
  created_at: string;
}

export interface CourseEnrollmentCount {
  course_id: number;
  course_name: string;
  enrollment_count: number;
}

export interface AdminBlogPostSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

/** GET /admin/blog/{id}: the summary fields plus the Markdown content and cover image. */
export interface AdminBlogPost extends AdminBlogPostSummary {
  content: string;
  cover_image_url: string | null;
}

export type TrialRequestStatusValue = "on_trial" | "enrolled" | "cancelled";

export interface AdminTrialRequest {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  country: string;
  status: TrialRequestStatusValue;
  created_at: string;
}

export interface AdminConversation {
  id: number;
  started_at: string;
  last_message_at: string;
  message_count: number;
}

/*
 * Per-request memoized GETs: the panel layout's session check and the
 * dashboard widgets share one backend request per endpoint per page load.
 */
export const getAdminSummary = cache(() => adminFetch<AdminSummary>("/admin/summary"));
export const getAdminMe = cache(() => adminFetch<AdminMe>("/admin/me"));
export const getAdminEnrollments = cache(() => adminFetch<AdminEnrollment[]>("/admin/enrollments"));
export const getAdminStudents = cache(() => adminFetch<AdminStudent[]>("/admin/students"));
export const getCourseEnrollmentCounts = cache(() =>
  adminFetch<CourseEnrollmentCount[]>("/admin/analytics/course-enrollments"),
);
export const getAdminBlogPosts = cache(() => adminFetch<AdminBlogPostSummary[]>("/admin/blog"));
export const getAdminBlogPost = cache((id: number) => adminFetch<AdminBlogPost>(`/admin/blog/${id}`));
export const getAdminTrialRequests = cache(() => adminFetch<AdminTrialRequest[]>("/admin/trial-requests"));
export const getAdminConversations = cache(() =>
  adminFetch<AdminConversation[]>("/admin/conversations"),
);

/**
 * Owner-only route guard. seo_editor is sent to the blog (their only section);
 * other roles and a failed /admin/me (backend down) pass through so the page's
 * own fetch can show its error. The 401 path is handled inside adminFetch.
 */
export async function requireOwnerRole(): Promise<void> {
  const me = await getAdminMe();
  if (me.ok && me.data.role === SEO_EDITOR_ROLE) {
    redirect("/admin/blog");
  }
}
