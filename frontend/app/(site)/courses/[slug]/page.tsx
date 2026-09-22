import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Badge, Button, Container, PageHeader, Reveal } from "@/components/ui";
import { CourseArt } from "@/components/courses/course-art";
import { CheckIcon, PricingGrid } from "@/components/courses/pricing-card";
import { fetchCoursesOrThrow, fetchCourseDetail } from "@/lib/api";
import { COURSE_IMAGES, findCourseBySlug, getCourseArtTone, normalize } from "@/lib/courses";

const WHATS_INCLUDED = [
  "One-to-one live classes",
  "Dedicated teacher",
  "Monthly progress report",
  "Male or female teacher",
] as const;

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

async function resolveCourse(slug: string) {
  const courses = await fetchCoursesOrThrow();
  const match = findCourseBySlug(courses, slug);
  if (!match) return null;
  return fetchCourseDetail(match.id);
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await resolveCourse(slug);
  if (!course) return {};
  return {
    title: course.name,
    description: course.description ?? undefined,
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  const course = await resolveCourse(slug);

  if (!course) notFound();

  const imageSrc = COURSE_IMAGES[normalize(course.name)];
  const plans = course.course_plans.map((plan) => ({
    daysPerWeek: plan.days_per_week,
    fee: parseFloat(plan.fee),
    currency: plan.currency,
  }));

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: course.name },
        ]}
        heading={course.name}
        description={
          course.category
            ? `Live one-to-one classes for ${course.category}.`
            : "Live one-to-one online classes."
        }
      />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <div>
                {course.category && (
                  <Badge variant="green" className="mb-4">
                    {course.category}
                  </Badge>
                )}
                {course.description && (
                  <p className="text-[1.0625rem] leading-relaxed text-[var(--text-muted)]">
                    {course.description}
                  </p>
                )}
              </div>
            </Reveal>

            <Reveal delay={0.06}>
              <div
                className="relative overflow-hidden rounded-[var(--radius-lg)]"
                style={{ aspectRatio: "3/2" }}
              >
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={`${course.name} course`}
                    fill
                    sizes="(min-width: 1024px) 45vw, 90vw"
                    className="object-cover object-center"
                  />
                ) : (
                  <CourseArt
                    courseId={course.id}
                    tone={getCourseArtTone(course.id)}
                    variant="detailed"
                    className="h-full w-full"
                  />
                )}
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      <section className="bg-[var(--surface-alt)] py-16 lg:py-24">
        <Container>
          <Reveal>
            <h2 className="text-center">What&apos;s included</h2>
          </Reveal>

          <Reveal delay={0.06}>
            <ul className="mx-auto mt-8 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
              {WHATS_INCLUDED.map((feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm"
                >
                  <CheckIcon className="size-5 shrink-0 text-[var(--green-500)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </section>

      {plans.length > 0 && (
        <section className="bg-[var(--bg)] py-16 lg:py-24">
          <Container>
            <Reveal>
              <h2 className="text-center">Plans &amp; pricing</h2>
            </Reveal>

            <div className="mt-10">
              <PricingGrid plans={plans} courseSlug={slug} />
            </div>
          </Container>
        </section>
      )}

      <section className="bg-[var(--surface-alt)] py-16 lg:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                href={`/enroll?course=${slug}`}
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
              >
                Enroll now
              </Button>
              <Button
                href="/book-free-trial"
                variant="secondary"
                size="md"
                className="w-full sm:w-auto"
              >
                Book free trial
              </Button>
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
