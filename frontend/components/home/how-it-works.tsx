import { Button, Container, Reveal } from "@/components/ui";
import { getContactConfig, WHATSAPP_FALLBACK_URL } from "@/lib/site-config";

interface Step {
  icon: (props: { className?: string }) => React.ReactElement;
  title: string;
  description: string;
}

interface BannerCopy {
  heading: string;
  subtext: string;
}

/** Suggested copy — confirm final wording with the academy before launch. */
const BANNER_COPY: BannerCopy = {
  heading: "Your first Quran class can be this week",
  subtext: "Book a free trial today — no card, no commitment.",
};

function ClipboardListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3" />
    </svg>
  );
}

function FileEditIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8" />
      <path d="M18.4 2.6a1.7 1.7 0 1 1 2.4 2.4L12 13.6 9 14.4l.8-3 8.6-8.8z" />
    </svg>
  );
}

function MessageCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.3 1.1 4.4 2.9 5.9L4 21l4-1.8c1.2.5 2.6.8 4 .8 5.5 0 10-3.8 10-8.5S17.5 3 12 3Z" />
    </svg>
  );
}

function PlayCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

const STEPS: Step[] = [
  {
    icon: ClipboardListIcon,
    title: "Choose your plan",
    description:
      "Pick 3 or 5 days a week — any course, same simple pricing.",
  },
  {
    icon: FileEditIcon,
    title: "Book your free trial",
    description:
      "Fill out a short form with your details and preferred time — no card required.",
  },
  {
    icon: MessageCircleIcon,
    title: "We confirm your schedule",
    description:
      "Our team reaches out to confirm your teacher and class time.",
  },
  {
    icon: PlayCircleIcon,
    title: "Start your first class",
    description:
      "Join your live one-to-one class and begin your Quran journey.",
  },
];

function StepCard({ step, index }: { step: Step; index: number }) {
  const Icon = step.icon;
  const isLast = index === STEPS.length - 1;

  return (
    <div className="relative flex flex-col items-center text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-full border-2 border-[var(--green-200)] bg-[var(--surface)]">
          <Icon className="size-7 text-[var(--green-700)]" />
        </div>
        <span
          className="absolute -top-2 -right-2 flex size-7 items-center justify-center rounded-full border-2 border-[var(--surface-alt)] bg-[var(--green-700)] text-xs font-bold text-white"
          aria-hidden="true"
        >
          {index + 1}
        </span>
      </div>

      <h3
        className="mt-5 text-base font-bold text-[var(--text)]"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {step.title}
      </h3>

      <p className="mt-2 max-w-[24ch] text-sm leading-relaxed text-[var(--text-muted)]">
        {step.description}
      </p>

      {!isLast && (
        <span
          className="pointer-events-none absolute top-[28px] left-full hidden w-8 -translate-y-1/2 items-center justify-center lg:flex"
          aria-hidden="true"
        >
          <ArrowRightIcon className="size-4 text-[var(--green-200)]" />
        </span>
      )}
    </div>
  );
}

export function HowItWorks() {
  const headingId = "how-it-works-heading";
  const whatsappUrl = getContactConfig().whatsappUrl ?? WHATSAPP_FALLBACK_URL;

  return (
    <section
      id="how-it-works"
      aria-labelledby={headingId}
      className="bg-[var(--surface-alt)] py-16 lg:py-24"
    >
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
              How It Works
            </p>
          </Reveal>

          <Reveal delay={0.06}>
            <h2 id={headingId} className="mt-4" style={{ lineHeight: 1.15 }}>
              Start learning in four simple steps
            </h2>
          </Reveal>

          <Reveal delay={0.12}>
            <p className="mx-auto mt-4 max-w-[55ch] text-[1.0625rem] leading-relaxed text-[var(--text-muted)]">
              From choosing a plan to your first live class — here&apos;s
              what to expect.
            </p>
          </Reveal>
        </div>

        <ol className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step, i) => (
            <li key={step.title}>
              <Reveal staggerIndex={i}>
                <StepCard step={step} index={i} />
              </Reveal>
            </li>
          ))}
        </ol>

        <Reveal staggerIndex={STEPS.length}>
          <div
            data-tone="dark"
            className="relative mt-14 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--green-900)] px-6 py-8 sm:px-10 sm:py-10"
          >
            {/*
              Watermark reuses the site's own Arabic wordmark glyph (see the "عدن"
              mark in components/layout/logo.tsx) rather than a new symbol. Rendered
              as inert decorative text — not the interactive Logo/Link component —
              so it stays out of the tab order and never doubles the "Home" link.
            */}
            <span
              aria-hidden="true"
              lang="ar"
              dir="rtl"
              className="pointer-events-none absolute top-1/2 left-0 -translate-y-1/2 -translate-x-[10%] font-bold text-[var(--gold-300)] opacity-10 select-none"
              style={{ fontSize: "clamp(5rem, 20vw, 12rem)", lineHeight: 1 }}
            >
              عدن
            </span>

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
              <div className="max-w-lg">
                <h3
                  className="text-2xl font-bold text-white sm:text-[1.75rem]"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {BANNER_COPY.heading}
                </h3>
                <p className="mt-2 text-[var(--green-100)]">
                  {BANNER_COPY.subtext}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:shrink-0">
                <Button
                  href="/book-free-trial"
                  variant="inverted"
                  size="md"
                  className="w-full justify-center sm:w-auto"
                >
                  Book a free trial
                </Button>
                <Button
                  href={whatsappUrl}
                  variant="secondary"
                  size="md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full justify-center gap-2 sm:w-auto"
                >
                  <MessageCircleIcon className="size-4" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
