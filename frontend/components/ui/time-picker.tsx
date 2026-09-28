"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fieldBorderClasses } from "./form-field";

const HOURS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"] as const;
const MINUTES = ["00", "30"] as const;
const PERIODS = ["AM", "PM"] as const;

type Hour = (typeof HOURS)[number];
type Minute = (typeof MINUTES)[number];
type Period = (typeof PERIODS)[number];
interface Parts {
  hour: Hour | null;
  minute: Minute | null;
  period: Period | null;
}

/** "16:30" / "16:30:00" → { hour: "04", minute: "30", period: "PM" }. Other minutes aren't offered. */
function toParts(value: string): Parts {
  const m = /^(\d{1,2}):(\d{2})/.exec(value);
  if (!m) return { hour: null, minute: null, period: null };
  const h24 = Number(m[1]);
  const minute = (MINUTES as readonly string[]).includes(m[2]) ? (m[2] as Minute) : null;
  return {
    hour: String(h24 % 12 || 12).padStart(2, "0") as Hour,
    minute,
    period: h24 >= 12 ? "PM" : "AM",
  };
}

/** { "04", "30", "PM" } → "16:30" (the 24h "HH:MM" format the backend accepts). */
function toValue(p: Parts): string {
  const h = (Number(p.hour) % 12) + (p.period === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${p.minute}`;
}

/** "16:30" → "04:30 PM" (what the trigger shows). */
export function formatSlot(value: string): string {
  const p = toParts(value);
  return p.hour && p.minute && p.period ? `${p.hour}:${p.minute} ${p.period}` : "";
}

function ClockIcon() {
  return (
    <svg
      className="size-[22px] shrink-0 text-[var(--green-700)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9.25" />
      <path d="M12 7v5l3.25 2" />
    </svg>
  );
}

/**
 * One column (Hours / Minutes / AM-PM) as a listbox. It is a single Tab stop:
 * arrow keys, Home and End move between options; Enter or Space selects.
 */
function Column<T extends string>({
  label,
  options,
  selected,
  onSelect,
  autoFocus,
}: {
  label: string;
  options: readonly T[];
  selected: T | null;
  onSelect: (value: T) => void;
  autoFocus?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(() => Math.max(0, selected ? options.indexOf(selected) : 0));

  useEffect(() => {
    // Show the selected option on open; take focus if this is the first column.
    const el = listRef.current?.querySelectorAll<HTMLElement>("[role=option]")[active];
    el?.scrollIntoView({ block: "nearest" });
    if (autoFocus) el?.focus();
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function focusIndex(i: number) {
    const next = (i + options.length) % options.length;
    setActive(next);
    const el = listRef.current?.querySelectorAll<HTMLElement>("[role=option]")[next];
    el?.focus();
    el?.scrollIntoView({ block: "nearest" });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const keys: Record<string, () => void> = {
      ArrowDown: () => focusIndex(active + 1),
      ArrowUp: () => focusIndex(active - 1),
      Home: () => focusIndex(0),
      End: () => focusIndex(options.length - 1),
      Enter: () => onSelect(options[active]),
      " ": () => onSelect(options[active]),
    };
    const run = keys[e.key];
    if (run) {
      e.preventDefault();
      run();
    }
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <p className="px-1 pb-1.5 text-center text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]" aria-hidden="true">
        {label}
      </p>
      <div
        ref={listRef}
        role="listbox"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex max-h-[13.5rem] flex-col gap-1 overflow-y-auto overscroll-contain p-0.5"
      >
        {options.map((option, i) => {
          const isSelected = option === selected;
          return (
            <div
              key={option}
              role="option"
              aria-selected={isSelected}
              tabIndex={i === active ? 0 : -1}
              onClick={() => {
                setActive(i);
                onSelect(option);
              }}
              onFocus={() => setActive(i)}
              className={cn(
                "flex min-h-11 shrink-0 cursor-pointer select-none items-center justify-center rounded-[var(--radius-sm)] text-sm font-medium tabular-nums transition-colors duration-150 motion-reduce:transition-none",
                "focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-[var(--focus-ring-color)]",
                isSelected ? "bg-[var(--green-700)] text-white" : "text-[var(--text)] hover:bg-[var(--green-50)]",
              )}
            >
              {option}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Preferred-time picker with 30-minute slots: Hours 01–12, Minutes 00/30, AM/PM.
 * Looks like the other fields; the value is 24h "HH:MM" (what the backend accepts)
 * and is shown as "04:30 PM". Choices are applied with "Done" (clearer than
 * closing on the third click, which surprises people who pick the hour last or
 * want to adjust); Escape or a click outside closes without changing the value.
 */
export function TimePicker({
  id,
  value,
  onChange,
  invalid = false,
  disabled = false,
  describedBy,
  placeholder = "Select your time",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Parts>(() => toParts(value));
  const [announce, setAnnounce] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const valueId = useId();
  const display = formatSlot(value);

  function openPanel() {
    setDraft(toParts(value));
    setOpen(true);
  }

  function close(returnFocus: boolean) {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const complete = draft.hour !== null && draft.minute !== null && draft.period !== null;

  function apply() {
    if (!complete) return;
    const next = toValue(draft);
    onChange(next);
    setAnnounce(`Preferred time set to ${formatSlot(next)}`);
    close(true);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        // Buttons don't support aria-invalid; the error text is announced by FormField (role="alert").
        data-invalid={invalid || undefined}
        aria-describedby={[valueId, describedBy].filter(Boolean).join(" ")}
        onClick={() => (open ? close(false) : openPanel())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && !open) {
            e.preventDefault();
            openPanel();
          }
        }}
        className={cn(
          "flex h-12 w-full cursor-pointer items-center justify-between gap-3 rounded-[var(--radius-sm)] bg-[var(--surface)] px-4 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60",
          fieldBorderClasses,
          open && "border-[var(--green-700)]",
          invalid && "border-[var(--error)] hover:border-[var(--error)]",
        )}
      >
        <span id={valueId} className={display ? "text-[var(--text)] tabular-nums" : "text-[var(--text-muted)]"}>
          {display || placeholder}
        </span>
        <ClockIcon />
      </button>

      <span className="sr-only" aria-live="polite">
        {announce}
      </span>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Choose a preferred time"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              close(true);
            }
          }}
          className="absolute left-0 right-0 top-full z-30 mt-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[var(--shadow-floating,0_12px_32px_-12px_rgb(8_53_42/0.35))] motion-safe:animate-[admin-fade-in_120ms_ease-out] sm:right-auto sm:w-80"
        >
          <div className="flex gap-2">
            <Column label="Hour" options={HOURS} selected={draft.hour} onSelect={(hour) => setDraft((d) => ({ ...d, hour }))} autoFocus />
            <Column label="Minute" options={MINUTES} selected={draft.minute} onSelect={(minute) => setDraft((d) => ({ ...d, minute }))} />
            <Column label="AM / PM" options={PERIODS} selected={draft.period} onSelect={(period) => setDraft((d) => ({ ...d, period }))} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-3">
            <p className="text-sm text-[var(--text-muted)] tabular-nums" aria-live="polite">
              {complete ? `${draft.hour}:${draft.minute} ${draft.period}` : "Choose hour, minute and AM/PM"}
            </p>
            <button
              type="button"
              onClick={apply}
              disabled={!complete}
              className="inline-flex h-11 shrink-0 cursor-pointer items-center rounded-[var(--radius-sm)] bg-[var(--btn-primary-bg)] px-5 text-sm font-medium text-[var(--btn-primary-fg)] transition-colors duration-150 hover:bg-[var(--btn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 motion-reduce:transition-none"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
