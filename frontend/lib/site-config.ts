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

export const brandTagline =
  "Helping Muslim families learn Quran online with qualified teachers in a safe & friendly environment.";

/** Footer "Quick Links" column, in display order. */
export const footerQuickLinks: NavLink[] = [
  { label: "Contact Us", href: "/contact" },
  { label: "Testimonials", href: "/#testimonials" },
  { label: "Fee Structure", href: "/#fee" },
  { label: "Courses", href: "/courses" },
  { label: "Blog", href: "/blog" },
  { label: "About Us", href: "/#about" },
];

/** Footer "Legal" column, in display order. These pages don't exist yet — same pattern as other not-yet-built routes (e.g. /contact, /blog). */
export const footerLegalLinks: NavLink[] = [
  { label: "Safeguarding Policy", href: "/safeguarding-policy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Refund Policy", href: "/refund-policy" },
  { label: "Terms & Conditions", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy-policy" },
];

export interface FooterContactRow extends NavLink {
  icon: "phone" | "mail";
}

/** Footer "Contact Us" column — exactly these 3 rows, in this order. */
export const footerContactRows: FooterContactRow[] = [
  { label: "+1 (613) 391-1457", href: "tel:+16133911457", icon: "phone" },
  { label: "+1 (413) 381-2074", href: "tel:+14133812074", icon: "phone" },
  { label: "info@quranclass.us", href: "mailto:info@quranclass.us", icon: "mail" },
];

export type SocialPlatform =
  | "facebook"
  | "x"
  | "instagram"
  | "youtube"
  | "pinterest"
  | "tiktok";

export interface SocialLink {
  platform: SocialPlatform;
  label: string;
  /** Empty until the academy supplies a real URL — the footer renders only icons with a non-empty url. */
  url: string;
}

/** Free-trial length shown on the Contact page's CTA card — must match the academy's real free-trial policy. */
export const FREE_TRIAL_DAYS = 5;

export const socialLinks: SocialLink[] = [
  { platform: "facebook", label: "Facebook", url: "" },
  { platform: "x", label: "X (Twitter)", url: "" },
  { platform: "instagram", label: "Instagram", url: "" },
  { platform: "youtube", label: "YouTube", url: "" },
  { platform: "pinterest", label: "Pinterest", url: "" },
  { platform: "tiktok", label: "TikTok", url: "" },
];

/** Academy WhatsApp number, as displayed, and its chat link. */
export const ACADEMY_WHATSAPP_NUMBER = "+1 (613) 391-1457";
export const ACADEMY_WHATSAPP_URL = "https://wa.me/16133911457";

/** Used by WhatsApp buttons when NEXT_PUBLIC_WHATSAPP_NUMBER isn't configured (see getContactConfig()). */
export const WHATSAPP_FALLBACK_URL = ACADEMY_WHATSAPP_URL;

export interface ContactEmail {
  label: string;
  email: string;
}

/** Contact page "Send Us Email" list, in display order. The info address matches the Footer's email row. */
export const contactEmails: ContactEmail[] = [
  { label: "Information", email: "info@quranclass.us" },
  { label: "Registration", email: "register@quranclass.us" },
  { label: "Complaints / Suggestions", email: "cs@quranclass.us" },
];

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
