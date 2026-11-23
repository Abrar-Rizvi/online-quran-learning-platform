import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";
import { requireOwnerRole } from "@/lib/admin-data";

export const metadata: Metadata = {
  title: "Conversations",
};

export default async function AdminConversationsPage() {
  await requireOwnerRole();
  return <AdminPlaceholder title="Conversations" />;
}
