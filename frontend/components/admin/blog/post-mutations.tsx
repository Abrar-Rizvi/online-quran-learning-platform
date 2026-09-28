"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { deletePost, updatePost } from "@/app/admin/(panel)/blog/actions";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";

/** Shared wording, so the list and the editor ask the same questions. */
export const UNPUBLISH_CONFIRM = {
  title: "Unpublish this post?",
  description: "It will disappear from the website.",
  confirmLabel: "Unpublish",
  cancelLabel: "Keep published",
} as const;

export const DELETE_CONFIRM = {
  title: "Delete this post permanently?",
  description: "This can't be undone.",
  confirmLabel: "Delete permanently",
  cancelLabel: "Keep post",
} as const;

export const POST_TOASTS = {
  published: "Post published.",
  unpublished: "Post unpublished. It's no longer on the website.",
  deleted: "Post deleted.",
} as const;

interface Target {
  id: number;
  title: string;
}

interface PostMutationsValue {
  /** Id of the post whose request is running. */
  pendingId: number | null;
  publish: (post: Target) => void;
  requestUnpublish: (post: Target) => void;
  requestDelete: (post: Target) => void;
}

const Ctx = createContext<PostMutationsValue | null>(null);

export function usePostMutations() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePostMutations must be used inside <PostMutationsProvider>");
  return ctx;
}

/** Publish / Unpublish / Delete from the posts list (row menu), with the confirmations. */
export function PostMutationsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ kind: "unpublish" | "delete"; post: Target } | null>(null);

  const run = useCallback(
    (post: Target, kind: "publish" | "unpublish" | "delete") => {
      setPendingId(post.id);
      startTransition(async () => {
        const res =
          kind === "delete"
            ? await deletePost(post.id)
            : await updatePost(post.id, { status: kind === "publish" ? "published" : "draft" });
        setConfirm(null);
        setPendingId(null);
        if (res.ok) toast(kind === "delete" ? POST_TOASTS.deleted : POST_TOASTS[`${kind}ed`]);
        else toast(res.message, "error");
      });
    },
    [toast],
  );

  const value = useMemo<PostMutationsValue>(
    () => ({
      pendingId,
      publish: (post) => run(post, "publish"),
      requestUnpublish: (post) => setConfirm({ kind: "unpublish", post }),
      requestDelete: (post) => setConfirm({ kind: "delete", post }),
    }),
    [pendingId, run],
  );

  const text = confirm?.kind === "delete" ? DELETE_CONFIRM : UNPUBLISH_CONFIRM;

  return (
    <Ctx.Provider value={value}>
      {children}
      <ConfirmDialog
        open={confirm !== null}
        title={text.title}
        description={confirm ? `“${confirm.post.title}”: ${text.description}` : ""}
        confirmLabel={text.confirmLabel}
        cancelLabel={text.cancelLabel}
        tone={confirm?.kind === "delete" ? "danger" : "default"}
        pending={pendingId !== null}
        onConfirm={() => confirm && run(confirm.post, confirm.kind)}
        onCancel={() => setConfirm(null)}
      />
    </Ctx.Provider>
  );
}
