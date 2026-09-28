import type { ComponentType } from "react";
import {
  BlogIcon,
  ConversationsIcon,
  DashboardIcon,
  EnrollmentsIcon,
  InboxIcon,
  StudentsIcon,
} from "./admin-icons";

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
];

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
