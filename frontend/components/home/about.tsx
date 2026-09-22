import Image from "next/image";
import { Container, Reveal } from "@/components/ui";
import { ImageReveal } from "./about-entrance";

const ABOUT = {
  sectionLabel: "About the academy",
  eyebrow: "Learn Quran Online, From Anywhere",
  heading: "Authentic Islamic Education With Personal Attention",
  intro:
    "Adan Online Academy is an online Quran learning institute based in the United States, offering quality Quran and Islamic education to students throughout the US and around the world. Our goal is to make learning the Quran simple, accessible, and comfortable for students and families of all ages.",
  features: [
    "Qualified & Dedicated Quran Teachers",
    "Personalized One-to-One Live Classes",
    "Comfortable & Child-Friendly Learning Environment",
  ],
  stats: [
    { value: "1000+", label: "Happy Students" },
    { value: "70+", label: "Qualified Teachers" },
    { value: "11+", label: "Years of Experience" },
    { value: "Worldwide", label: "Class Availability" },
  ],
  missionHeading: "Our Mission",
  missionParagraphs: [
    "At Adan Online Academy, our mission is to make Quran learning accessible, flexible, and affordable for Muslim families everywhere. We aim to help students build a stronger connection with the Quran through personalized instruction, supportive teachers, and lessons designed around each student’s individual learning needs.",
    "We bring together authentic Islamic teachings and modern online learning, allowing students to receive quality Quran education from the comfort and privacy of their own homes—whether they live in the United States or anywhere else in the world. With one-to-one live lessons, every student receives focused guidance and the opportunity to learn at a comfortable pace.",
  ],
  imageOne: {
    src: "/images/about-one.png",
    alt: "Teacher wearing a headset teaching Arabic letters to a young student through a live video call on a laptop",
  },
  imageTwo: {
    src: "/images/about-two.png",
    alt: "Father guiding his daughter through an online Quran lesson on a laptop, with Quran books on the desk",
  },
} as const;

function highlightPhrases(text: string, phrases: string[]) {
  if (phrases.length === 0) return text;
  const pattern = new RegExp(
    `(${phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g"
  );
  return text.split(pattern).map((part, i) =>
    phrases.includes(part) ? (
      <span key={i} className="font-semibold text-[var(--green-800)]">
        {part}
      </span>
    ) : (
      part
    )
  );
}

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

export function About() {
  const headingId = "about-heading";

  return (
    <section aria-labelledby={headingId} className="bg-[var(--bg)] py-16 lg:py-24">
      <Container>
        {/* ── Block 1: text-left / image-right ── */}
        <div className="grid items-center gap-12 lg:grid-cols-[11fr_9fr] lg:gap-16">
          <div>
            <Reveal>
              <p
                className="text-[1.125rem] font-semibold tracking-[0.03em] text-[var(--green-800)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {ABOUT.sectionLabel}
              </p>
            </Reveal>

            <Reveal>
              <p className="mt-2 text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
                {ABOUT.eyebrow}
              </p>
            </Reveal>

            <Reveal delay={0.06}>
              <h2 id={headingId} className="mt-4" style={{ lineHeight: 1.15 }}>
                {ABOUT.heading}
              </h2>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-6 text-[1.0625rem] leading-[1.65] text-[var(--text-muted)]">
                {highlightPhrases(ABOUT.intro, [
                  "Adan Online Academy",
                  "simple, accessible, and comfortable",
                ])}
              </p>
            </Reveal>

            <ul className="mt-6 flex flex-col gap-3">
              {ABOUT.features.map((item, i) => (
                <li key={item}>
                  <Reveal staggerIndex={i} delay={0.18} className="flex items-center gap-2.5">
                    <CheckCircleIcon />
                    {item}
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>

          <ImageReveal className="mx-auto w-full max-w-[420px] lg:max-w-none">
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)]"
              style={{ aspectRatio: "3/2" }}
            >
              <Image
                src={ABOUT.imageOne.src}
                alt={ABOUT.imageOne.alt}
                fill
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 420px, 90vw"
                className="object-cover object-center"
              />
            </div>
          </ImageReveal>
        </div>

        {/* ── Stat strip ── */}
        <Reveal className="mt-16 lg:mt-24">
          <div className="grid grid-cols-2 gap-8 rounded-[var(--radius-lg)] bg-[var(--surface-alt)] p-8 lg:grid-cols-4 lg:p-12">
            {ABOUT.stats.map((stat, i) => (
              <Reveal key={stat.label} staggerIndex={i} className="text-center">
                <span
                  className="block text-[2rem] font-bold text-[var(--green-900)]"
                  style={{ fontFamily: "var(--font-heading)", lineHeight: 1.2 }}
                >
                  {stat.value}
                </span>
                <span className="mt-1 block text-sm text-[var(--text-muted)]">
                  {stat.label}
                </span>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* ── Block 2: image-left / text-right ── */}
        <div className="mt-16 grid items-center gap-12 lg:mt-24 lg:grid-cols-[9fr_11fr] lg:gap-16">
          <div className="lg:order-2">
            <Reveal>
              <h2 style={{ lineHeight: 1.15 }}>{ABOUT.missionHeading}</h2>
            </Reveal>

            <Reveal delay={0.06}>
              <p className="mt-6 text-[1.0625rem] leading-[1.65] text-[var(--text-muted)]">
                {highlightPhrases(ABOUT.missionParagraphs[0], [
                  "Adan Online Academy",
                  "accessible, flexible, and affordable",
                ])}
              </p>
            </Reveal>

            <Reveal delay={0.12}>
              <p className="mt-4 text-[1.0625rem] leading-[1.65] text-[var(--text-muted)]">
                {ABOUT.missionParagraphs[1]}
              </p>
            </Reveal>
          </div>

          <ImageReveal className="mx-auto w-full max-w-[420px] lg:order-1 lg:max-w-none">
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)]"
              style={{ aspectRatio: "3/2" }}
            >
              <Image
                src={ABOUT.imageTwo.src}
                alt={ABOUT.imageTwo.alt}
                fill
                sizes="(min-width: 1024px) 45vw, (min-width: 640px) 420px, 90vw"
                className="object-cover object-center"
              />
            </div>
          </ImageReveal>
        </div>
      </Container>
    </section>
  );
}
