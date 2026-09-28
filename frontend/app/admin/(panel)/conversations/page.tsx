import type { Metadata } from "next";
import { AdminPlaceholder } from "@/components/admin/admin-placeholder";

export const metadata: Metadata = {
  title: "Conversations",
};

export default function AdminConversationsPage() {
  return <AdminPlaceholder title="Conversations" />;
}
