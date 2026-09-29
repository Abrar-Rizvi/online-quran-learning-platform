import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { Badge, Button, Container, PageHeader, Reveal } from "@/components/ui";
import { CourseArt } from "@/components/courses/course-art";
import { CheckIcon, PricingGrid } from "@/components/courses/pricing-card";
import { fetchCourseDetail } from "@/lib/api";
import {
  findCourseBySlug,
  getCourseArtTone,
  getCourseImage,
  getPublicCourses,
  isPublicCourse,
} from "@/lib/courses";
import { pageMetadata, trimDescription } from "@/lib/seo";

const WHATS_INCLUDED = [
  "One-to-one live classes",
  "Dedicated teacher",
  "Monthly progress report",
  "Male or female teacher",
] as const;

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

/** Hidden (short) courses resolve to null, exactly like an unknown slug: the page 404s and gets no metadata. */
async function resolveCourse(slug: string) {
  const courses = await getPublicCourses();
  const match = findCourseBySlug(courses, slug);
  if (!match) return null;
  const course = await fetchCourseDetail(match.id);
  return course && isPublicCourse(course) ? course : null;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await resolveCourse(slug);
  if (!course) return {};
  const description = course.description
    ? trimDescription(course.description)
    : `Live one-to-one online ${course.name} classes with Adan Online Academy.`;
  const metadata = pageMetadata({ title: course.name, description, path: `/courses/${slug}` });
  const imageSrc = getCourseImage(course.name);
  if (!imageSrc) return metadata;
  // The optimizer's 1200px version, not the raw file: some course photos exceed X's 5 MB card limit.
  const images = [{ url: `/_next/image?url=${encodeURIComponent(imageSrc)}&w=1200&q=75`, alt: `${course.name} course` }];
  return {
    ...metadata,
    openGraph: { ...metadata.openGraph, images },
    twitter: { ...metadata.twitter, images },
  };
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { slug } = await params;
  const course = await resolveCourse(slug);

  if (!course) notFound();

  const imageSrc = getCourseImage(course.name);
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
            {/* Image first in the DOM so it stacks above the text on mobile; lg:order keeps it on the right. */}
            <Reveal delay={0.06} className="lg:order-2">
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
                    preload
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

            <Reveal className="lg:order-1">
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
