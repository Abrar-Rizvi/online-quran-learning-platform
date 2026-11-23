import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminMe } from "@/lib/admin-data";
import { formatAdminDate } from "@/lib/admin-format";

/**
 * Protected admin panel. proxy.ts has already redirected visitors without a
 * cookie; this confirms the token and loads the admin's identity + role with
 * GET /admin/me on each full page load. A 401 makes adminFetch clear the
 * cookie and send the admin to the login page. Other failures (e.g. backend
 * down) don't block the shell — sections show their own errors, and the
 * sidebar waits for a confirmed role.
 */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  const me = await getAdminMe();
  const user = me.ok
    ? { name: me.data.name, email: me.data.email, role: me.data.role }
    : null;
  // Formatted on the server so it follows ADMIN_TIME_ZONE, not the browser's zone.
  return (
    <AdminShell today={formatAdminDate(new Date())} user={user}>
      {children}
    </AdminShell>
  );
}
