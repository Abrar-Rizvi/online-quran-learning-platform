import { Button } from "@/components/ui";
import { FINAL_CTA } from "@/components/home/final-cta";

/** Free-trial card after an article. Same card treatment and copy as the site's existing CTAs — no new claims. */
export function BlogCta() {
  return (
    <section
      aria-labelledby="blog-cta-heading"
      className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--gold-50)] p-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8"
    >
      <div>
        {/* Inline: the global unlayered h2 rule would override Tailwind color/size utilities. */}
        <h2
          id="blog-cta-heading"
          className="m-0"
          style={{ fontFamily: "var(--font-heading)", fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.25, color: "var(--green-900)" }}
        >
          Ready to start learning?
        </h2>
        <p className="mt-1.5 text-[0.9375rem] text-[var(--text-muted)]">{FINAL_CTA.lede}</p>
      </div>
      <Button href={FINAL_CTA.primary.href} variant="primary" size="md" className="w-full shrink-0 sm:w-auto">
        {FINAL_CTA.primary.label}
      </Button>
    </section>
  );
}
