import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Badge, Button, Container, Reveal, WhatsAppCtaCard } from "@/components/ui";
import { formatPrice } from "@/components/courses/pricing-card";
import { ENROLLMENT_NEXT_STEPS } from "@/components/enroll/whats-next-panel";
import { classesPerMonth, getScheduleLabel } from "@/lib/courses";
import { formatPreferredTime, getEnrollmentStatusLabel } from "@/lib/enrollment";
import { fetchCoursesOrThrow, fetchEnrollmentByToken, fetchFeesOrThrow } from "@/lib/api";

export const metadata: Metadata = {
  title: "Enrollment Confirmed",
  description: "Your Adan Online Academy enrollment is confirmed.",
  // Private page: never indexed, and the token in the URL is never sent to other sites
  // (next.config.ts also sends the matching X-Robots-Tag and Referrer-Policy headers).
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** secrets.token_urlsafe(32) on the backend → exactly 43 URL-safe characters. */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

interface ConfirmationPageProps {
  params: Promise<{ token: string }>;
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export default async function EnrollmentConfirmationPage({ params }: ConfirmationPageProps) {
  const { token } = await params;
  // Old numeric links (/enroll/confirmation/5) and other garbage never reach the backend.
  // No loading.tsx in this segment, so notFound() here still answers with a real 404 status.
  if (!TOKEN_RE.test(token)) notFound();

  const enrollment = await fetchEnrollmentByToken(token);
  if (!enrollment) notFound();

  // The confirmation endpoint nests only the plan (id, days_per_week, fee, currency), not the
  // course — GET /fees is the only public endpoint that maps a plan id to its course_id.
  const [courses, fees] = await Promise.all([fetchCoursesOrThrow(), fetchFeesOrThrow()]);
  const feePlan = fees.find((plan) => plan.id === enrollment.course_plan.id);
  const course = feePlan ? courses.find((c) => c.id === feePlan.course_id) : undefined;

  const { student, course_plan: plan } = enrollment;
  const price = formatPrice(parseFloat(plan.fee), plan.currency);
  const preferredTime = formatPreferredTime(enrollment.preferred_time);

  return (
    <section className="bg-[var(--bg)] py-16 lg:py-24">
      <Container>
        <Reveal className="mx-auto max-w-xl">
          <div className="flex flex-col items-center text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-[var(--green-100)] text-[var(--green-800)]">
              <CheckIcon className="size-7" />
            </span>

            <h1
              className="mt-5 max-w-[24ch]"
              style={{ fontSize: "clamp(1.5rem, 4vw, 2.25rem)" }}
            >
              Thank you, {student.name}! You&apos;re enrolled.
            </h1>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {student.registration_no && (
                <Badge variant="gold">Your registration number: {student.registration_no}</Badge>
              )}
              <Badge variant="green">{getEnrollmentStatusLabel(enrollment.status)}</Badge>
            </div>
          </div>

          <div className="mt-8 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
            <h2
              className="text-xl font-bold text-[var(--green-900)]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {course?.name ?? "Your course"}
            </h2>
            <p className="mt-1.5 text-sm text-[var(--text-muted)]">
              {getScheduleLabel(plan.days_per_week)} · 30 minutes a class
            </p>

            <p className="mt-4 flex items-baseline gap-1.5">
              <span
                className="text-2xl font-bold text-[var(--green-900)]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {price.symbol}
                {price.amount}
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)]">/ Per Month</span>
            </p>
            <p className="mt-1 text-sm text-[var(--text-muted)]">
              {classesPerMonth(plan.days_per_week)} classes a month
            </p>

            <hr className="my-6 border-[var(--border)]" />

            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[var(--text-muted)]">Email</dt>
                <dd className="mt-0.5 font-medium text-[var(--text)]">{student.email}</dd>
              </div>
              {student.phone && (
                <div>
                  <dt className="text-[var(--text-muted)]">Phone</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{student.phone}</dd>
                </div>
              )}
              {student.whatsapp && (
                <div>
                  <dt className="text-[var(--text-muted)]">WhatsApp</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{student.whatsapp}</dd>
                </div>
              )}
              {student.country && (
                <div>
                  <dt className="text-[var(--text-muted)]">Country</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{student.country}</dd>
                </div>
              )}
              {preferredTime && (
                <div>
                  <dt className="text-[var(--text-muted)]">Preferred time</dt>
                  <dd className="mt-0.5 font-medium text-[var(--text)]">{preferredTime}</dd>
                </div>
              )}
            </dl>
          </div>

          <p className="mt-6 text-center text-sm leading-relaxed text-[var(--text-muted)]">
            {ENROLLMENT_NEXT_STEPS[1]} {ENROLLMENT_NEXT_STEPS[2]}
          </p>

          <div className="mt-8">
            <WhatsAppCtaCard
              heading="Questions about your enrollment?"
              description="We usually reply on WhatsApp within minutes."
              buttonLabel="Chat on WhatsApp"
            />
          </div>

          <div className="mt-6 text-center">
            <Button href="/" variant="ghost" size="sm">
              Back to homepage
            </Button>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
