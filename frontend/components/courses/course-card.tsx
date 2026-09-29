import Image from "next/image";
import { Button } from "@/components/ui";
import { CourseArt } from "./course-art";
import { getCourseImage, toSlug, getCourseArtTone } from "@/lib/courses";
import type { CourseListItem } from "@/lib/api";

function CourseImage({ course }: { course: CourseListItem }) {
  const src = getCourseImage(course.name);

  if (!src) {
    return (
      <CourseArt
        courseId={course.id}
        tone={getCourseArtTone(course.id)}
        className="aspect-[3/2] w-full"
      />
    );
  }

  return (
    <div className="relative aspect-[3/2] w-full">
      <Image
        src={src}
        alt={`${course.name} course`}
        fill
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
        className="object-cover object-center"
      />
    </div>
  );
}

export function CourseCard({ course }: { course: CourseListItem }) {
  const slug = toSlug(course.name);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]">
      <CourseImage course={course} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="text-lg font-bold" style={{ fontFamily: "var(--font-body)" }}>
          {course.name}
        </h3>

        {course.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--text-muted)]">
            {course.description}
          </p>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2 sm:flex-row">
          <Button
            href={`/enroll?course=${slug}`}
            variant="primary"
            size="sm"
            className="w-full sm:w-auto"
          >
            Enroll now
          </Button>
          <Button
            href={`/courses/${slug}`}
            variant="secondary"
            size="sm"
            className="w-full sm:w-auto"
          >
            Course details
          </Button>
        </div>
      </div>
    </article>
  );
}
