import Link from "next/link";
import { Container } from "@/components/ui";
import { Logo } from "./logo";
import { MailIcon, PhoneIcon, SocialIcon } from "./footer-icons";
import {
  brandTagline,
  footerContactRows,
  footerLegalLinks,
  footerQuickLinks,
  socialLinks,
} from "@/lib/site-config";

/**
 * Shared hover/focus treatment for every footer link: a 4px slide + gold color
 * shift over 150ms with the site's easeOut curve (see lib/motion.ts). The
 * translate is motion-safe-only; under prefers-reduced-motion only the color
 * transitions, per the site's reduced-motion rule.
 */
const footerLinkClasses =
  "inline-flex gap-3 rounded-[var(--radius-sm)] text-sm text-[var(--green-200)] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--gold-300)] focus-visible:text-[var(--gold-300)] motion-safe:transition-[color,translate] motion-safe:hover:translate-x-1 motion-safe:focus-visible:translate-x-1 focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2 min-h-11";

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={`${footerLinkClasses} items-center`}>
      {children}
    </Link>
  );
}

export function Footer() {
  const activeSocialLinks = socialLinks.filter((social) => social.url.trim() !== "");

  return (
    <footer
      data-tone="dark"
      className="relative overflow-hidden bg-[var(--green-950)] text-[var(--green-200)]"
    >
      {/*
        Watermark reuses the site's own Arabic wordmark glyph (see the "عدن" mark in
        components/layout/logo.tsx / the how-it-works.tsx CTA banner) rather than a new
        symbol. Rendered as inert decorative text, clipped by the footer's overflow-hidden,
        positioned behind the About Us column.
      */}
      <span
        aria-hidden="true"
        lang="ar"
        dir="rtl"
        className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 -translate-x-[15%] font-bold text-[var(--gold-300)] opacity-[0.08] select-none"
        style={{ fontSize: "clamp(6rem, 18vw, 16rem)", lineHeight: 1 }}
      >
        عدن
      </span>

      {/* Main content */}
      <div className="relative">
        <Container>
          <div className="grid grid-cols-1 gap-10 py-16 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr] lg:gap-8">
            {/* Column 1 — About Us */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">About Us</h3>
              <Logo variant="light" />
              <p className="mt-4 max-w-xs text-sm leading-relaxed">{brandTagline}</p>

              {activeSocialLinks.length > 0 && (
                <ul className="mt-5 flex flex-wrap items-center gap-3">
                  {activeSocialLinks.map((social) => (
                    <li key={social.platform}>
                      <a
                        href={social.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.label}
                        className="inline-flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--green-200)] transition-colors duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:text-[var(--gold-300)] focus-visible:text-[var(--gold-300)] focus-visible:outline-3 focus-visible:outline-[var(--gold-300)] focus-visible:outline-offset-2"
                      >
                        <SocialIcon platform={social.platform} className="size-5" />
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Column 2 — Quick Links */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">Quick Links</h3>
              <ul className="space-y-1">
                {footerQuickLinks.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3 — Legal */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">Legal</h3>
              <ul className="space-y-1">
                {footerLegalLinks.map((link) => (
                  <li key={link.href}>
                    <FooterLink href={link.href}>{link.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 4 — Contact Us */}
            <div>
              <h3 className="mb-4 text-sm font-semibold text-white">Contact Us</h3>
              <ul className="space-y-1">
                {footerContactRows.map((row) => (
                  <li key={row.href}>
                    <a href={row.href} className={`${footerLinkClasses} items-start`}>
                      <span className="mt-0.5 shrink-0 text-[var(--gold-400)]">
                        {row.icon === "phone" ? (
                          <PhoneIcon className="size-[19px]" />
                        ) : (
                          <MailIcon className="size-[19px]" />
                        )}
                      </span>
                      <span className="break-words">{row.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Container>

        {/* Bottom bar */}
        <div className="border-t border-[var(--gold-500)]/15">
          <Container>
            <p className="py-6 text-center text-xs text-[var(--green-200)]/70">
              &copy; {new Date().getFullYear()} Adan Online Academy. All rights reserved.
            </p>
          </Container>
        </div>
      </div>
    </footer>
  );
}
