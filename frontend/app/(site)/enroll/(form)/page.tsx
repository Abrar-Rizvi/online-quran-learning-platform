import type { Metadata } from "next";
import { Container, PageHeader, Reveal } from "@/components/ui";
import { WhatsNextPanel } from "@/components/enroll/whats-next-panel";
import { EnrollmentForm } from "@/components/enroll/enrollment-form";
import { findCourseBySlug, findNooraniQaidaCourse, getPublicCourses, LEGACY_QAIDA_SLUG } from "@/lib/courses";
import { getPublicRedirect } from "@/lib/public-redirects";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Enroll",
  description:
    "Enroll in a live one-to-one Quran or Islamic studies course with Adan Online Academy.",
  path: "/enroll",
});

interface EnrollPageProps {
  searchParams: Promise<{ course?: string | string[] }>;
}

export default async function EnrollPage({ searchParams }: EnrollPageProps) {
  const { course } = await searchParams;
  const slug = typeof course === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(course)
    ? course
    : undefined;
  const courses = await getPublicCourses(Boolean(slug));
  let initialCourse = slug ? findCourseBySlug(courses, slug) : undefined;
  if (!initialCourse && slug) {
    const target = await getPublicRedirect(`/courses/${slug}`, true);
    const targetSlug = target?.match(/^\/courses\/([a-z0-9]+(?:-[a-z0-9]+)*)$/)?.[1];
    if (targetSlug) initialCourse = findCourseBySlug(courses, targetSlug);
    if (!initialCourse && slug === LEGACY_QAIDA_SLUG) initialCourse = findNooraniQaidaCourse(courses);
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Enroll" }]}
        heading="Start Your Enrollment"
        description="A Quran academy that meets families where they live, in live one-to-one online classes."
      />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            <Reveal>
              <WhatsNextPanel />
            </Reveal>
            <Reveal delay={0.06}>
              <EnrollmentForm courses={courses} initialCourseId={initialCourse?.id} />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
