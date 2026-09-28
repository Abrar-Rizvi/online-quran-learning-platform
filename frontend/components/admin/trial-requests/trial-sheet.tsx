"use client";

import { useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { CourseOption, StudentMatch, TrialRequestRow } from "@/lib/admin-trial-requests";
import { cn } from "@/lib/utils";
import { TrialStatusBadge } from "../status";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { DetailField as Field, SectionTitle, detailLinkClass as linkClass } from "../ui/detail-list";
import { Sheet } from "../ui/sheet";
import { EnrollForm } from "./enroll-form";
import { useTrialMutations } from "./trial-mutations";

const dangerOutline =
  "[--btn-secondary-fg:var(--error)] [--btn-secondary-border:var(--error)] [--btn-secondary-hover:var(--error-bg)] [--btn-secondary-active:var(--error-bg)] [--focus-ring-color:var(--error)]";

/** "Student AOA-1007" — a display-only match by email (trial requests store no student id). */
export function StudentBadge({ student, className }: { student: StudentMatch; className?: string }) {
  return (
    <Link
      href={`/admin/students?view=${student.id}`}
      aria-label={`Student ${student.registrationNo} — open student`}
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-[var(--radius-full)] bg-[var(--green-50)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green-800)] tabular-nums hover:bg-[var(--green-100)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
        className,
      )}
    >
      Student {student.registrationNo}
    </Link>
  );
}

/**
 * Detail sheet for `?view=<id>`; `?enroll=1` opens it straight into the
 * "Enroll this student" form. Leaving the form with edits (Escape, ×,
 * backdrop, Back) asks "Discard your changes?" first.
 */
export function TrialSheet({
  row,
  courses,
  studentsByEmail,
  initialEnroll,
  closeHref,
  viewHref,
}: {
  row: TrialRequestRow;
  courses: CourseOption[] | null;
  studentsByEmail: Record<string, StudentMatch> | null;
  initialEnroll: boolean;
  closeHref: string;
  viewHref: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const { pending, request } = useTrialMutations();
  const canEnroll = row.status === "on_trial";
  const [mode, setMode] = useState<"view" | "enroll">(initialEnroll && canEnroll ? "enroll" : "view");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState<"close" | "view" | null>(null);
  const closeSheet = useRef<(() => void) | null>(null);
  const busy = pending?.id === row.id;

  const close = () => {
    router.replace(closeHref, { scroll: false });
    requestAnimationFrame(() => {
      const trigger = Array.from(document.querySelectorAll<HTMLElement>(`[data-view-trigger="${row.id}"]`)).find(
        (el) => el.offsetParent !== null,
      );
      (trigger ?? document.getElementById("trial-requests-heading"))?.focus();
    });
  };

  const leaveEnroll = () => {
    setMode("view");
    setDirty(false);
    if (initialEnroll) router.replace(viewHref, { scroll: false });
  };

  return (
    <Sheet
      closeRef={closeSheet}
      titleId={titleId}
      title={mode === "enroll" ? "Enroll this student" : "Trial request"}
      onClose={close}
      beforeClose={() => {
        if (mode === "enroll" && dirty) {
          setDiscard("close");
          return false;
        }
        return true;
      }}
    >
      <p className="text-lg font-semibold text-[var(--green-900)]">{row.name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <TrialStatusBadge status={row.status} />
        {row.student && <StudentBadge student={row.student} />}
      </div>

      {mode === "enroll" ? (
        <div className="mt-6">
          <EnrollForm
            row={row}
            courses={courses}
            studentsByEmail={studentsByEmail}
            onDirtyChange={setDirty}
            onDone={leaveEnroll}
            onCancel={(isDirty) => (isDirty ? setDiscard("view") : leaveEnroll())}
          />
        </div>
      ) : (
        <>
          <section aria-label="Contact" className="mt-6">
            <SectionTitle>Contact</SectionTitle>
            <dl className="mt-2 divide-y divide-[var(--border)]">
              <Field label="Email">
                <a href={`mailto:${row.email}`} className={linkClass}>
                  {row.email}
                </a>
              </Field>
              <Field label="WhatsApp">
                <span className="tabular-nums">{row.whatsapp}</span>
                {row.whatsappHref && (
                  <>
                    <br />
                    <a href={row.whatsappHref} target="_blank" rel="noopener noreferrer" className={cn("text-sm", linkClass)}>
                      Chat on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </>
                )}
              </Field>
              <Field label="Country">{row.country || "—"}</Field>
            </dl>
          </section>

          <section aria-label="Request" className="mt-8">
            <SectionTitle>Request</SectionTitle>
            <dl className="mt-2 divide-y divide-[var(--border)]">
              <Field label="Status">
                <TrialStatusBadge status={row.status} />
              </Field>
              <Field label="Requested">
                <span className="tabular-nums">{row.requestedAt}</span>
              </Field>
              <Field label="Student">
                {row.student ? (
                  <StudentBadge student={row.student} />
                ) : (
                  <span className="text-[var(--text-muted)]">No student with this email</span>
                )}
              </Field>
              <Field label="Request ID">
                <span className="tabular-nums">#{row.id}</span>
              </Field>
            </dl>
          </section>

          <section aria-label="Actions" className="mt-8">
            <SectionTitle>Actions</SectionTitle>
            {canEnroll ? (
              <div className="mt-3 flex flex-col gap-3">
                <Button onClick={() => setMode("enroll")} disabled={busy} className="w-full">
                  Enroll this student
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => request("enrolled", row)}
                  loading={busy && pending?.kind === "enrolled"}
                  disabled={busy}
                  className="w-full"
                >
                  Mark as enrolled
                </Button>
                <p className="-mt-1 text-xs text-[var(--text-muted)]">For people who already enrolled themselves on the website.</p>
                <Button
                  variant="secondary"
                  onClick={() => request("cancelled", row)}
                  loading={busy && pending?.kind === "cancelled"}
                  disabled={busy}
                  className={cn("w-full", dangerOutline)}
                >
                  Cancel trial
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-[0.9375rem] text-[var(--text-muted)]">No further changes — this status is final.</p>
            )}

            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <Button
                variant="secondary"
                loading={busy && pending?.kind === "delete"}
                disabled={busy}
                onClick={() => request("delete", row, () => router.replace(closeHref, { scroll: false }))}
                className={cn("w-full", dangerOutline)}
              >
                Delete permanently
              </Button>
              <p className="mt-2 text-xs text-[var(--text-muted)]">Prefer Cancel trial to keep history.</p>
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={discard !== null}
        title="Discard your changes?"
        description="The enrollment details you entered haven't been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setDiscard(null)}
        onConfirm={() => {
          const then = discard;
          setDiscard(null);
          setDirty(false);
          // Through the dialog (not close() directly) so focus can return to the row once the sheet is gone.
          if (then === "close") closeSheet.current?.();
          else leaveEnroll();
        }}
      />
    </Sheet>
  );
}
