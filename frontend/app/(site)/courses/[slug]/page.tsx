import { notFound } from "next/navigation";
import { SiteImage } from "@/components/site-image";
import type { Metadata } from "next";
import { Badge, Button, Container, PageHeader, Reveal } from "@/components/ui";
import { CourseArt } from "@/components/courses/course-art";
import { CheckIcon, PricingGrid } from "@/components/courses/pricing-card";
import { ReadMore } from "@/components/courses/read-more";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { fetchCourseDetail } from "@/lib/api";
import { getCourseMarkdown } from "@/lib/course-markdown";
import { courseSearchSnippet } from "@/lib/course-seo";
import {
  findCourseBySlug,
  getCourseArtTone,
  getCourseImage,
  getPublicCourses,
  isPublicCourse,
  LEGACY_QAIDA_SLUG,
  NOORANI_QAIDA_SLUG,
} from "@/lib/courses";
import { courseImageAlt } from "@/lib/site-images";
import { resolveImageAlt } from "@/lib/image-alts";
import { getPublicImageAlts } from "@/lib/public-image-alts";
import { pageMetadata } from "@/lib/seo";

const WHATS_INCLUDED = [
  "One-to-one live classes",
  "Dedicated teacher",
  "Monthly progress report",
  "Male or female teacher",
] as const;

const HERO_REVEAL = "[@media(scripting:none)]:opacity-100! [@media(scripting:none)]:transform-none!";

interface CourseDetailPageProps {
  params: Promise<{ slug: string }>;
}

/** Hidden (short) courses resolve to null, exactly like an unknown slug: the page 404s and gets no metadata. */
async function resolveCourse(slug: string) {
  // The redirect cache can see the rename before the catalog cache refreshes.
  const fresh = slug === NOORANI_QAIDA_SLUG || slug === LEGACY_QAIDA_SLUG;
  const courses = await getPublicCourses(fresh);
  const match = findCourseBySlug(courses, slug);
  if (!match) return null;
  const course = await fetchCourseDetail(match.id, fresh);
  return course?.slug === slug && isPublicCourse(course) ? course : null;
}

export async function generateMetadata({
  params,
}: CourseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await resolveCourse(slug);
  if (!course) return {};
  const { customTitle, description } = courseSearchSnippet(course);
  const metadata = pageMetadata({ title: course.name, description, path: `/courses/${course.slug}` });
  if (customTitle) {
    metadata.title = { absolute: customTitle };
    metadata.openGraph = { ...metadata.openGraph, title: customTitle };
    metadata.twitter = { ...metadata.twitter, title: customTitle };
  }
  const imageSrc = getCourseImage(course);
  if (!imageSrc) return metadata;
  // The optimizer's 1200px version, not the raw file: some course photos exceed X's 5 MB card limit.
  const images = [{
    url: `/_next/image?url=${encodeURIComponent(imageSrc)}&w=1200&q=75`,
    alt: resolveImageAlt(imageSrc, courseImageAlt(course.name), await getPublicImageAlts()),
  }];
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

  const imageSrc = getCourseImage(course);
  const { lead, extra, heading } = getCourseMarkdown(course.seo_content ?? "");
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
        headingAs={heading ? "p" : "h1"}
        description={
          course.category
            ? `Live one-to-one classes for ${course.category}.`
            : "Live one-to-one online classes."
        }
      />

      <ReadMore
        extra={extra ? (
          <MarkdownContent className="md-prose-full" h1Offset={heading?.extraOffset}>{extra}</MarkdownContent>
        ) : undefined}
        image={
          // Image first in the DOM so it stacks above the text on mobile.
          <Reveal delay={0.06} className={`lg:order-2 ${HERO_REVEAL}`}>
            <div
              className="relative overflow-hidden rounded-[var(--radius-lg)]"
              style={{ aspectRatio: "3/2" }}
            >
              {imageSrc ? (
                <SiteImage
                  src={imageSrc}
                  alt={courseImageAlt(course.name)}
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
        }
      >
        {(course.category || course.description) && (
          <Reveal className={HERO_REVEAL}>
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
          </Reveal>
        )}
        {lead && (
          <MarkdownContent
            className={course.category || course.description ? "mt-5" : undefined}
            h1Offset={heading?.leadOffset}
          >
            {lead}
          </MarkdownContent>
        )}
      </ReadMore>

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
              <PricingGrid plans={plans} courseSlug={course.slug} />
            </div>
          </Container>
        </section>
      )}

      <section className="bg-[var(--surface-alt)] py-16 lg:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                href={`/enroll?course=${course.slug}`}
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
