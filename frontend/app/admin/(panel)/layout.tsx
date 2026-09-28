import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSummary } from "@/lib/admin-data";
import { formatAdminDate } from "@/lib/admin-format";

/**
 * Protected admin panel. proxy.ts has already redirected visitors without a
 * cookie; this confirms the token with the backend on each full page load
 * (there is no /auth/me, so it uses the cheap GET /admin/summary — memoized,
 * so the dashboard reuses the same response instead of a second request). A 401
 * makes adminFetch clear the cookie and send the admin to the login page.
 * Other failures (e.g. backend down) don't block the shell — sections show
 * their own errors.
 */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  await getAdminSummary();
  // Formatted on the server so it follows ADMIN_TIME_ZONE, not the browser's zone.
  return <AdminShell today={formatAdminDate(new Date())}>{children}</AdminShell>;
}
