"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

/**
 * Native modal <dialog>: the browser provides the focus trap, Escape, the
 * backdrop and inert background. Focus starts on the back-out button (the safe choice) and
 * returns to the previously focused element when it closes.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  /** Required and specific ("Keep enrollment", "Keep editing"): a bare "Cancel" is ambiguous next to "Cancel enrollment". */
  cancelLabel: string;
  tone?: "default" | "danger";
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-admin-modal
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        // Escape: ignored while the action is running, otherwise same as "Cancel".
        e.preventDefault();
        if (!pending) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-[var(--text)] shadow-[var(--shadow-floating)] backdrop:bg-[var(--green-950)]/50 motion-safe:animate-[admin-fade-in_150ms_ease-out]"
    >
      {open && (
        <>
          {/* Inline: the global unlayered h2 rule would override Tailwind size/color utilities. */}
          <h2 id={titleId} className="m-0" style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--green-900)" }}>
            {title}
          </h2>
          <p id={descId} className="mt-2 text-[0.9375rem] text-[var(--text-muted)]">
            {description}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" size="md" onClick={onCancel} disabled={pending} autoFocus className="sm:h-11">
              {cancelLabel}
            </Button>
            <Button
              size="md"
              onClick={onConfirm}
              loading={pending}
              className={cn(
                "sm:h-11",
                tone === "danger" &&
                  // Re-point the Button's own color variables (no competing bg- classes).
                  "[--btn-primary-bg:var(--error)] [--btn-primary-hover:color-mix(in_srgb,var(--error)_88%,black)] [--btn-primary-active:color-mix(in_srgb,var(--error)_78%,black)] [--focus-ring-color:var(--error)]",
              )}
            >
              {confirmLabel}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
