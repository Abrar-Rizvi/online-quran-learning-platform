import { cn } from "@/lib/utils";

/**
 * Arrow for the blog's text links, drawn as its own inline SVG so the link
 * text can be underlined without the underline running under the arrow.
 * Same motion as the site's other arrow links (homepage "View all courses"):
 * 150ms (duration.fast) with the easeOut token, nudged 4px on the parent
 * `group`'s hover/focus. The caller passes the trigger classes, e.g.
 * `motion-safe:group-hover:translate-x-1`; with reduced motion it stays put.
 */
export function ArrowIcon({ direction, className }: { direction: "left" | "right"; className?: string }) {
  return (
    <svg
      className={cn(
        "size-4 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
        className,
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === "right" ? (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      ) : (
        <>
          <path d="M19 12H5" />
          <path d="m11 6-6 6 6 6" />
        </>
      )}
    </svg>
  );
}
