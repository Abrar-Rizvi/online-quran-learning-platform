import { IslamicPattern } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { CourseArtTone } from "@/lib/courses";

interface CourseArtProps {
  /** Course id — used to build a page-unique SVG pattern id. */
  courseId: number;
  tone?: CourseArtTone;
  /** "detailed" (larger circle + corner ticks) for bigger header-sized art; "default" for card thumbnails. */
  variant?: "default" | "detailed";
  className?: string;
}

const TONE_STYLES: Record<CourseArtTone, { bg: string; color: string }> = {
  green: { bg: "var(--green-50)", color: "var(--green-700)" },
  gold: { bg: "var(--gold-50)", color: "var(--gold-600)" },
};

/**
 * Decorative fallback tile for courses with no local photo — a subtle khatam-style
 * geometric line pattern tinted green or gold, instead of a blank box or a stock photo.
 */
export function CourseArt({
  courseId,
  tone = "green",
  variant = "default",
  className,
}: CourseArtProps) {
  const { bg, color } = TONE_STYLES[tone];

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: bg }}
      aria-hidden="true"
    >
      <IslamicPattern
        className="absolute inset-0"
        color={color}
        opacity={0.4}
        variant={variant}
        patternId={`course-art-${courseId}`}
      />
    </div>
  );
}
