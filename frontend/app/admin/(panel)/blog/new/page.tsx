import type { Metadata } from "next";
import { PostEditor } from "@/components/admin/blog/post-editor";

export const metadata: Metadata = {
  title: "New post",
};

export default function AdminNewPostPage() {
  return <PostEditor post={null} />;
}
