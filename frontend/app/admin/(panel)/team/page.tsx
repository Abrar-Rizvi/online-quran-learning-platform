import type { Metadata } from "next";
import { WidgetError } from "@/components/admin/dashboard/widget";
import { ForbiddenNotice } from "@/components/admin/forbidden";
import { TeamList } from "@/components/admin/team/team-list";
import { getAdminUsers, requireOwnerRole } from "@/lib/admin-data";
import { formatAdminDate, formatAdminDateTime, parseApiDate } from "@/lib/admin-format";

export const metadata: Metadata = { title: "Team" };

export default async function AdminTeamPage() {
  await requireOwnerRole();
  const users = await getAdminUsers();

  if (!users.ok) {
    if (users.status === 403) return <ForbiddenNotice />;
    return <WidgetError title="Team" retryHref="/admin/team" />;
  }

  const rows = users.data.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.is_active,
    lastLogin: user.last_login_at ? formatAdminDateTime(parseApiDate(user.last_login_at)) : "Never",
    created: formatAdminDate(parseApiDate(user.created_at)),
  }));

  return <TeamList rows={rows} />;
}
