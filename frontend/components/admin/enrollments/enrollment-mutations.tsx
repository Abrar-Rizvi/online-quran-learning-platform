"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { deleteEnrollment, updateEnrollmentStatus } from "@/app/admin/(panel)/enrollments/actions";
import type { EnrollmentStatus } from "@/lib/enrollment";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";

/** What the admin sees for each allowed target status. */
export const STATUS_ACTIONS: Record<
  EnrollmentStatus,
  { label: string; tone: "default" | "danger"; success: string; confirm?: { title: string; confirmLabel: string; cancelLabel: string } }
> = {
  active: { label: "Mark as active", tone: "default", success: "Enrollment marked as active." },
  alumni: {
    label: "Mark as alumni",
    tone: "default",
    success: "Enrollment marked as alumni.",
    confirm: { title: "Mark this enrollment as alumni?", confirmLabel: "Mark as alumni", cancelLabel: "Keep as active" },
  },
  cancelled: {
    label: "Cancel enrollment",
    tone: "danger",
    success: "Enrollment cancelled.",
    confirm: { title: "Cancel this enrollment?", confirmLabel: "Cancel enrollment", cancelLabel: "Keep enrollment" },
  },
  on_trial: { label: "Mark as on trial", tone: "default", success: "Enrollment marked as on trial." },
};

interface Target {
  id: number;
  name: string;
  course: string;
}

type Pending = { id: number; kind: "status" | "delete"; target?: EnrollmentStatus } | null;
type ConfirmState =
  | { kind: "status"; row: Target; target: EnrollmentStatus }
  | { kind: "delete"; row: Target; onDeleted?: () => void }
  | null;

interface MutationsValue {
  pending: Pending;
  requestStatus: (row: Target, target: EnrollmentStatus) => void;
  requestDelete: (row: Target, onDeleted?: () => void) => void;
}

const MutationsContext = createContext<MutationsValue | null>(null);

export function useEnrollmentMutations() {
  const ctx = useContext(MutationsContext);
  if (!ctx) throw new Error("useEnrollmentMutations must be used inside <EnrollmentMutationsProvider>");
  return ctx;
}

export function EnrollmentMutationsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState<Pending>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const runStatus = useCallback(
    (row: Target, target: EnrollmentStatus) => {
      setPending({ id: row.id, kind: "status", target });
      startTransition(async () => {
        const res = await updateEnrollmentStatus(row.id, target);
        if (res.ok) toast(STATUS_ACTIONS[target].success);
        else toast(res.message, "error");
        setConfirm(null);
        setPending(null);
      });
    },
    [toast],
  );

  const runDelete = useCallback(
    (row: Target, onDeleted?: () => void) => {
      setPending({ id: row.id, kind: "delete" });
      startTransition(async () => {
        const res = await deleteEnrollment(row.id);
        setConfirm(null);
        setPending(null);
        if (res.ok) {
          toast("Enrollment deleted.");
          onDeleted?.();
        } else {
          toast(res.message, "error");
          if (res.notFound) onDeleted?.();
        }
      });
    },
    [toast],
  );

  const value = useMemo<MutationsValue>(
    () => ({
      pending,
      requestStatus: (row, target) => {
        if (STATUS_ACTIONS[target].confirm) setConfirm({ kind: "status", row, target });
        else runStatus(row, target);
      },
      requestDelete: (row, onDeleted) => setConfirm({ kind: "delete", row, onDeleted }),
    }),
    [pending, runStatus],
  );

  const dialog =
    confirm?.kind === "status"
      ? {
          title: STATUS_ACTIONS[confirm.target].confirm!.title,
          description: `${confirm.row.name} · ${confirm.row.course}. This can't be undone.`,
          confirmLabel: STATUS_ACTIONS[confirm.target].confirm!.confirmLabel,
          cancelLabel: STATUS_ACTIONS[confirm.target].confirm!.cancelLabel,
          tone: STATUS_ACTIONS[confirm.target].tone,
          onConfirm: () => runStatus(confirm.row, confirm.target),
        }
      : confirm?.kind === "delete"
        ? {
            title: "Delete this enrollment permanently?",
            description:
              "It will be removed from all records and analytics. To keep history, use Cancel enrollment instead.",
            confirmLabel: "Delete permanently",
            cancelLabel: "Keep enrollment",
            tone: "danger" as const,
            onConfirm: () => runDelete(confirm.row, confirm.onDeleted),
          }
        : null;

  return (
    <MutationsContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={dialog !== null}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
        confirmLabel={dialog?.confirmLabel ?? ""}
        cancelLabel={dialog?.cancelLabel ?? ""}
        tone={dialog?.tone}
        pending={pending !== null}
        onConfirm={() => dialog?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />
    </MutationsContext.Provider>
  );
}
