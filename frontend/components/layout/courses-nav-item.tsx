"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { duration, easing } from "@/lib/motion";
import type { CategoryKey } from "@/lib/courses";

const CLOSE_DELAY_MS = 200;

/** Static category menu. Each link's `?category=` key is resolved by the shared `matchesCategory` in lib/courses. */
const CATEGORY_LINKS: { label: string; category: Exclude<CategoryKey, "all"> }[] = [
  { label: "Courses For Children", category: "children" },
  { label: "Courses For Adults", category: "adults" },
  { label: "Courses For Females", category: "females" },
  { label: "Language Courses", category: "language" },
  { label: "Short Courses", category: "short" },
];

interface CoursesNavItemProps {
  variant: "desktop" | "mobile";
  /** Mobile only: also close the outer mobile menu drawer when a link is chosen. */
  onNavigate?: () => void;
}

/**
 * Render with `key={pathname}` from the parent so the dropdown resets (remounts)
 * on route change, instead of resetting isOpen via an effect.
 */

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function CoursesNavItem({ variant, onNavigate }: CoursesNavItemProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelScheduledClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function close() {
    cancelScheduledClose();
    setIsOpen(false);
  }

  function toggle() {
    cancelScheduledClose();
    setIsOpen((v) => !v);
  }

  function handleMouseEnter() {
    if (variant !== "desktop") return;
    cancelScheduledClose();
    setIsOpen(true);
  }

  function handleMouseLeave() {
    if (variant !== "desktop") return;
    cancelScheduledClose();
    closeTimer.current = setTimeout(() => setIsOpen(false), CLOSE_DELAY_MS);
  }

  function handleLinkClick() {
    close();
    onNavigate?.();
  }

  // Close on outside click. Inlines the close logic (rather than calling the
  // `close` helper) so the effect doesn't need it in its dependency array.
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Close on Escape, return focus to the trigger.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Clear any pending close timer on unmount.
  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  // Hover-only pill, like the other nav links (no persistent "active" background).
  const triggerClasses = cn(
    "inline-flex items-center gap-1 rounded-[var(--radius-sm)] text-base font-medium text-[var(--text)] transition-colors duration-150 hover:bg-[var(--green-50)] hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
    variant === "desktop" ? "px-3 py-2" : "h-12 w-full justify-between px-4",
  );

  const linkClasses =
    "block truncate rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text)] transition-colors hover:bg-[var(--green-50)] hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

  const allCoursesClasses =
    "flex items-center justify-between gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-semibold text-[var(--green-700)] transition-colors hover:bg-[var(--green-50)] hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

  const panelContent = (
    <>
      <ul className="flex flex-col" role="none">
        {CATEGORY_LINKS.map(({ label, category }) => (
          <li key={category} role="none">
            <Link
              href={`/courses?category=${category}`}
              role="menuitem"
              onClick={handleLinkClick}
              className={linkClasses}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className="my-1 h-px bg-[var(--border)]" />

      <Link href="/courses" role="menuitem" onClick={handleLinkClick} className={allCoursesClasses}>
        All Courses
        <ArrowRightIcon className="size-4 shrink-0" />
      </Link>
    </>
  );

  if (variant === "mobile") {
    return (
      <div ref={containerRef}>
        <button
          ref={triggerRef}
          type="button"
          onClick={toggle}
          aria-haspopup="true"
          aria-expanded={isOpen}
          className={triggerClasses}
        >
          Courses
          <ChevronIcon
            className={cn("size-4 transition-transform duration-150", isOpen && "rotate-180")}
          />
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: duration.fast, ease: [...easing.easeOut] }}
              className="overflow-hidden pl-4"
              role="menu"
            >
              <div className="py-1">{panelContent}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={triggerClasses}
      >
        Courses
        <ChevronIcon
          className={cn("size-4 transition-transform duration-150", isOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: duration.fast, ease: [...easing.easeOut] }}
            className="absolute left-0 top-full z-50 mt-2 w-72 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-floating)]"
            role="menu"
          >
            {panelContent}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
