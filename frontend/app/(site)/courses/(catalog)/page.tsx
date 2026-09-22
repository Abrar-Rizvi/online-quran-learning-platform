import { Suspense } from "react";
import type { Metadata } from "next";
import { Container, PageHeader } from "@/components/ui";
import { CourseGridSkeleton } from "@/components/courses/course-skeleton";
import { CourseCatalog } from "@/components/courses/course-catalog";
import { fetchCoursesOrThrow } from "@/lib/api";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse every live one-to-one Quran and Islamic studies course offered by Adan Online Academy.",
};

export default async function CoursesPage() {
  const courses = await fetchCoursesOrThrow();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Courses" }]}
        heading="Our Courses"
        description="Explore live one-to-one Quran and Islamic studies classes for every age and level."
      />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          {/* useSearchParams (the ?category= filter) needs a Suspense boundary. */}
          <Suspense fallback={<CourseGridSkeleton count={3} />}>
            <CourseCatalog initialCourses={courses} />
          </Suspense>
        </Container>
      </section>
    </>
  );
}
