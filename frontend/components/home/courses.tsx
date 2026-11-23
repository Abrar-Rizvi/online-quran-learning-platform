import Link from "next/link";
import { Container, Reveal } from "@/components/ui";
import { CourseCard } from "@/components/courses/course-card";
import type { CourseListItem } from "@/lib/api";
import { findCourseBySlug, findNooraniQaidaCourse, getPublicCourses, NOORANI_QAIDA_SLUG } from "@/lib/courses";

/**
 * Fixed set of courses to feature on the homepage, in display order.
 * Resolved by stored slug against the live course catalog.
 */
const TARGET_COURSE_SLUGS = [
  NOORANI_QAIDA_SLUG,
  "quran-recitation",
  "quran-memorization",
] as const;

function ArrowRightIcon({ className }: { className?: string }) {
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
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export async function Courses() {
  // Empty on failure (as before): the section simply hides instead of breaking the homepage.
  const courses = await getPublicCourses().catch(() => []);

  const matched = TARGET_COURSE_SLUGS.map((slug) =>
    // TODO: Remove the legacy Qaida lookup once the production rename is complete.
    slug === NOORANI_QAIDA_SLUG ? findNooraniQaidaCourse(courses) : findCourseBySlug(courses, slug),
  ).filter((c): c is CourseListItem => Boolean(c));

  if (matched.length === 0) return null;

  const headingId = "courses-heading";

  return (
    <section aria-labelledby={headingId} className="bg-[var(--surface-alt)] py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-[0.78rem] font-bold uppercase tracking-[0.12em] text-[var(--gold-700)]">
            Explore Our Programs
          </p>
          <h2 id={headingId} className="mt-4">
            Our Courses
          </h2>
          <p className="mt-4 text-[var(--text-muted)] leading-relaxed">
            Start with the courses most of our students begin their journey with.
          </p>
        </div>

        <ul
          className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 [&>li:nth-child(3)]:sm:col-span-2 [&>li:nth-child(3)]:sm:mx-auto [&>li:nth-child(3)]:sm:max-w-[calc(50%-0.75rem)] lg:[&>li:nth-child(3)]:col-span-1 lg:[&>li:nth-child(3)]:mx-0 lg:[&>li:nth-child(3)]:max-w-none"
        >
          {matched.map((course, i) => (
            <li key={course.id}>
              <Reveal staggerIndex={i} className="h-full">
                <CourseCard course={course} />
              </Reveal>
            </li>
          ))}
        </ul>

        <div className="mt-8 text-center lg:mt-10">
          <Link
            href="/courses"
            className="group inline-flex items-center gap-2 rounded-[var(--radius-sm)] font-semibold text-[var(--link-color)] transition-colors hover:text-[var(--link-hover-color)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
          >
            View all courses
            <ArrowRightIcon className="size-4 transition-transform duration-150 group-hover:translate-x-1" />
          </Link>
        </div>
      </Container>
    </section>
  );
}
