"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface ActionsMenuItem {
  label: string;
  onSelect?: () => void;
  tone?: "default" | "danger";
  /** Shown but not actionable (e.g. "No further changes"). */
  disabled?: boolean;
  /** Draws a divider above this item (e.g. to separate a destructive action). */
  separated?: boolean;
  /** Small muted line under the label, e.g. why an item is disabled. */
  hint?: string;
}

const MENU_WIDTH = 224;

function DotsIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.75" />
      <circle cx="12" cy="12" r="1.75" />
      <circle cx="19" cy="12" r="1.75" />
    </svg>
  );
}

/**
 * Button + menu (WAI-ARIA menu button pattern): Enter/Space/ArrowDown open it,
 * arrows/Home/End move between items, Escape closes and returns focus, Tab or
 * an outside click closes. The menu is `position: fixed` next to its button (and
 * follows it on scroll) so a scrolling table container can't clip it.
 */
export function ActionsMenu({
  label,
  items,
  pending = false,
}: {
  label: string;
  items: ActionsMenuItem[];
  pending?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const enabledItems = () =>
    Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? []);

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // Place the menu under (or, near the bottom of the screen, above) the button.
  const place = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 0;
    const below = rect.bottom + 4;
    const top = below + menuHeight > window.innerHeight - 8 ? Math.max(8, rect.top - 4 - menuHeight) : below;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPos({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    enabledItems()[0]?.focus();

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close(false);
    }
    // Follow the button when the page or the table scrolls (closing would lose the user's place).
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, close, place]);

  function onMenuKeyDown(e: React.KeyboardEvent) {
    const list = enabledItems();
    const index = list.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(index + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(index - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      list[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      list.at(-1)?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close(true);
    } else if (e.key === "Tab") {
      close(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-busy={pending || undefined}
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-alt)] hover:text-[var(--green-900)] disabled:cursor-wait disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
      >
        {pending ? (
          <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
        ) : (
          <DotsIcon />
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, width: MENU_WIDTH }}
          className="fixed z-40 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-[var(--shadow-floating)] motion-safe:animate-[admin-fade-in_120ms_ease-out]"
        >
          {items.map((item) => (
            <div key={item.label}>
              {item.separated && <div role="separator" className="my-1.5 h-px bg-[var(--border)]" />}
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                aria-disabled={item.disabled || undefined}
                onClick={() => {
                  if (item.disabled) return;
                  close(true);
                  item.onSelect?.();
                }}
                className={cn(
                  "flex min-h-11 w-full flex-col items-start justify-center rounded-[var(--radius-sm)] px-3 py-1.5 text-left text-sm font-medium focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:-outline-offset-3",
                  item.disabled
                    ? "cursor-default text-[var(--text-muted)]"
                    : item.tone === "danger"
                      ? "cursor-pointer text-[var(--error)] hover:bg-[var(--error-bg)] focus:bg-[var(--error-bg)]"
                      : "cursor-pointer text-[var(--text)] hover:bg-[var(--green-50)] focus:bg-[var(--green-50)]",
                )}
              >
                {item.label}
                {item.hint && <span className="text-xs font-normal text-[var(--text-muted)]">{item.hint}</span>}
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
