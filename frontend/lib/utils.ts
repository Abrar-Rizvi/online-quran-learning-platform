import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * The keys whose values differ between two snapshots of a form, with the new
 * values — for PATCH requests that send only what changed. Normalize both
 * sides first (trim, lowercase…) so cosmetic edits don't count.
 */
export function changedFields<T extends Record<string, unknown>>(original: T, current: T): Partial<T> {
  const out: Partial<T> = {};
  for (const key of Object.keys(current) as (keyof T)[]) {
    if (!Object.is(original[key], current[key])) out[key] = current[key];
  }
  return out;
}
