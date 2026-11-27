import { fetchCoursesOrThrow, type CourseListItem } from "@/lib/api";
import { COURSE_IMAGE_FILES } from "@/lib/course-images.generated";
import courseImageOverrides from "@/lib/course-image-overrides.json";

export const NOORANI_QAIDA_SLUG = "noorani-qaida-course";
export const LEGACY_QAIDA_SLUG = "qaida-for-beginners";

/** Legacy local overrides keyed by course slug. Also used by the backfill script. */
const COURSE_IMAGES: ReadonlyMap<string, string> = new Map(Object.entries(courseImageOverrides));

export function findCourseBySlug(
  courses: CourseListItem[],
  slug: string,
): CourseListItem | undefined {
  return courses.find((course) => course.slug === slug);
}

export function findNooraniQaidaCourse(courses: CourseListItem[]): CourseListItem | undefined {
  return findCourseBySlug(courses, NOORANI_QAIDA_SLUG) ?? findCourseBySlug(courses, LEGACY_QAIDA_SLUG);
}

export const COURSE_IMAGE_DIR = "/images/courses/";

/** Image files keyed by normalized basename; the first file (sorted) wins on a duplicate key. */
const COURSE_IMAGES_BY_KEY: ReadonlyMap<string, string> = (() => {
  const byKey = new Map<string, string>();
  for (const file of COURSE_IMAGE_FILES) {
    const key = file.replace(/\.[^.]+$/, "").trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    // Filenames may contain spaces, "&", "'" etc.: encode so the URL is always valid.
    if (key && !byKey.has(key)) byKey.set(key, COURSE_IMAGE_DIR + encodeURIComponent(file));
  }
  return byKey;
})();

/**
 * Use the saved path first, then the legacy override or filename match by slug.
 * Undefined uses the artwork fallback.
 */
export function getCourseImage({ slug, image_path }: Pick<CourseListItem, "slug" | "image_path">): string | undefined {
  if (image_path) return image_path;
  const imageSlug = slug === LEGACY_QAIDA_SLUG ? NOORANI_QAIDA_SLUG : slug;
  return COURSE_IMAGES.get(imageSlug) ?? COURSE_IMAGES_BY_KEY.get(slug);
}

export type CourseArtTone = "green" | "gold";

/** Deterministic (not list-position-dependent) tint for a course's fallback art tile. */
export function getCourseArtTone(courseId: number): CourseArtTone {
  return courseId % 2 === 0 ? "gold" : "green";
}

/** Substring each category key looks for (case-insensitively) in a course's real `category` string. */
const CATEGORY_MATCHERS = {
  children: "child",
  adults: "adult",
  females: "female",
  language: "language",
  short: "short",
} as const;

type MatcherKey = keyof typeof CATEGORY_MATCHERS;

/** Keys a public `?category=` link or chip may use. "short" is not one: short courses are hidden from the public site. */
const PUBLIC_CATEGORY_KEYS = ["children", "adults", "females", "language"] as const satisfies readonly MatcherKey[];

export type CategoryKey = "all" | (typeof PUBLIC_CATEGORY_KEYS)[number];

/** Narrows a raw `?category=` value to a public filter key; anything else (including old `?category=short` links) falls back to "all". */
export function toCategoryKey(value: string | null | undefined): CategoryKey {
  const key = value?.trim().toLowerCase() ?? "";
  return (PUBLIC_CATEGORY_KEYS as readonly string[]).includes(key) ? (key as CategoryKey) : "all";
}

/** The one contains-match: does a course's category include this key's substring? A null/empty category never does. */
function categoryContains(courseCategory: string | null, key: MatcherKey): boolean {
  if (!courseCategory) return false;
  return courseCategory.toLowerCase().includes(CATEGORY_MATCHERS[key]);
}

/**
 * The one category-filter rule, shared by the navbar dropdown links (via `?category=`) and the
 * catalog chips: a case-insensitive "contains" match on the course's category. "all" (or any
 * unknown key) matches everything; a null/empty category only ever matches "all".
 */
export function matchesCategory(courseCategory: string | null, filterKey: string): boolean {
  const key = toCategoryKey(filterKey);
  if (key === "all") return true;
  return categoryContains(courseCategory, key);
}

/**
 * Whether a course may appear anywhere on the public site. Short courses (category containing
 * "short", e.g. "Short Courses") stay in the database and the admin panel but are hidden here.
 */
export function isPublicCourse(course: Pick<CourseListItem, "category">): boolean {
  return !categoryContains(course.category, "short");
}

/** GET /courses without the courses hidden from the public site. Throws on failure, like fetchCoursesOrThrow. */
export async function getPublicCourses(fresh = false): Promise<CourseListItem[]> {
  return (await fetchCoursesOrThrow(fresh)).filter(isPublicCourse);
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
