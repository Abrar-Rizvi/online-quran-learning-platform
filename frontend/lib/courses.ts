import type { CourseListItem } from "@/lib/api";

/** Local image per course, keyed by normalized course name (API has no image field). */
export const COURSE_IMAGES: Record<string, string> = {
  "qaida for beginners": "/images/courses/qaida.png",
  "quran recitation": "/images/courses/quran.png",
  "quran memorization": "/images/courses/memorization.jpg",
};

export function normalize(name: string): string {
  return name.trim().toLowerCase();
}

export function toSlug(name: string): string {
  return normalize(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Finds the course whose slug matches, using the same toSlug() as every link that builds /courses/{slug}. */
export function findCourseBySlug(
  courses: CourseListItem[],
  slug: string,
): CourseListItem | undefined {
  return courses.find((course) => toSlug(course.name) === slug);
}

export type CourseArtTone = "green" | "gold";

/** Deterministic (not list-position-dependent) tint for a course's fallback art tile. */
export function getCourseArtTone(courseId: number): CourseArtTone {
  return courseId % 2 === 0 ? "gold" : "green";
}

/** Substring each category filter key looks for (case-insensitively) in a course's real `category` string. */
const CATEGORY_MATCHERS = {
  children: "child",
  adults: "adult",
  females: "female",
  language: "language",
  short: "short",
} as const;

export type CategoryKey = "all" | keyof typeof CATEGORY_MATCHERS;

/** Narrows a raw `?category=` value to a known filter key; anything unrecognized falls back to "all". */
export function toCategoryKey(value: string | null | undefined): CategoryKey {
  const key = value?.trim().toLowerCase() ?? "";
  return Object.hasOwn(CATEGORY_MATCHERS, key) ? (key as CategoryKey) : "all";
}

/**
 * The one category-filter rule, shared by the navbar dropdown links (via `?category=`) and the
 * catalog chips: a case-insensitive "contains" match on the course's category. "all" (or any
 * unknown key) matches everything; a null/empty category only ever matches "all".
 */
export function matchesCategory(courseCategory: string | null, filterKey: string): boolean {
  const key = toCategoryKey(filterKey);
  if (key === "all") return true;
  if (!courseCategory) return false;
  return courseCategory.toLowerCase().includes(CATEGORY_MATCHERS[key]);
}

/** Classes per month for a plan: a flat `days_per_week × 4` (the one formula used everywhere it's displayed). */
export function classesPerMonth(daysPerWeek: number): number {
  return daysPerWeek * 4;
}

/** DRAFT copy per plan (by days_per_week), pending academy confirmation. Unlisted plans get a generic name and no copy. */
const PLAN_COPY: Record<number, { name: string; subtitle: string; description: string }> = {
  2: {
    name: "Weekend",
    subtitle: "Great for busy weekends",
    description: "A light, flexible option for families who prefer weekend-only sessions.",
  },
  3: {
    name: "3 Days a Week",
    subtitle: "Steady weekly progress",
    description: "A balanced schedule for consistent, manageable progress.",
  },
  5: {
    name: "5 Days a Week",
    subtitle: "Best value, fastest progress",
    description: "Our most popular plan for students who want faster, consistent progress.",
  },
};

export function getPlanCopy(daysPerWeek: number) {
  return (
    PLAN_COPY[daysPerWeek] ?? {
      name: `${daysPerWeek} Days a Week`,
      subtitle: null,
      description: null,
    }
  );
}

/** "Saturdays & Sundays" for the 2-day Weekend plan (the only 2-day plan today); otherwise "N days a week". */
export function getScheduleLabel(daysPerWeek: number): string {
  return daysPerWeek === 2 ? "Saturdays & Sundays" : `${daysPerWeek} days a week`;
}

export function getPlanCtaLabel(daysPerWeek: number): string {
  return daysPerWeek === 2 ? "Choose Weekend" : `Choose ${daysPerWeek} days a week`;
}
