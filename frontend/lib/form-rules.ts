/**
 * Client-side field rules for the public forms (enrollment, free trial).
 * They mirror backend/src/backend/schemas/fields.py so most mistakes are
 * shown inline before submitting; the backend stays the final authority.
 * Each function returns an error message, or null when the value is fine.
 */

export const FIELD_LIMITS = { name: 100, email: 254, phone: 32, country: 64 } as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function nameError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter your name.";
  if (v.length > FIELD_LIMITS.name) return `Name must be at most ${FIELD_LIMITS.name} characters.`;
  return null;
}

export function emailError(value: string): string | null {
  const v = value.trim();
  if (!v) return "Please enter your email.";
  if (v.length > FIELD_LIMITS.email) return `Email must be at most ${FIELD_LIMITS.email} characters.`;
  if (!EMAIL_RE.test(v)) return "Please enter a valid email address.";
  return null;
}

/**
 * 7–15 digits and at most 32 characters (spaces, "+", "-", "( )" are fine).
 * `emptyMessage` makes the field required; leave it out for optional fields.
 */
export function phoneError(value: string, label: string, emptyMessage?: string): string | null {
  const v = value.trim();
  if (!v) return emptyMessage ?? null;
  if (v.length > FIELD_LIMITS.phone) return `${label} must be at most ${FIELD_LIMITS.phone} characters.`;
  const digits = v.replace(/\D/g, "").length;
  if (digits < 7 || digits > 15) return `${label} must contain 7 to 15 digits.`;
  return null;
}

export function countryError(value: string, emptyMessage = "Please enter your country."): string | null {
  const v = value.trim();
  if (!v) return emptyMessage;
  if (v.length > FIELD_LIMITS.country) return `Country must be at most ${FIELD_LIMITS.country} characters.`;
  return null;
}
