import type { Metadata } from "next";
import { Container, PageHeader, Reveal } from "@/components/ui";
import { WhatsNextPanel } from "@/components/enroll/whats-next-panel";
import { EnrollmentForm } from "@/components/enroll/enrollment-form";
import { getPublicCourses } from "@/lib/courses";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Enroll",
  description:
    "Enroll in a live one-to-one Quran or Islamic studies course with Adan Online Academy.",
  path: "/enroll",
});

interface EnrollPageProps {
  searchParams: Promise<{ course?: string }>;
}

export default async function EnrollPage({ searchParams }: EnrollPageProps) {
  const { course } = await searchParams;
  // Only public courses: a ?course= slug for a hidden course finds no match and is ignored.
  const courses = await getPublicCourses();

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
              <EnrollmentForm courses={courses} initialCourseSlug={course} />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
