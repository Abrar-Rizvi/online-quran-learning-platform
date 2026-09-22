import type { ReactNode } from "react";

/** Text-input styling shared by the site's forms (same classes as the /enroll form). */
export const inputClasses =
  "h-12 w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

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
