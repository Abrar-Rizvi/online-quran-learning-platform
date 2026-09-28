/** Small building blocks for admin detail sheets: section titles, label/value rows, inline links. */

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    // Inline: the global unlayered h3 rule would override Tailwind size/color utilities.
    <h3 className="m-0" style={{ fontSize: "0.8125rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-body)" }}>
      {children}
    </h3>
  );
}

export function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 py-2.5 text-[0.9375rem]">
      <dt className="text-[var(--text-muted)]">{label}</dt>
      <dd className="m-0 min-w-0 break-words text-[var(--text)]">{children}</dd>
    </div>
  );
}

export const detailLinkClass =
  "rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";
