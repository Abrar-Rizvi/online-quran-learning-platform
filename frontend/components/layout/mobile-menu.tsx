"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { duration, easing } from "@/lib/motion";
import { Button } from "@/components/ui";
import {
  navLinks,
  ctaLinks,
  getContactConfig,
} from "@/lib/site-config";
import { CoursesNavItem } from "./courses-nav-item";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileMenu({ isOpen, onClose, triggerRef }: MobileMenuProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const contact = getContactConfig();

  // Close on route change
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("menu-open");
    } else {
      document.body.classList.remove("menu-open");
    }
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  // Focus trap + Escape
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        triggerRef.current?.focus();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [onClose, triggerRef],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKeyDown);
    // Focus first focusable element in panel
    const timer = setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      first?.focus();
    }, 50);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [isOpen, handleKeyDown]);

  // Return focus on close
  const prevOpen = useRef(isOpen);
  useEffect(() => {
    if (prevOpen.current && !isOpen) {
      triggerRef.current?.focus();
    }
    prevOpen.current = isOpen;
  }, [isOpen, triggerRef]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-[var(--surface)]"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{
            duration: duration.base,
            ease: [...easing.easeOut],
          }}
        >
          <nav
            className="mx-auto flex max-w-[var(--container-max)] flex-col gap-1 px-[var(--container-px)] py-6"
            aria-label="Mobile navigation"
          >
            {navLinks.map((link) =>
              link.href === "/courses" ? (
                <CoursesNavItem
                  key={`${link.href}-${pathname}`}
                  variant="mobile"
                  onNavigate={onClose}
                />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="flex h-12 items-center rounded-[var(--radius-sm)] px-4 text-base font-medium text-[var(--text)] transition-colors hover:bg-[var(--green-50)] hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                >
                  {link.label}
                </Link>
              ),
            )}

            <div className="my-4 h-px bg-[var(--border)]" />

            <div className="flex flex-col gap-3 px-4">
              {ctaLinks.map((cta) => (
                <Button
                  key={cta.href}
                  href={cta.href}
                  variant={cta.variant}
                  size="md"
                  className="w-full"
                  onClick={onClose}
                >
                  {cta.label}
                </Button>
              ))}
            </div>

            {(contact.whatsappUrl || contact.emailUrl) && (
              <>
                <div className="my-4 h-px bg-[var(--border)]" />
                <div className="flex flex-col gap-1 px-4">
                  {contact.whatsappUrl && (
                    <a
                      href={contact.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={onClose}
                      className="flex h-12 items-center gap-3 rounded-[var(--radius-sm)] text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                    >
                      <WhatsAppIcon />
                      WhatsApp
                    </a>
                  )}
                  {contact.emailUrl && (
                    <a
                      href={contact.emailUrl}
                      onClick={onClose}
                      className="flex h-12 items-center gap-3 rounded-[var(--radius-sm)] text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--green-700)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
                    >
                      <EmailIcon />
                      {contact.email}
                    </a>
                  )}
                </div>
              </>
            )}
          </nav>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ── Inline SVG icons ───────────────────────────────────────────── */

function WhatsAppIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
