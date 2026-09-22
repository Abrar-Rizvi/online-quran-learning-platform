/** Centralized navigation and footer link configuration. */

export interface NavLink {
  label: string;
  href: string;
}

export interface CtaLink extends NavLink {
  variant: "primary" | "secondary";
}

export const navLinks: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Fee", href: "/#fee" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

export const ctaLinks: CtaLink[] = [
  { label: "Book free trial", href: "/book-free-trial", variant: "primary" },
  { label: "Enrollment", href: "/enroll", variant: "secondary" },
];

export const footerAcademyLinks: NavLink[] = [
  { label: "Fee", href: "/#fee" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
  { label: "Book a free trial", href: "/book-free-trial" },
  { label: "Enrollment", href: "/enroll" },
];

export const brandTagline =
  "Live one-to-one online Quran classes for children and adults.";

/**
 * Fallback only: used when NEXT_PUBLIC_WHATSAPP_NUMBER isn't configured (see getContactConfig()).
 * MUST be replaced with the academy's real WhatsApp number (via that env var) before launch.
 */
export const WHATSAPP_FALLBACK_URL = "https://wa.me/REPLACE_WITH_ACADEMY_NUMBER";

/** Build a WhatsApp chat URL from a phone number (digits-only). */
export function getWhatsAppUrl(number: string): string {
  const digits = number.replace(/\D/g, "");
  const message = encodeURIComponent(
    "Assalamu alaikum, I would like to know about Quran classes at Adan Online Academy.",
  );
  return `https://wa.me/${digits}?text=${message}`;
}

/** Read contact details from env, returning null when not configured. */
export function getContactConfig() {
  const whatsapp = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || null;
  const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;
  return {
    whatsapp,
    whatsappUrl: whatsapp ? getWhatsAppUrl(whatsapp) : null,
    email,
    emailUrl: email ? `mailto:${email}` : null,
  };
}
