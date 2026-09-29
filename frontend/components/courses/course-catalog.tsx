"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Reveal } from "@/components/ui";
import { CourseCard } from "./course-card";
import { CourseGridSkeleton } from "./course-skeleton";
import { CourseSearchError, searchCourses, type CourseListItem } from "@/lib/api";
import { isPublicCourse, matchesCategory, toCategoryKey, type CategoryKey } from "@/lib/courses";
import { inputClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

const FILTER_CHIPS: { key: CategoryKey; label: string }[] = [
  { key: "all", label: "All Courses" },
  { key: "children", label: "Children Courses" },
  { key: "adults", label: "Adult Courses" },
  { key: "females", label: "Female Courses" },
];

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

function SearchIcon() {
  return (
    <svg
      className="size-4 text-[var(--text-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

interface CourseCatalogProps {
  initialCourses: CourseListItem[];
}

export function CourseCatalog({ initialCourses }: CourseCatalogProps) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), DEBOUNCE_MS);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  /** The URL is the source of truth, so navbar dropdown links (`?category=`) apply immediately; unknown values fall back to "all". */
  const category = toCategoryKey(searchParams.get("category"));

  function selectCategory(key: CategoryKey) {
    router.replace(key === "all" ? pathname : `${pathname}?category=${key}`, { scroll: false });
  }

  const [searchResults, setSearchResults] = useState<CourseListItem[]>([]);
  const [searchError, setSearchError] = useState<"busy" | "unavailable" | "error" | null>(null);
  /** The query the current searchResults/searchError actually belong to — lets "loading" be derived instead of set. */
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);

  const isSearching = debouncedQuery.length > 0;
  const searchLoading = isSearching && resolvedQuery !== debouncedQuery;

  useEffect(() => {
    if (!isSearching) return;

    const controller = new AbortController();

    searchCourses(debouncedQuery, controller.signal)
      .then((results) => {
        setSearchResults(results.filter(isPublicCourse));
        setSearchError(null);
        setResolvedQuery(debouncedQuery);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        const status = err instanceof CourseSearchError ? err.status : 0;
        setSearchError(status === 429 ? "busy" : status === 503 ? "unavailable" : "error");
        setResolvedQuery(debouncedQuery);
        if (process.env.NODE_ENV === "development") {
          console.warn("[course-catalog] Search failed:", err);
        }
      });

    return () => controller.abort();
  }, [debouncedQuery, isSearching]);

  const searchErrorActive = isSearching && !searchLoading && searchError !== null;

  const displayedCourses = isSearching
    ? searchResults
    : initialCourses.filter((course) => matchesCategory(course.category, category));

  return (
    <div>
      <div className="mx-auto max-w-md">
        <label htmlFor="course-search" className="sr-only">
          Search courses
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center">
            <SearchIcon />
          </span>
          <input
            id="course-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
            placeholder="Search courses — e.g. Tajweed, memorization, Arabic"
            className={cn(inputClasses, "pl-11 pr-4")}
          />
        </div>
      </div>

      {!isSearching && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={() => selectCategory(chip.key)}
              aria-pressed={category === chip.key}
              className={cn(
                "rounded-[var(--radius-full)] border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2",
                category === chip.key
                  ? "border-[var(--green-700)] bg-[var(--green-700)] text-white"
                  : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:border-[var(--green-700)] hover:text-[var(--green-700)]",
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-10">
        {searchLoading && <CourseGridSkeleton count={3} />}

        {searchErrorActive && (
          <p className="mx-auto max-w-md rounded-[var(--radius-md)] border border-[var(--error)] bg-[var(--error-bg)] p-4 text-center text-sm text-[var(--error)]">
            {searchError === "busy"
              ? "Search is busy — please try again in a moment."
              : searchError === "unavailable"
                ? "Search is unavailable right now."
                : "Something went wrong searching courses. Please try again in a moment."}
          </p>
        )}

        {!searchLoading && !searchErrorActive && displayedCourses.length === 0 && (
          <p className="mx-auto max-w-md text-center text-sm text-[var(--text-muted)]">
            {isSearching
              ? `No courses found for "${debouncedQuery}".`
              : "No courses found."}
          </p>
        )}

        {!searchLoading && !searchErrorActive && displayedCourses.length > 0 && (
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {displayedCourses.map((course, i) => (
              <li key={course.id}>
                <Reveal staggerIndex={i % 6} className="h-full">
                  <CourseCard course={course} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
