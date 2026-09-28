"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { deleteTrialRequest, updateTrialRequestStatus } from "@/app/admin/(panel)/trial-requests/actions";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";

interface Target {
  id: number;
  name: string;
}

type Kind = "enrolled" | "cancelled" | "delete";
type Pending = { id: number; kind: Kind } | null;
type ConfirmState = { kind: Kind; row: Target; onDone?: () => void } | null;

/** Every action here asks first; each back-out label says what is kept. */
const DIALOGS: Record<
  Kind,
  { title: string; description: string; confirmLabel: string; cancelLabel: string; tone: "default" | "danger"; success: string }
> = {
  enrolled: {
    title: "Mark as enrolled without creating an enrollment?",
    description: "Use this when they already enrolled themselves through the website. No student or enrollment is created.",
    confirmLabel: "Mark as enrolled",
    cancelLabel: "Keep on trial",
    tone: "default",
    success: "Trial request marked as enrolled.",
  },
  cancelled: {
    title: "Cancel this trial request? This can't be undone.",
    description: "Use this when they didn't continue after the trial. It stays in the Cancelled tab.",
    confirmLabel: "Cancel trial",
    cancelLabel: "Keep on trial",
    tone: "danger",
    success: "Trial cancelled.",
  },
  delete: {
    title: "Delete this trial request permanently?",
    description: "Prefer Cancel trial to keep history.",
    confirmLabel: "Delete permanently",
    cancelLabel: "Keep request",
    tone: "danger",
    success: "Trial request deleted.",
  },
};

interface MutationsValue {
  pending: Pending;
  request: (kind: Kind, row: Target, onDone?: () => void) => void;
}

const Ctx = createContext<MutationsValue | null>(null);

export function useTrialMutations() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTrialMutations must be used inside <TrialMutationsProvider>");
  return ctx;
}

/** Mark as enrolled / Cancel trial / Delete, shared by the row menu and the detail sheet. */
export function TrialMutationsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState<Pending>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const run = useCallback(
    ({ kind, row, onDone }: NonNullable<ConfirmState>) => {
      setPending({ id: row.id, kind });
      startTransition(async () => {
        const res = kind === "delete" ? await deleteTrialRequest(row.id) : await updateTrialRequestStatus(row.id, kind);
        setConfirm(null);
        setPending(null);
        if (res.ok) {
          toast(DIALOGS[kind].success);
          if (kind === "delete") onDone?.();
        } else {
          toast(res.message, "error");
          if (res.notFound) onDone?.();
        }
      });
    },
    [toast],
  );

  const value = useMemo<MutationsValue>(
    () => ({ pending, request: (kind, row, onDone) => setConfirm({ kind, row, onDone }) }),
    [pending],
  );

  const dialog = confirm ? DIALOGS[confirm.kind] : null;

  return (
    <Ctx.Provider value={value}>
      {children}
      <ConfirmDialog
        open={confirm !== null}
        title={dialog?.title ?? ""}
        description={confirm && dialog ? `${confirm.row.name}. ${dialog.description}` : ""}
        confirmLabel={dialog?.confirmLabel ?? ""}
        cancelLabel={dialog?.cancelLabel ?? ""}
        tone={dialog?.tone}
        pending={pending !== null}
        onConfirm={() => confirm && run(confirm)}
        onCancel={() => setConfirm(null)}
      />
    </Ctx.Provider>
  );
}
