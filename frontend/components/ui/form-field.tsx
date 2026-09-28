import type { ReactNode } from "react";

/**
 * Field styling shared by every form (inputs, selects, textareas; public and admin).
 * Resting border is --border-input (~3:1 on white); focus — mouse or keyboard — only
 * turns that 1px border green-700: no ring, glow or size change. Invalid fields
 * (aria-invalid) keep the error border.
 */
export const fieldBorderClasses =
  "border border-[var(--border-input)] outline-none transition-colors duration-150 hover:border-[var(--border-strong)] focus:border-[var(--green-700)] aria-invalid:border-[var(--error)] motion-reduce:transition-none";

export const inputClasses = `h-12 w-full rounded-[var(--radius-sm)] ${fieldBorderClasses} bg-[var(--surface)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed disabled:opacity-60`;

export function FormField({
  label,
  htmlFor,
  required,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--text)]">
        {label}
        {required && <span className="text-[var(--error)]"> *</span>}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-[var(--error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
