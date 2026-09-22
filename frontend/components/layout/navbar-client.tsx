"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { navLinks, ctaLinks } from "@/lib/site-config";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { CoursesNavItem } from "./courses-nav-item";

export function NavbarClient() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  // Scroll detection for border/shadow
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 8);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  /** Whether a nav link is active. Hash links are only active on "/". */
  function isActive(href: string): boolean {
    if (href.startsWith("/#")) return pathname === "/";
    return pathname === href;
  }

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 bg-[var(--surface)] transition-[border-color,box-shadow] duration-150",
          scrolled
            ? "border-b border-[var(--border)] shadow-[0_1px_3px_0_rgb(0_0_0/0.04)]"
            : "border-b border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[var(--container-max)] items-center px-[var(--container-px)] nav:h-[72px]">
          {/* Logo */}
          <Logo />

          {/* Desktop nav links */}
          <nav
            className="ml-auto hidden items-center gap-3 nav:flex"
            aria-label="Main navigation"
          >
            {navLinks.map((link) =>
              link.href === "/courses" ? (
                <CoursesNavItem
                  key={`${link.href}-${pathname}`}
                  variant="desktop"
                />
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-[var(--radius-sm)] px-3 py-2 text-base font-medium transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
                    isActive(link.href)
                      ? "bg-[var(--green-100)] text-[var(--green-800)]"
                      : "text-[var(--text)] hover:bg-[var(--green-50)] hover:text-[var(--green-700)]",
                  )}
                >
                  {link.label}
                </Link>
              ),
            )}
          </nav>

          {/* Desktop CTAs */}
          <div className="ml-4 hidden items-center gap-2 nav:flex">
            {ctaLinks.map((cta) => (
              <Button
                key={cta.href}
                href={cta.href}
                variant={cta.variant}
                size="sm"
              >
                {cta.label}
              </Button>
            ))}
          </div>

          {/* Mobile: CTA + menu button */}
          <div className="ml-auto flex items-center gap-2 nav:hidden">
            <Button href="/book-free-trial" variant="primary" size="sm">
              Book free trial
            </Button>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text)] transition-colors hover:bg-[var(--green-50)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <MobileMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        triggerRef={menuButtonRef}
      />
    </>
  );
}

/* ── Inline SVG icons ───────────────────────────────────────────── */

function MenuIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
