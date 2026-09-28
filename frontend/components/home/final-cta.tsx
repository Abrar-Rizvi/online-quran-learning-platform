import { Button, Container, Reveal } from "@/components/ui";

/**
 * DRAFT copy — to be confirmed with the academy before launch.
 * Deliberately no prices, counts, WhatsApp button, trial length or other unconfirmed claims.
 */
export const FINAL_CTA = {
  eyebrow: "Begin today",
  headingBefore: "Begin Your ",
  headingAccent: "Quran Journey",
  headingAfter: " With Us",
  lede: "Live one-to-one classes for kids and adults, with male and female teachers, scheduled in your own US time zone.",
  primary: { label: "Book a free trial", href: "/book-free-trial" },
  secondary: { label: "Enroll now", href: "/enroll" },
  trust: ["Free trial — no card needed", "No registration fee", "Male & female teachers"],
} as const;

function CheckCircleIcon() {
  return (
    <svg
      className="size-5 shrink-0 text-[var(--green-500)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function FinalCta() {
  const headingId = "final-cta-heading";

  return (
    <section
      aria-labelledby={headingId}
      className="border-t border-[var(--border)] bg-[var(--gold-50)] py-16 lg:py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            {/* Decorative accent line — gold-500 is decoration only, never text. */}
            <span
              aria-hidden="true"
              className="mx-auto mb-4 block h-[3px] w-12 rounded-full bg-[var(--gold-500)]"
            />
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
              {FINAL_CTA.eyebrow}
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h2 id={headingId} className="mt-4" style={{ lineHeight: 1.15 }}>
              {FINAL_CTA.headingBefore}
              <span className="font-semibold text-[var(--green-700)]">{FINAL_CTA.headingAccent}</span>
              {FINAL_CTA.headingAfter}
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-4 max-w-[55ch] text-[1.0625rem] leading-relaxed text-[var(--text-muted)]">
              {FINAL_CTA.lede}
            </p>
          </Reveal>

          <Reveal delay={0.18}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                href={FINAL_CTA.primary.href}
                variant="primary"
                size="md"
                className="w-full justify-center sm:w-auto"
              >
                {FINAL_CTA.primary.label}
              </Button>
              <Button
                href={FINAL_CTA.secondary.href}
                variant="secondary"
                size="md"
                className="w-full justify-center sm:w-auto"
              >
                {FINAL_CTA.secondary.label}
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.24}>
            <ul className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--text)]">
              {FINAL_CTA.trust.map((item) => (
                <li key={item} className="inline-flex items-center gap-2 whitespace-nowrap">
                  <CheckCircleIcon />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
