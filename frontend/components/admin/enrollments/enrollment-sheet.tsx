"use client";

import { useId } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import type { EnrollmentRow, StudentContact } from "@/lib/admin-enrollments";
import { getAllowedNextStatuses } from "@/lib/enrollment";
import { StatusBadge } from "../status";
import { DetailField as Field, SectionTitle, detailLinkClass as linkClass } from "../ui/detail-list";
import { Sheet } from "../ui/sheet";
import { STATUS_ACTIONS, useEnrollmentMutations } from "./enrollment-mutations";

const dangerOutline =
  "[--btn-secondary-fg:var(--error)] [--btn-secondary-border:var(--error)] [--btn-secondary-hover:var(--error-bg)] [--btn-secondary-active:var(--error-bg)] [--focus-ring-color:var(--error)]";

/**
 * Detail view for the enrollment in `?view=<id>`. Closing removes that param
 * (filters stay) and moves focus back to the row's "View" link.
 */
export function EnrollmentSheet({
  row,
  contact,
  closeHref,
}: {
  row: EnrollmentRow;
  /** null when GET /admin/students failed. */
  contact: StudentContact | null;
  closeHref: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const { pending, requestStatus, requestDelete } = useEnrollmentMutations();
  const next = getAllowedNextStatuses(row.status);
  const busy = pending?.id === row.id;

  const close = () => {
    router.replace(closeHref, { scroll: false });
    requestAnimationFrame(() => {
      // The row exists twice (mobile card + table row); focus the one that is visible.
      const trigger = Array.from(document.querySelectorAll<HTMLElement>(`[data-view-trigger="${row.id}"]`)).find(
        (el) => el.offsetParent !== null,
      );
      (trigger ?? document.getElementById("enrollments-heading"))?.focus();
    });
  };

  const target = { id: row.id, name: row.name, course: row.course };

  return (
    <Sheet titleId={titleId} title="Enrollment details" onClose={close}>
      <section aria-label="Student">
        <SectionTitle>Student</SectionTitle>
        <p className="mt-3 text-lg font-semibold text-[var(--green-900)]">{row.name}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-sm text-[var(--text-muted)] tabular-nums">{row.registrationNo}</p>
          <Link href={`/admin/students?view=${row.studentId}`} className={`text-sm ${linkClass}`}>
            View student
          </Link>
        </div>
        <dl className="mt-2 divide-y divide-[var(--border)]">
          <Field label="Email">
            <a href={`mailto:${row.email}`} className={linkClass}>
              {row.email}
            </a>
          </Field>
          {contact ? (
            <>
              <Field label="Phone">
                {contact.phone ? (
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, "")}`} className={linkClass}>
                    {contact.phone}
                  </a>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Country">{contact.country || "—"}</Field>
              {(contact.whatsapp || contact.whatsappHref) && (
                <Field label="WhatsApp">
                  {contact.whatsapp && <span className="block tabular-nums">{contact.whatsapp}</span>}
                  {/* Uses the WhatsApp number when given, otherwise the phone. */}
                  {contact.whatsappHref && (
                    <a href={contact.whatsappHref} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      Message on WhatsApp<span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </Field>
              )}
            </>
          ) : (
            <Field label="Contact">
              <span className="text-[var(--text-muted)]">Contact details unavailable</span>
            </Field>
          )}
        </dl>
      </section>

      <section aria-label="Enrollment" className="mt-8">
        <SectionTitle>Enrollment</SectionTitle>
        <dl className="mt-2 divide-y divide-[var(--border)]">
          <Field label="Course">{row.course}</Field>
          <Field label="Plan">
            <span className="tabular-nums">{row.plan}</span>
          </Field>
          <Field label="Status">
            <StatusBadge status={row.status} />
          </Field>
          <Field label="Preferred time">
            <span className="tabular-nums">{row.preferredTime ?? "—"}</span>
          </Field>
          <Field label="Enrolled">
            <span className="tabular-nums">{row.enrolled}</span>
          </Field>
          <Field label="Enrollment ID">
            <span className="tabular-nums">#{row.id}</span>
          </Field>
        </dl>
      </section>

      <section aria-label="Actions" className="mt-8">
        <SectionTitle>Actions</SectionTitle>
        {next.length > 0 ? (
          <div className="mt-3 flex flex-col gap-3">
            {next.map((t) => (
              <Button
                key={t}
                variant={t === "active" ? "primary" : "secondary"}
                loading={busy && pending?.kind === "status" && pending.target === t}
                disabled={busy}
                onClick={() => requestStatus(target, t)}
                className="w-full"
              >
                {STATUS_ACTIONS[t].label}
              </Button>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[0.9375rem] text-[var(--text-muted)]">No further changes — this status is final.</p>
        )}

        <div className="mt-6 border-t border-[var(--border)] pt-6">
          <Button
            variant="secondary"
            loading={busy && pending?.kind === "delete"}
            disabled={busy}
            onClick={() => requestDelete(target, () => router.replace(closeHref, { scroll: false }))}
            className={`w-full ${dangerOutline}`}
          >
            Delete permanently
          </Button>
          <p className="mt-2 text-xs text-[var(--text-muted)]">Removes it from all records and analytics.</p>
        </div>
      </section>
    </Sheet>
  );
}
