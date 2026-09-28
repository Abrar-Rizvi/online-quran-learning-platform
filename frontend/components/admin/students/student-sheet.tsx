"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateStudent, type StudentChanges, type StudentField } from "@/app/admin/(panel)/students/actions";
import { Button, FormField, inputClasses } from "@/components/ui";
import type { StudentDetail } from "@/lib/admin-students";
import { phoneError } from "@/lib/form-rules";
import { changedFields, cn } from "@/lib/utils";
import { StatusBadge } from "../status";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { DetailField, SectionTitle, detailLinkClass } from "../ui/detail-list";
import { Sheet } from "../ui/sheet";
import { useToast } from "../ui/toast";
import { useStudentMutations } from "./student-mutations";
import { deleteBlockedReason } from "./student-row-actions";

/** Same rule as the backend's StudentUpdate email check. */
const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

type FormValues = Record<StudentField, string>;
type FormErrors = Partial<Record<StudentField | "form", string>>;

const dangerOutline =
  "[--btn-secondary-fg:var(--error)] [--btn-secondary-border:var(--error)] [--btn-secondary-hover:var(--error-bg)] [--btn-secondary-active:var(--error-bg)] [--focus-ring-color:var(--error)]";

/** Values as the backend would store them, so "no real change" isn't sent. */
function normalize(v: FormValues): FormValues {
  return {
    name: v.name.trim(),
    email: v.email.trim().toLowerCase(),
    phone: v.phone.trim(),
    whatsapp: v.whatsapp.trim(),
    country: v.country.trim(),
  };
}

function studentChanges(original: FormValues, current: FormValues): StudentChanges {
  return changedFields(normalize(original), normalize(current));
}

function validate(v: FormValues): FormErrors {
  const n = normalize(v);
  const errors: FormErrors = {};
  if (!n.name) errors.name = "Enter the student's name.";
  if (!n.email) errors.email = "Enter an email address.";
  else if (!EMAIL_RE.test(n.email)) errors.email = "Enter a valid email address, like name@example.com.";
  const whatsapp = phoneError(n.whatsapp, "WhatsApp number");
  if (whatsapp) errors.whatsapp = whatsapp;
  return errors;
}

function EditForm({
  student,
  onDone,
  onCancel,
  onDirtyChange,
  onGone,
}: {
  student: StudentDetail;
  onDone: () => void;
  onCancel: (dirty: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
  onGone: () => void;
}) {
  const toast = useToast();
  const ids = {
    name: useId(),
    email: useId(),
    phone: useId(),
    whatsapp: useId(),
    country: useId(),
    phoneHint: useId(),
    whatsappHint: useId(),
    countryHint: useId(),
  };
  const original: FormValues = {
    name: student.name,
    email: student.email,
    phone: student.phone ?? "",
    whatsapp: student.whatsapp ?? "",
    country: student.country ?? "",
  };
  const [values, setValues] = useState<FormValues>(original);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pending, startTransition] = useTransition();
  // Inputs are disabled while saving, so a server error's field is focused after re-enabling.
  const focusAfterSave = useRef<StudentField | null>(null);
  useEffect(() => {
    if (!pending && focusAfterSave.current) {
      document.getElementById(ids[focusAfterSave.current])?.focus();
      focusAfterSave.current = null;
    }
  });

  const changes = studentChanges(original, values);
  const dirty = Object.keys(changes).length > 0;

  const set = (key: StudentField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = { ...values, [key]: e.target.value };
    setValues(next);
    onDirtyChange(Object.keys(studentChanges(original, next)).length > 0);
    if (errors[key] || errors.form) setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const found = validate(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      document.getElementById(ids[Object.keys(found)[0] as StudentField])?.focus();
      return;
    }
    startTransition(async () => {
      const res = await updateStudent(student.id, changes);
      if (res.ok) {
        toast("Student details updated.");
        onDirtyChange(false);
        onDone();
      } else if (res.notFound) {
        toast(res.message, "error");
        onDirtyChange(false);
        onGone();
      } else if (res.field) {
        setErrors({ [res.field]: res.message });
        focusAfterSave.current = res.field;
      } else {
        setErrors({ form: res.message });
      }
    });
  }

  const input = (key: StudentField, props: React.InputHTMLAttributes<HTMLInputElement>, hintId?: string) => (
    <input
      id={ids[key]}
      value={values[key]}
      onChange={set(key)}
      disabled={pending}
      aria-invalid={errors[key] ? true : undefined}
      aria-describedby={hintId}
      className={cn(inputClasses, errors[key] && "border-[var(--error)]")}
      {...props}
    />
  );

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-3 text-sm">
        <p className="text-[var(--text-muted)]">Registration number</p>
        <p className="font-semibold text-[var(--green-900)] tabular-nums">{student.registrationNo}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Registration numbers can&apos;t be changed.</p>
      </div>

      <FormField label="Name" htmlFor={ids.name} required error={errors.name}>
        {input("name", { type: "text", autoComplete: "off", required: true })}
      </FormField>
      <FormField label="Email" htmlFor={ids.email} required error={errors.email}>
        {input("email", { type: "email", autoComplete: "off", spellCheck: false, required: true })}
      </FormField>
      <FormField label="Phone" htmlFor={ids.phone} error={errors.phone}>
        {input("phone", { type: "tel", autoComplete: "off" }, ids.phoneHint)}
        <p id={ids.phoneHint} className="mt-1.5 text-xs text-[var(--text-muted)]">Leave empty to remove.</p>
      </FormField>
      <FormField label="WhatsApp number" htmlFor={ids.whatsapp} error={errors.whatsapp}>
        {input("whatsapp", { type: "tel", inputMode: "tel", autoComplete: "off", maxLength: 32 }, ids.whatsappHint)}
        <p id={ids.whatsappHint} className="mt-1.5 text-xs text-[var(--text-muted)]">
          Optional — only if it differs from the phone. Leave empty to remove.
        </p>
      </FormField>
      <FormField label="Country" htmlFor={ids.country} error={errors.country}>
        {input("country", { type: "text", autoComplete: "off" }, ids.countryHint)}
        <p id={ids.countryHint} className="mt-1.5 text-xs text-[var(--text-muted)]">Leave empty to remove.</p>
      </FormField>

      <div aria-live="polite">
        {errors.form && (
          <p className="rounded-[var(--radius-sm)] border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
            {errors.form}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => onCancel(dirty)} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

/**
 * Detail sheet for the student in `?view=<id>`; `?edit=1` opens it straight
 * into edit mode. Unsaved edits are guarded on every way of leaving (Escape,
 * ×, backdrop, Cancel) with a "Discard your changes?" confirmation.
 */
export function StudentSheet({
  student,
  initialEdit,
  closeHref,
  viewHref,
}: {
  student: StudentDetail;
  initialEdit: boolean;
  closeHref: string;
  /** Same sheet without ?edit (used after saving). */
  viewHref: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const { pendingId, requestDelete } = useStudentMutations();
  const [mode, setMode] = useState<"view" | "edit">(initialEdit ? "edit" : "view");
  const [dirty, setDirty] = useState(false);
  const [discard, setDiscard] = useState<"close" | "view" | null>(null);
  const closeSheet = useRef<(() => void) | null>(null);
  const blocked = deleteBlockedReason(student);

  const close = () => {
    router.replace(closeHref, { scroll: false });
    requestAnimationFrame(() => {
      const trigger = Array.from(document.querySelectorAll<HTMLElement>(`[data-view-trigger="${student.id}"]`)).find(
        (el) => el.offsetParent !== null,
      );
      (trigger ?? document.getElementById("students-heading"))?.focus();
    });
  };

  const leaveEdit = () => {
    setMode("view");
    setDirty(false);
    if (initialEdit) router.replace(viewHref, { scroll: false });
  };

  return (
    <Sheet
      closeRef={closeSheet}
      titleId={titleId}
      title={mode === "edit" ? "Edit student" : "Student details"}
      onClose={close}
      beforeClose={() => {
        if (mode === "edit" && dirty) {
          setDiscard("close");
          return false;
        }
        return true;
      }}
    >
      <p className="text-lg font-semibold text-[var(--green-900)]">{student.name}</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--text-muted)]">
        <span className="rounded-[var(--radius-full)] bg-[var(--green-50)] px-2.5 py-0.5 text-xs font-semibold text-[var(--green-800)] tabular-nums">
          {student.registrationNo}
        </span>
        <span className="tabular-nums">Joined {student.joined}</span>
      </div>

      {mode === "edit" ? (
        <div className="mt-6">
          <EditForm
            student={student}
            onDirtyChange={setDirty}
            onDone={leaveEdit}
            onGone={close}
            onCancel={(isDirty) => (isDirty ? setDiscard("view") : leaveEdit())}
          />
        </div>
      ) : (
        <>
          <section aria-label="Contact" className="mt-6">
            <SectionTitle>Contact</SectionTitle>
            <dl className="mt-2 divide-y divide-[var(--border)]">
              <DetailField label="Email">
                <a href={`mailto:${student.email}`} className={detailLinkClass}>
                  {student.email}
                </a>
              </DetailField>
              <DetailField label="Phone">
                {student.phone ? (
                  <a href={`tel:${student.phone.replace(/[^\d+]/g, "")}`} className={detailLinkClass}>
                    {student.phone}
                  </a>
                ) : (
                  "—"
                )}
              </DetailField>
              {(student.whatsapp || student.whatsappHref) && (
                <DetailField label="WhatsApp">
                  {student.whatsapp && <span className="block tabular-nums">{student.whatsapp}</span>}
                  {/* Uses the WhatsApp number when given, otherwise the phone. */}
                  {student.whatsappHref && (
                    <a href={student.whatsappHref} target="_blank" rel="noopener noreferrer" className={detailLinkClass}>
                      Message on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </DetailField>
              )}
              <DetailField label="Country">{student.country || "—"}</DetailField>
            </dl>
          </section>

          <section aria-label="Enrollments" className="mt-8">
            <SectionTitle>Enrollments</SectionTitle>
            {student.enrollmentRows === null ? (
              <p className="mt-3 text-[0.9375rem] text-[var(--text-muted)]">Enrollment data unavailable.</p>
            ) : student.enrollmentRows.length === 0 ? (
              <p className="mt-3 text-[0.9375rem] text-[var(--text-muted)]">No enrollments.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2.5">
                {student.enrollmentRows.map((e) => (
                  <li key={e.id} className="rounded-[var(--radius-md)] border border-[var(--border)] p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-medium text-[var(--text)]">{e.course}</p>
                      <StatusBadge status={e.status} />
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-muted)] tabular-nums">
                      {e.plan} · {e.enrolled}
                      {e.preferredTime ? ` · ${e.preferredTime}` : ""}
                    </p>
                    <Link
                      href={`/admin/enrollments?view=${e.id}`}
                      aria-label={`Open ${e.course} enrollment`}
                      className={cn("mt-2 inline-flex min-h-11 items-center text-sm", detailLinkClass)}
                    >
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Actions" className="mt-8">
            <SectionTitle>Actions</SectionTitle>
            <div className="mt-3 flex flex-col gap-3">
              <Button variant="secondary" onClick={() => setMode("edit")} className="w-full">
                Edit details
              </Button>
            </div>
            <div className="mt-6 border-t border-[var(--border)] pt-6">
              <Button
                variant="secondary"
                disabled={blocked !== null || pendingId === student.id}
                loading={pendingId === student.id}
                onClick={() => requestDelete(student, close)}
                aria-describedby={blocked ? `${titleId}-delete-note` : undefined}
                className={cn("w-full", !blocked && dangerOutline)}
              >
                Delete student
              </Button>
              {blocked ? (
                <p id={`${titleId}-delete-note`} className="mt-2 text-sm text-[var(--text-muted)]">
                  This student has {student.enrollments?.total} {student.enrollments?.total === 1 ? "enrollment" : "enrollments"}. Delete
                  those enrollments first.{" "}
                  <Link href={`/admin/enrollments?q=${encodeURIComponent(student.registrationNo)}`} className={detailLinkClass}>
                    View enrollments
                  </Link>
                </p>
              ) : (
                <p className="mt-2 text-xs text-[var(--text-muted)]">Removes the student permanently.</p>
              )}
            </div>
          </section>
        </>
      )}

      <ConfirmDialog
        open={discard !== null}
        title="Discard your changes?"
        description="Your edits to this student haven't been saved."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onCancel={() => setDiscard(null)}
        onConfirm={() => {
          const then = discard;
          setDiscard(null);
          setDirty(false);
          // Through the dialog (not close() directly) so focus can return to the row once the sheet is gone.
          if (then === "close") closeSheet.current?.();
          else leaveEdit();
        }}
      />
    </Sheet>
  );
}
