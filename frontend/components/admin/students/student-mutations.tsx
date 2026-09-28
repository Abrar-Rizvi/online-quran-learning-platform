"use client";

import { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { deleteStudent } from "@/app/admin/(panel)/students/actions";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";

interface Target {
  id: number;
  name: string;
  registrationNo: string;
}

interface StudentMutationsValue {
  /** Id of the student whose delete is running. */
  pendingId: number | null;
  requestDelete: (student: Target, onDeleted?: () => void) => void;
}

const Ctx = createContext<StudentMutationsValue | null>(null);

export function useStudentMutations() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStudentMutations must be used inside <StudentMutationsProvider>");
  return ctx;
}

/** Owns the delete confirmation so the row menu and the detail sheet behave the same. */
export function StudentMutationsProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ student: Target; onDeleted?: () => void } | null>(null);

  const runDelete = useCallback(
    (student: Target, onDeleted?: () => void) => {
      setPendingId(student.id);
      startTransition(async () => {
        const res = await deleteStudent(student.id);
        setConfirm(null);
        setPendingId(null);
        if (res.ok) {
          toast("Student deleted.");
          onDeleted?.();
        } else {
          // 409 carries the backend's own explanation ("Student N has X enrollment(s)…").
          toast(res.message, "error");
          if (res.notFound) onDeleted?.();
        }
      });
    },
    [toast],
  );

  const value = useMemo<StudentMutationsValue>(
    () => ({ pendingId, requestDelete: (student, onDeleted) => setConfirm({ student, onDeleted }) }),
    [pendingId],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <ConfirmDialog
        open={confirm !== null}
        title="Delete this student permanently?"
        description={
          confirm
            ? `${confirm.student.name} (${confirm.student.registrationNo}) will be removed. This can't be undone, and the registration number won't be reused.`
            : ""
        }
        confirmLabel="Delete permanently"
        cancelLabel="Keep student"
        tone="danger"
        pending={pendingId !== null}
        onConfirm={() => confirm && runDelete(confirm.student, confirm.onDeleted)}
        onCancel={() => setConfirm(null)}
      />
    </Ctx.Provider>
  );
}
