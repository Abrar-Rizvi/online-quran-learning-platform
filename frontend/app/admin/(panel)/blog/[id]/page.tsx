import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/blog/post-editor";
import { WidgetError } from "@/components/admin/dashboard/widget";
import { toEditorPost } from "@/lib/admin-blog";
import { getAdminBlogPost } from "@/lib/admin-data";

export const metadata: Metadata = {
  title: "Edit post",
};

/** Only positive whole numbers are post ids; anything else is "not found" without a backend call. */
function parseId(raw: string): number | null {
  if (!/^\d{1,9}$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 ? id : null;
}

export default async function AdminEditPostPage({ params }: PageProps<"/admin/blog/[id]">) {
  const id = parseId((await params).id);
  if (id === null) notFound();

  const res = await getAdminBlogPost(id);
  if (!res.ok) {
    if (res.status === 404) notFound();
    return <WidgetError title="Edit post" retryHref={`/admin/blog/${id}`} />;
  }

  // Keyed by id so moving between posts never carries one post's edits into another.
  return <PostEditor key={res.data.id} post={toEditorPost(res.data)} />;
}
