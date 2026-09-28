/** Stand-in body for admin sections whose real content comes in a later step. */
export function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
      {/* Inline: the global unlayered h2 rule would override Tailwind size utilities. */}
      <h2 className="m-0" style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--green-900)" }}>
        {title}
      </h2>
      <p className="mt-1.5 text-[0.9375rem] text-[var(--text-muted)]">
        This section will be built in the next step.
      </p>
    </div>
  );
}
