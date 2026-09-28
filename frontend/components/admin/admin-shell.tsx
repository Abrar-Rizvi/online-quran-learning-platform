"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/admin/actions";
import { Logo } from "@/components/layout/logo";
import { IslamicPattern } from "@/components/ui";
import { cn } from "@/lib/utils";
import { CloseIcon, ExternalLinkIcon, LogoutIcon, MenuIcon } from "./admin-icons";
import { ADMIN_NAV, getAdminSectionTitle, isAdminNavActive } from "./admin-nav";
import { ToastProvider } from "./ui/toast";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

/** Nav + Log out rows on the dark sidebar. */
const itemBase = cn(
  "relative flex h-11 w-full items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[0.9375rem] font-medium transition-colors duration-150 motion-reduce:transition-none",
  focusRing,
);
const itemIdle = "text-[var(--green-200)] hover:bg-white/[0.06] hover:text-white";

function AdminBrand() {
  return (
    <div className="flex items-center gap-2">
      <Logo
        variant="light"
        href="/admin"
        ariaLabel="Adan Online Academy admin — Dashboard"
        className="min-h-11 shrink-0"
      />
      <span className="rounded-[var(--radius-full)] border border-[var(--gold-400)] px-2 py-0.5 text-[11px] font-medium text-[var(--gold-400)]">
        Admin
      </span>
    </div>
  );
}

/** Nav list + Log out, shared by the desktop sidebar and the mobile drawer. */
function SidebarContent({
  pathname,
  onNavigate,
  showWebsiteLink = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  showWebsiteLink?: boolean;
}) {
  return (
    <>
      <nav aria-label="Admin" className="relative flex-1 overflow-y-auto px-3 py-4">
        <ul className="flex flex-col gap-1">
          {ADMIN_NAV.map(({ label, href, icon: Icon }) => {
            const active = isAdminNavActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(itemBase, active ? "bg-[var(--green-800)] text-white" : itemIdle)}
                >
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-[3px] rounded-r-[var(--radius-full)] bg-[var(--gold-400)]"
                    />
                  )}
                  <Icon className={cn("size-5 shrink-0", active && "text-[var(--gold-400)]")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="relative border-t border-white/10 px-3 py-4">
        {showWebsiteLink && (
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View website (opens in a new tab)"
            className={cn(itemBase, itemIdle, "mb-1")}
          >
            <ExternalLinkIcon className="size-5 shrink-0" />
            View website
          </a>
        )}
        <form action={logout}>
          <button type="submit" className={cn(itemBase, itemIdle, "cursor-pointer")}>
            <LogoutIcon className="size-5 shrink-0" />
            Log out
          </button>
        </form>
      </div>
    </>
  );
}

export function AdminShell({ today, children }: { today: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const title = getAdminSectionTitle(pathname);

  // The drawer remembers the path it was opened on, so any navigation closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const drawerOpen = openedOn === pathname;

  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const closeDrawer = useCallback(() => {
    setOpenedOn(null);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;

    document.body.classList.add("menu-open");
    panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeDrawer();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      // Keep Tab focus inside the drawer.
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
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
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove("menu-open");
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div className="flex flex-1">
      {/* Desktop sidebar */}
      <aside
        data-tone="dark"
        className="hidden overflow-hidden bg-[var(--green-950)] lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-64 lg:flex-col"
      >
        <IslamicPattern
          className="absolute inset-x-0 bottom-0 h-80"
          color="var(--gold-400)"
          opacity={0.05}
          patternId="khatam-admin"
          variant="detailed"
        />
        <div className="relative flex h-16 shrink-0 items-center border-b border-white/10 px-4">
          <AdminBrand />
        </div>
        <SidebarContent pathname={pathname} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Dark on mobile/tablet (with the logo + menu), white on desktop. */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-[var(--green-800)] bg-[var(--green-950)] px-4 [--admin-title-color:#fff] [--focus-ring-color:var(--gold-300)] sm:px-6 lg:border-[var(--border)] lg:bg-[var(--surface)] lg:px-8 lg:[--admin-title-color:var(--green-900)] lg:[--focus-ring-color:var(--green-500)]">
          <div className="shrink-0 lg:hidden">
            <Logo
              variant="light"
              href="/admin"
              ariaLabel="Adan Online Academy admin — Dashboard"
              className="min-h-11"
            />
          </div>
          {/* Inline: the global unlayered h1 rule would override Tailwind color/size utilities. */}
          <h1
            className="min-w-0 flex-1 truncate border-l border-white/15 pl-3 lg:border-l-0 lg:pl-0"
            style={{
              fontSize: "clamp(1rem, 4vw, 1.375rem)",
              fontWeight: 600,
              color: "var(--admin-title-color)",
              lineHeight: 1.3,
            }}
          >
            {title}
          </h1>

          <div className="hidden shrink-0 items-center gap-5 lg:flex">
            <p className="text-sm text-[var(--text-muted)] tabular-nums">{today}</p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="View website (opens in a new tab)"
              className={cn(
                "inline-flex h-11 items-center gap-1.5 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-[var(--green-700)] transition-colors duration-150 hover:bg-[var(--green-50)] hover:text-[var(--green-800)] motion-reduce:transition-none",
                focusRing,
              )}
            >
              View website
              <ExternalLinkIcon className="size-4" />
            </a>
          </div>

          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpenedOn(pathname)}
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            aria-controls="admin-drawer"
            className={cn(
              "-mr-1.5 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-white transition-colors duration-150 hover:bg-white/[0.06] motion-reduce:transition-none lg:hidden",
              focusRing,
            )}
          >
            <MenuIcon className="size-6" />
          </button>
        </header>

        <main id="main-content" className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <ToastProvider>{children}</ToastProvider>
        </main>
      </div>

      {/* Mobile/tablet drawer — same dark styling as the sidebar */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-[var(--green-950)]/50"
            aria-hidden="true"
            onClick={closeDrawer}
          />
          <div
            id="admin-drawer"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            data-tone="dark"
            className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-[var(--green-950)] shadow-[var(--shadow-floating)]"
          >
            <IslamicPattern
              className="absolute inset-x-0 bottom-0 h-80"
              color="var(--gold-400)"
              opacity={0.05}
              patternId="khatam-admin-drawer"
              variant="detailed"
            />
            <div className="relative flex h-16 shrink-0 items-center justify-between border-b border-white/10 pl-4 pr-2">
              <AdminBrand />
              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className={cn(
                  "flex size-11 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] text-[var(--green-200)] transition-colors duration-150 hover:bg-white/[0.06] hover:text-white motion-reduce:transition-none",
                  focusRing,
                )}
              >
                <CloseIcon />
              </button>
            </div>
            <SidebarContent pathname={pathname} onNavigate={() => setOpenedOn(null)} showWebsiteLink />
          </div>
        </div>
      )}
    </div>
  );
}
