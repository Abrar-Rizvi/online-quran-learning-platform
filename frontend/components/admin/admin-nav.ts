import type { ComponentType } from "react";
import {
  BlogIcon,
  ClockIcon,
  ConversationsIcon,
  DashboardIcon,
  EnrollmentsIcon,
  InboxIcon,
  StudentsIcon,
} from "./admin-icons";
import { OWNER_ROLE, SEO_EDITOR_ROLE } from "@/lib/admin-role";

export interface AdminNavItem {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
}

/** Admin sidebar/drawer items, in display order. */
export const ADMIN_NAV: AdminNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: DashboardIcon },
  { label: "Trial requests", href: "/admin/trial-requests", icon: InboxIcon },
  { label: "Enrollments", href: "/admin/enrollments", icon: EnrollmentsIcon },
  { label: "Students", href: "/admin/students", icon: StudentsIcon },
  { label: "Conversations", href: "/admin/conversations", icon: ConversationsIcon },
  { label: "Blog", href: "/admin/blog", icon: BlogIcon },
  { label: "Team", href: "/admin/team", icon: StudentsIcon },
  { label: "Activity", href: "/admin/activity", icon: ClockIcon },
];

/** Sections an seo_editor may see (backend still enforces the real permission). */
const SEO_EDITOR_HREFS = new Set(["/admin/blog"]);
const OWNER_ONLY_HREFS = new Set(["/admin/team", "/admin/activity"]);

/**
 * Editors see Blog. Team and Activity appear when the owner's role is confirmed.
 */
export function adminNavForRole(role: string | null | undefined): AdminNavItem[] {
  if (role === SEO_EDITOR_ROLE) {
    return ADMIN_NAV.filter((item) => SEO_EDITOR_HREFS.has(item.href));
  }
  return role === OWNER_ROLE ? ADMIN_NAV : ADMIN_NAV.filter((item) => !OWNER_ONLY_HREFS.has(item.href));
}

/** Dashboard only matches exactly; every other section also owns its sub-pages. */
export function isAdminNavActive(href: string, pathname: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getAdminSectionTitle(pathname: string): string {
  // Blog editor pages name the task instead of the section.
  if (pathname === "/admin/blog/new") return "New post";
  if (pathname.startsWith("/admin/blog/")) return "Edit post";
  return ADMIN_NAV.find((item) => isAdminNavActive(item.href, pathname))?.label ?? "Admin";
}
