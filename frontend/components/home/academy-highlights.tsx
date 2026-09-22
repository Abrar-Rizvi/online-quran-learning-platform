import { Container, Reveal, StatCounter } from "@/components/ui";
import { TestimonialCarousel, type Testimonial } from "./testimonial-carousel";

type IconProps = { className?: string };

function LineIcon({ className, children }: IconProps & { children: React.ReactNode }) {
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
      {children}
    </svg>
  );
}

const UsersIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </LineIcon>
);
const GiftIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <rect x="3" y="8" width="18" height="4" rx="1" />
    <path d="M12 8v13" />
    <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
    <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
  </LineIcon>
);
const UserCheckIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </LineIcon>
);
const ClipboardListIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </LineIcon>
);
const VideoIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <path d="m16 13 5.2 3.5a.5.5 0 0 0 .8-.4V7.9a.5.5 0 0 0-.8-.4L16 11" />
    <rect x="2" y="6" width="14" height="12" rx="2" />
  </LineIcon>
);
const ClockIcon = (p: IconProps) => (
  <LineIcon {...p}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </LineIcon>
);

const FEATURES: { icon: (p: IconProps) => React.ReactElement; title: string; description: string }[] = [
  {
    icon: UsersIcon,
    title: "One-to-One Live Classes",
    description: "Private live classes with a dedicated teacher for every student.",
  },
  {
    icon: GiftIcon,
    title: "Free Trial, No Card Needed",
    description: "Try a class before you commit to anything.",
  },
  {
    icon: UserCheckIcon,
    title: "Male & Female Teachers",
    description: "Choose a teacher your family is comfortable with.",
  },
  {
    icon: ClipboardListIcon,
    title: "Monthly Progress Reports",
    description: "Parents get a clear update on their child's progress every month.",
  },
  {
    icon: VideoIcon,
    title: "Live Virtual Classroom",
    description: "Join real-time video classes over Zoom or Google Meet.",
  },
  {
    icon: ClockIcon,
    title: "Flexible US Time Zones",
    description: "Classes scheduled to fit your family's US time zone.",
  },
];

/** Same numbers as the About section's stat strip ("1000+", "70+") — keep in sync with components/home/about.tsx. */
const STATS = [
  { value: 1000, suffix: "+", label: "Happy Students" },
  { value: 70, suffix: "+", label: "Qualified Teachers" },
] as const;

/** Real testimonials — quotes are verbatim; do not edit the wording. */
const TESTIMONIALS: readonly Testimonial[] = [
  {
    name: "Umair Imtiaz",
    location: "New York, USA",
    quote:
      "I am very happy with my experience. My teacher is patient, kind, and explains everything clearly. I have improved my Quran reading and Tajweed a lot. Alhamdulillah, I feel more confident in my recitation now. Highly recommended.",
  },
  {
    name: "Zakir Farhan",
    location: "California, USA",
    quote:
      "Adan Online Academy has been a great choice for learning the Quran online. My teacher is very supportive and makes every class easy to understand. I have learned many Tajweed rules and improved my pronunciation. I am really satisfied with the classes.",
  },
  {
    name: "Ibrahim",
    location: "Texas, USA",
    quote:
      "I really enjoy my Quran classes. The one-to-one classes make it easy to focus and learn at my own pace. My teacher is friendly and always helps me correct my mistakes. Alhamdulillah, I can now recite the Quran much better with Tajweed.",
  },
  {
    name: "Aliza",
    location: "Illinois, USA",
    quote:
      "I am very pleased with the Quran classes at Adan Online Academy. My teacher is caring, patient, and always encourages me to do better. The lessons are well explained and easy to follow. Alhamdulillah, my Quran reading has improved a lot. I would happily recommend the academy to others.",
  },
];

export function FeatureGrid() {
  return (
    <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
      {FEATURES.map(({ icon: Icon, title, description }, i) => (
        <li key={title}>
          <Reveal staggerIndex={i % 3} className="h-full">
            <div className="group h-full rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 transition-colors duration-150 hover:bg-[var(--green-50)]">
              <Icon className="size-8 text-[var(--green-700)] transition-transform duration-150 motion-safe:group-hover:rotate-[9deg]" />
              <h3
                className="mt-4 text-lg font-bold"
                style={{ fontFamily: "var(--font-body)" }}
              >
                {title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}

/** Same tile markup as the About section's stat strip (2 tiles, no count-up). */
export function StatsStrip() {
  return (
    <div className="mx-auto grid max-w-md grid-cols-2 gap-8">
      {STATS.map((stat, i) => (
        <Reveal key={stat.label} staggerIndex={i} className="text-center">
          <span
            className="block text-[2rem] font-bold text-[var(--green-900)]"
            style={{ fontFamily: "var(--font-heading)", lineHeight: 1.2 }}
          >
            <StatCounter value={stat.value} suffix={stat.suffix} />
          </span>
          <span className="mt-1 block text-sm text-[var(--text-muted)]">{stat.label}</span>
        </Reveal>
      ))}
    </div>
  );
}

export function AcademyHighlights() {
  const headingId = "academy-highlights-heading";

  return (
    <section aria-labelledby={headingId}>
      <div className="bg-[var(--surface)] py-16 lg:py-24">
        <Container>
          <Reveal>
            <h2 id={headingId} className="text-center" style={{ lineHeight: 1.15 }}>
              What Makes Our <span className="font-semibold text-[var(--green-700)]">Academy Special</span>
            </h2>
          </Reveal>

          <div className="mt-12">
            <FeatureGrid />
          </div>
        </Container>
      </div>

      <div className="bg-[var(--surface-alt)] py-16 lg:py-24">
        <Container>
          <Reveal>
            {/* Inline size/weight: the global unlayered h3 rule would override Tailwind utilities. Stays below the H2 (max 2.5rem). */}
            <h3
              className="text-center"
              style={{
                fontFamily: "var(--font-heading)",
                fontSize: "clamp(1.625rem, 2.4vw, 1.875rem)",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              Parents &amp; Students Trust Us
            </h3>
          </Reveal>

          <div className="mt-8">
            <StatsStrip />
          </div>

          <Reveal className="mt-12 lg:mt-16">
            <p className="mb-6 text-center text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
              Real Reviews From Real Families
            </p>
            <TestimonialCarousel testimonials={TESTIMONIALS} />
          </Reveal>
        </Container>
      </div>
    </section>
  );
}
