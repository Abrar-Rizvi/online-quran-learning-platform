"use client";

import { useEffect, useRef } from "react";
import { CloseIcon } from "../admin-icons";
import { useToastHost } from "./toast";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/**
 * The sheet's own tabbable elements, in DOM order — read fresh on every Tab
 * because the content changes (view ↔ edit/enroll form, pending or disabled
 * buttons, errors, toasts). Elements inside a nested <dialog> (a
 * ConfirmDialog rendered in the sheet) or hidden ones are skipped.
 */
function tabbables(dialog: HTMLDialogElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.closest("dialog") === dialog && !el.closest("[inert]") && el.getClientRects().length > 0,
  );
}

/**
 * Right-side sheet (full screen on mobile) built on a native modal <dialog>:
 * focus trap, Escape and inert background come from the browser. Every way of
 * closing (Escape, × button, backdrop click) goes through `beforeClose` (return
 * false to keep it open, e.g. for unsaved changes) and then ends in the
 * dialog's "close" event, which calls `onClose` exactly once.
 *
 * Focus: showModal() already makes everything outside the sheet inert (it
 * can't be focused or clicked and is hidden from screen readers). What the
 * browser doesn't do is keep Tab inside: past the last element focus leaves
 * the page (to the address bar). onKeyDown wraps it — last → first and
 * first → last.
 */
export function Sheet({
  titleId,
  title,
  onClose,
  beforeClose,
  closeRef,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  beforeClose?: () => boolean;
  /**
   * Receives a function that closes the sheet without asking beforeClose
   * (e.g. after the admin confirmed "Discard"). It closes the native dialog
   * first, so the background is no longer inert when onClose moves focus
   * back to the row's View link.
   */
  closeRef?: React.RefObject<(() => void) | null>;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const beforeCloseRef = useRef(beforeClose);
  useEffect(() => {
    onCloseRef.current = onClose;
    beforeCloseRef.current = beforeClose;
  });

  useEffect(() => {
    if (!closeRef) return;
    closeRef.current = () => ref.current?.close();
    return () => {
      closeRef.current = null;
    };
  }, [closeRef]);

  const attemptClose = () => {
    if (beforeCloseRef.current?.() === false) return;
    ref.current?.close();
  };

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const handleClose = () => onCloseRef.current();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, []);

  // Toasts render inside the open sheet so they stay visible and announced.
  useToastHost(ref, true);

  return (
    <dialog
      ref={ref}
      data-admin-modal
      aria-labelledby={titleId}
      onCancel={(e) => {
        // Escape: route it through the same guard as the other close paths.
        e.preventDefault();
        attemptClose();
      }}
      onClick={(e) => {
        // A click on the dialog element itself (not its content) is the backdrop.
        if (e.target === ref.current) attemptClose();
      }}
      onKeyDown={(e) => {
        const dialog = ref.current;
        // A ConfirmDialog opened from inside the sheet is its own modal: leave its Tab alone.
        if (e.key !== "Tab" || !dialog || (e.target as HTMLElement).closest("dialog") !== dialog) return;
        const items = tabbables(dialog);
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && (active === first || active === dialog)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      className="fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-full max-w-none border-0 bg-[var(--surface)] p-0 text-[var(--text)] shadow-[var(--shadow-floating)] backdrop:bg-[var(--green-950)]/40 sm:w-[28rem] motion-safe:animate-[admin-sheet-in_200ms_ease-out]"
    >
      <div className="flex h-full flex-col">
        <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-[var(--border)] pr-2 pl-5 sm:pl-6">
          {/* Inline: the global unlayered h2 rule would override Tailwind size/color utilities. */}
          <h2 id={titleId} className="m-0 truncate" style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--green-900)" }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={attemptClose}
            aria-label="Close details"
            className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-alt)] hover:text-[var(--green-900)] motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
          >
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
      </div>
    </dialog>
  );
}
