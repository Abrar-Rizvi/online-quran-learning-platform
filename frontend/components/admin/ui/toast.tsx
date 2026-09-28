"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { CheckCircleIcon, CloseIcon } from "../admin-icons";

type ToastTone = "success" | "error" | "warning";

/** Optional follow-up link inside the toast (e.g. "Open enrollment"). */
export interface ToastOptions {
  action?: { label: string; href: string };
}

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  action?: ToastOptions["action"];
}

interface ToastContextValue {
  toast: (message: string, tone?: ToastTone, options?: ToastOptions) => void;
  /** Modal dialogs register themselves so toasts render inside them (outside would be inert). */
  pushHost: (el: HTMLElement) => void;
  popHost: (el: HTMLElement) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4000;
/** Toasts that ask the admin to do something (or carry a link) stay longer. */
const LONG_DISMISS_MS = 10000;

const noopSubscribe = () => () => {};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx.toast;
}

/** Lets a modal <dialog> host the toast region while it is open. */
export function useToastHost(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  const ctx = useContext(ToastContext);
  useEffect(() => {
    const el = ref.current;
    if (!ctx || !active || !el) return;
    ctx.pushHost(el);
    return () => ctx.popHost(el);
  }, [ctx, ref, active]);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [hosts, setHosts] = useState<HTMLElement[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, tone: ToastTone = "success", options?: ToastOptions) => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, tone, message, action: options?.action }]);
      window.setTimeout(() => dismiss(id), tone === "warning" || options?.action ? LONG_DISMISS_MS : AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      pushHost: (el) => setHosts((list) => [...list.filter((h) => h !== el), el]),
      popHost: (el) => setHosts((list) => list.filter((h) => h !== el)),
    }),
    [toast],
  );

  // false during SSR/hydration, true afterwards — portals need a real DOM node.
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const host = hosts.at(-1) ?? (isClient ? document.body : null);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {host &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6"
          >
            {toasts.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-[var(--radius-md)] border bg-[var(--surface)] py-3 pr-2 pl-4 text-sm shadow-[var(--shadow-floating)] motion-safe:animate-[admin-toast-in_200ms_ease-out]",
                  t.tone === "success"
                    ? "border-[var(--success)]/30"
                    : t.tone === "warning"
                      ? "border-[var(--warning)]/40"
                      : "border-[var(--error)]/30",
                )}
              >
                {t.tone === "success" ? (
                  <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-[var(--success)]" />
                ) : (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                      t.tone === "warning" ? "bg-[var(--warning)]" : "bg-[var(--error)]",
                    )}
                  >
                    !
                  </span>
                )}
                <div className="flex-1 pt-0.5">
                  <p
                    className={
                      t.tone === "success" ? "text-[var(--text)]" : t.tone === "warning" ? "text-[var(--warning)]" : "text-[var(--error)]"
                    }
                  >
                    {t.message}
                  </p>
                  {t.action && (
                    <Link
                      href={t.action.href}
                      onClick={() => dismiss(t.id)}
                      className="-mx-1 mt-0.5 inline-flex min-h-9 items-center rounded-[var(--radius-sm)] px-1 font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                    >
                      {t.action.label}
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss notification"
                  className="-my-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] hover:bg-[var(--surface-alt)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                >
                  <CloseIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>,
          host,
        )}
    </ToastContext.Provider>
  );
}
