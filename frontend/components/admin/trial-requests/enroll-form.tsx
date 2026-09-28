"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { enrollTrialRequest, type EnrollField } from "@/app/admin/(panel)/trial-requests/actions";
import { Button, FormField, TimePicker, inputClasses } from "@/components/ui";
import type { CourseOption, StudentMatch, TrialRequestRow } from "@/lib/admin-trial-requests";
import { phoneError } from "@/lib/form-rules";
import { normalizeEmail } from "@/lib/trial-requests";
import { cn } from "@/lib/utils";
import { detailLinkClass } from "../ui/detail-list";
import { useToast } from "../ui/toast";

type Field = "name" | "email" | "phone" | "whatsapp" | "country" | "course" | "plan" | "time";
type Values = Record<Field, string>;
type Errors = Partial<Record<Field, string>> & { form?: React.ReactNode };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const FROM_SERVER: Record<EnrollField, Field> = {
  name: "name",
  email: "email",
  phone: "phone",
  whatsapp: "whatsapp",
  country: "country",
  course_plan_id: "plan",
  preferred_time: "time",
};

const selectClasses = cn(inputClasses, "cursor-pointer appearance-auto pr-3");

function validate(v: Values): Partial<Record<Field, string>> {
  const e: Partial<Record<Field, string>> = {};
  if (!v.name.trim()) e.name = "Enter the student's name.";
  if (!v.email.trim()) e.email = "Enter an email address.";
  else if (!EMAIL_RE.test(v.email.trim())) e.email = "Enter a valid email address, like name@example.com.";
  const phone = phoneError(v.phone, "Phone", "Enter a phone number.");
  if (phone) e.phone = phone;
  const whatsapp = phoneError(v.whatsapp, "WhatsApp number");
  if (whatsapp) e.whatsapp = whatsapp;
  if (!v.country.trim()) e.country = "Enter the country.";
  if (!v.course) e.course = "Choose a course.";
  if (!v.plan) e.plan = "Choose a plan.";
  if (!v.time) e.time = "Choose a class time.";
  return e;
}

/**
 * "Enroll this student": creates the Student (or reuses one with the same
 * email) + an Active enrollment, then marks the trial request Enrolled.
 * See enrollTrialRequest for the three steps and how partial failures are reported.
 */
export function EnrollForm({
  row,
  courses,
  studentsByEmail,
  onDone,
  onCancel,
  onDirtyChange,
}: {
  row: TrialRequestRow;
  courses: CourseOption[] | null;
  /** Normalized email → student; null when GET /admin/students failed. */
  studentsByEmail: Record<string, StudentMatch> | null;
  onDone: () => void;
  onCancel: (dirty: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const toast = useToast();
  const ids = {
    name: useId(),
    email: useId(),
    phone: useId(),
    phoneHint: useId(),
    whatsapp: useId(),
    whatsappHint: useId(),
    country: useId(),
    course: useId(),
    plan: useId(),
    time: useId(),
    timeHint: useId(),
    notice: useId(),
  };
  // The request only has a WhatsApp number: prefill it as both Phone and WhatsApp (both editable).
  const initial: Values = {
    name: row.name,
    email: row.email,
    phone: row.whatsapp,
    whatsapp: row.whatsapp,
    country: row.country,
    course: "",
    plan: "",
    time: "",
  };
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  // Blocks a second submit before React re-renders the disabled button (double click).
  const submitting = useRef(false);
  const focusAfter = useRef<Field | null>(null);

  useEffect(() => {
    if (!pending && focusAfter.current) {
      document.getElementById(ids[focusAfter.current])?.focus();
      focusAfter.current = null;
    }
  });

  const course = courses?.find((c) => String(c.id) === values.course) ?? null;
  const emailKey = normalizeEmail(values.email);
  const existing = studentsByEmail?.[emailKey] ?? null;
  const emailChanged = emailKey !== normalizeEmail(row.email);

  const set = (key: Field, value: string) => {
    const next = { ...values, [key]: value, ...(key === "course" ? { plan: "" } : {}) };
    setValues(next);
    onDirtyChange((Object.keys(initial) as Field[]).some((k) => next[k] !== initial[k]));
    if (errors[key] || errors.form) setErrors((prev) => ({ ...prev, [key]: undefined, form: undefined }));
  };

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    const found = validate(values);
    const firstBad = (["name", "email", "phone", "whatsapp", "country", "course", "plan", "time"] as Field[]).find((k) => found[k]);
    if (firstBad) {
      setErrors(found);
      document.getElementById(ids[firstBad])?.focus();
      return;
    }

    submitting.current = true;
    startTransition(async () => {
      const res = await enrollTrialRequest(row.id, {
        name: values.name,
        email: values.email,
        phone: values.phone,
        whatsapp: values.whatsapp,
        country: values.country,
        course_plan_id: Number(values.plan),
        preferred_time: values.time,
      });
      submitting.current = false;

      if (!res.ok) {
        if (res.conflict) {
          setErrors({
            form: (
              <>
                {res.message}{" "}
                <Link href={`/admin/enrollments?q=${encodeURIComponent(values.email.trim())}`} className={detailLinkClass}>
                  View enrollments
                </Link>
              </>
            ),
          });
        } else if (res.field) {
          const field = FROM_SERVER[res.field];
          setErrors({ [field]: res.message });
          focusAfter.current = field;
        } else {
          setErrors({ form: res.message });
        }
        return;
      }

      const open = { action: { label: "Open enrollment", href: `/admin/enrollments?view=${res.enrollmentId}` } };
      const who = res.registrationNo || "the student";
      if (res.activated && res.requestUpdated) {
        toast(`Enrolled as ${who} (Active).`, "success", open);
      } else if (!res.activated && res.requestUpdated) {
        toast(`Enrolled as ${who}, and this trial request is marked Enrolled. Enrollment created but still On trial — open it and Mark as active.`, "warning", open);
      } else if (res.activated && !res.requestUpdated) {
        toast(`Enrolled as ${who} (Active). Student enrolled, but this trial request wasn't updated — use Mark as enrolled.`, "warning", open);
      } else {
        toast(
          `Enrolled as ${who}, but two steps didn't finish: the enrollment is still On trial (open it and Mark as active), and this trial request wasn't updated (use Mark as enrolled).`,
          "warning",
          open,
        );
      }
      onDirtyChange(false);
      onDone();
    });
  }

  const invalid = (k: Field) => (errors[k] ? true : undefined);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5" aria-busy={pending || undefined}>
      <p className="text-[0.9375rem] text-[var(--text-muted)]">
        Creates the student and an <strong className="font-semibold text-[var(--text)]">Active</strong> enrollment (their trial
        is done), then marks this request Enrolled.
      </p>

      <FormField label="Name" htmlFor={ids.name} required error={errors.name}>
        <input id={ids.name} value={values.name} onChange={(e) => set("name", e.target.value)} readOnly={pending} autoComplete="off" aria-invalid={invalid("name")} className={cn(inputClasses, errors.name && "border-[var(--error)]")} />
      </FormField>

      <FormField label="Email" htmlFor={ids.email} required error={errors.email}>
        <input
          id={ids.email}
          type="email"
          value={values.email}
          onChange={(e) => set("email", e.target.value)}
          readOnly={pending}
          autoComplete="off"
          spellCheck={false}
          aria-invalid={invalid("email")}
          aria-describedby={existing || emailChanged ? ids.notice : undefined}
          className={cn(inputClasses, errors.email && "border-[var(--error)]")}
        />
      </FormField>

      {(existing || emailChanged || studentsByEmail === null) && (
        <div id={ids.notice} className="-mt-2 flex flex-col gap-2" aria-live="polite">
          {existing && (
            <p className="rounded-[var(--radius-sm)] border border-[var(--info)]/25 bg-[var(--info-bg)] px-3.5 py-2.5 text-sm text-[var(--info)]">
              Existing student <span className="font-semibold tabular-nums">{existing.registrationNo}</span> — this enrollment will be
              added to them. Their saved name, phone and country won&apos;t change.
            </p>
          )}
          {emailChanged && (
            <p className="rounded-[var(--radius-sm)] bg-[var(--warning-bg)] px-3.5 py-2.5 text-sm text-[var(--warning)]">
              The trial request will no longer match this student by email.
            </p>
          )}
          {studentsByEmail === null && (
            <p className="text-xs text-[var(--text-muted)]">Couldn&apos;t check for an existing student with this email.</p>
          )}
        </div>
      )}

      <FormField label="Phone" htmlFor={ids.phone} required error={errors.phone}>
        <input id={ids.phone} type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} readOnly={pending} autoComplete="off" aria-invalid={invalid("phone")} aria-describedby={ids.phoneHint} className={cn(inputClasses, errors.phone && "border-[var(--error)]")} />
        <p id={ids.phoneHint} className="mt-1.5 text-xs text-[var(--text-muted)]">From the WhatsApp number on the request.</p>
      </FormField>

      <FormField label="WhatsApp number" htmlFor={ids.whatsapp} error={errors.whatsapp}>
        <input id={ids.whatsapp} type="tel" inputMode="tel" maxLength={32} value={values.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} readOnly={pending} autoComplete="off" aria-invalid={invalid("whatsapp")} aria-describedby={ids.whatsappHint} className={cn(inputClasses, errors.whatsapp && "border-[var(--error)]")} />
        <p id={ids.whatsappHint} className="mt-1.5 text-xs text-[var(--text-muted)]">Optional. Clear it if it&apos;s the same as the phone.</p>
      </FormField>

      <FormField label="Country" htmlFor={ids.country} required error={errors.country}>
        <input id={ids.country} value={values.country} onChange={(e) => set("country", e.target.value)} readOnly={pending} autoComplete="off" aria-invalid={invalid("country")} className={cn(inputClasses, errors.country && "border-[var(--error)]")} />
      </FormField>

      {courses === null || courses.length === 0 ? (
        <p role="alert" className="rounded-[var(--radius-sm)] border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">
          Couldn&apos;t load courses and plans. Close this and try again in a moment.
        </p>
      ) : (
        <>
          <FormField label="Course" htmlFor={ids.course} required error={errors.course}>
            <select id={ids.course} value={values.course} onChange={(e) => set("course", e.target.value)} disabled={pending} aria-invalid={invalid("course")} className={cn(selectClasses, errors.course && "border-[var(--error)]")}>
              <option value="">Choose a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Plan" htmlFor={ids.plan} required error={errors.plan}>
            <select id={ids.plan} value={values.plan} onChange={(e) => set("plan", e.target.value)} disabled={pending || !course} aria-invalid={invalid("plan")} className={cn(selectClasses, errors.plan && "border-[var(--error)]")}>
              <option value="">{course ? "Choose a plan" : "Choose a course first"}</option>
              {course?.plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </FormField>
        </>
      )}

      {/* Same 30-minute picker and "HH:MM" value as the public enrollment form's "Preferred time". */}
      <FormField label="Class time" htmlFor={ids.time} required error={errors.time}>
        <TimePicker id={ids.time} value={values.time} onChange={(v) => set("time", v)} disabled={pending} invalid={Boolean(errors.time)} describedBy={ids.timeHint} />
        <p id={ids.timeHint} className="mt-1.5 text-xs text-[var(--text-muted)]">Saved as the enrollment&apos;s preferred time.</p>
      </FormField>

      <div aria-live="polite">
        {errors.form && (
          <p className="rounded-[var(--radius-sm)] border border-[var(--error)]/25 bg-[var(--error-bg)] px-4 py-3 text-sm text-[var(--error)]">{errors.form}</p>
        )}
      </div>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" onClick={() => onCancel((Object.keys(initial) as Field[]).some((k) => values[k] !== initial[k]))} disabled={pending}>
          Back
        </Button>
        <Button type="submit" loading={pending} disabled={!courses?.length}>
          Enroll this student
        </Button>
      </div>
    </form>
  );
}
