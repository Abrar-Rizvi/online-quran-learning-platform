import { Container } from "@/components/ui";
import { CourseGridSkeleton } from "@/components/courses/course-skeleton";

export default function CoursesLoading() {
  return (
    <section className="bg-[var(--bg)] py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto h-4 w-32 animate-pulse rounded bg-[var(--surface-alt)]" />
          <div className="mx-auto mt-4 h-10 w-64 animate-pulse rounded bg-[var(--surface-alt)]" />
          <div className="mx-auto mt-4 h-4 w-80 animate-pulse rounded bg-[var(--surface-alt)]" />
        </div>

        <div className="mx-auto mt-8 h-12 max-w-md animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-alt)]" />

        <div className="mt-10">
          <CourseGridSkeleton />
        </div>
      </Container>
    </section>
  );
}
