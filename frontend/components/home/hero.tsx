import Image from "next/image";
import { Button, Container, IslamicPattern } from "@/components/ui";
import { HeroFadeIn } from "./hero-entrance";

const HERO = {
  eyebrow: "Live one-to-one online Quran classes",
  headingLead: "Learn Quran Online from the Comfort of Your Home ",
  headingAccent: "in the US",
  lede: "Private classes for kids and adults with male and female teachers, scheduled in your own US time zone.",
  primaryCta: { label: "Book free trial", href: "/book-free-trial" },
  secondaryCta: { label: "Browse courses", href: "/courses" },
  trustItems: [
    "Free trial class — no card needed",
    "Male & female teachers",
    "Classes in all US time zones",
  ],
} as const;

function CheckCircleIcon() {
  return (
    <svg
      className="size-5 shrink-0 text-[var(--gold-400)]"
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

export function Hero() {
  const headingId = "hero-heading";

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden bg-[var(--green-900)] py-16 lg:py-24"
    >
      <IslamicPattern
        className="absolute inset-0"
        color="var(--gold-400)"
        opacity={0.1}
        patternId="khatam-hero"
        variant="detailed"
      />

      <Container className="relative">
        <div className="grid items-center gap-12 lg:grid-cols-[11fr_9fr] lg:gap-16">
          {/* ── Text column ── */}
          <div>
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-300)]">
              {HERO.eyebrow}
            </p>

            <h1
              id={headingId}
              className="mt-4 max-w-[16ch]"
              style={{ color: "#fff", fontWeight: 700, lineHeight: 1.1 }}
            >
              {HERO.headingLead}
              <span className="text-[var(--gold-400)]">
                {HERO.headingAccent}
              </span>
            </h1>

            <div className="mt-4 flex gap-1" aria-hidden="true">
              <span className="h-[3px] w-10 rounded-full bg-[var(--gold-400)]" />
              <span className="h-[3px] w-4 rounded-full bg-[var(--green-200)]" />
            </div>

            <HeroFadeIn delay={0}>
              <p className="mt-6 max-w-[40ch] text-[1.125rem] leading-[1.6] text-[var(--green-200)] lg:text-[1.25rem]">
                {HERO.lede}
              </p>
            </HeroFadeIn>

            <HeroFadeIn delay={0.06}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  href={HERO.primaryCta.href}
                  variant="primary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  {HERO.primaryCta.label}
                </Button>
                <Button
                  href={HERO.secondaryCta.href}
                  variant="secondary"
                  size="md"
                  className="w-full sm:w-auto"
                >
                  {HERO.secondaryCta.label}
                </Button>
              </div>
            </HeroFadeIn>

            <HeroFadeIn delay={0.12}>
              <ul className="mt-6 flex flex-col gap-2 lg:flex-row lg:flex-wrap lg:gap-x-5 lg:gap-y-2">
                {HERO.trustItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-2 text-[0.95rem] text-[var(--green-200)]"
                  >
                    <CheckCircleIcon />
                    {item}
                  </li>
                ))}
              </ul>
            </HeroFadeIn>
          </div>

          {/* ── Image column ── */}
          <HeroFadeIn
            mode="image"
            className="relative mx-auto w-full max-w-[420px] lg:max-w-none"
          >
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)] border border-white/10"
              style={{ aspectRatio: "3/2" }}
            >
              <Image
                src="/images/hero-online.png"
                alt="Laptop screen showing three children in an online Quran class — a boy reading the Quran on a bookstand, a girl using a tablet, and a boy practicing Arabic writing"
                fill
                priority
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 420px, 90vw"
                className="object-cover object-center"
              />
            </div>
          </HeroFadeIn>
        </div>
      </Container>
    </section>
  );
}
