"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface Testimonial {
  name: string;
  location: string;
  quote: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

const SWIPE_THRESHOLD_PX = 40;

/** Decorative "positive review" signal (Lucide Star, filled) — not a rating; every card shows the same 5. */
function StarRow() {
  return (
    <div className="mb-4 flex justify-center gap-0.5 text-[var(--gold-500)]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((n) => (
        <svg
          key={n}
          className="size-[18px]"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

/**
 * One testimonial at a time, dot pagination, swipe + arrow-key support.
 * All quotes share one grid cell so the container is always as tall as the longest quote (no layout jump).
 */
export function TestimonialCarousel({ testimonials }: { testimonials: readonly Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const pointerStartX = useRef<number | null>(null);
  const count = testimonials.length;

  const go = (next: number) => setIndex((next + count) % count);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="Student and parent testimonials"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      onPointerDown={(e) => {
        pointerStartX.current = e.clientX;
      }}
      onPointerUp={(e) => {
        if (pointerStartX.current === null) return;
        const delta = e.clientX - pointerStartX.current;
        pointerStartX.current = null;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) go(delta < 0 ? index + 1 : index - 1);
      }}
      onPointerCancel={() => {
        pointerStartX.current = null;
      }}
      className="mx-auto max-w-3xl touch-pan-y rounded-[var(--radius-lg)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-4"
    >
      <div className="grid">
        {testimonials.map((t, i) => {
          const active = i === index;
          return (
            <figure
              key={t.name}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={cn(
                "col-start-1 row-start-1 flex flex-col items-center text-center transition-opacity duration-300 motion-reduce:transition-none",
                active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
            >
              <StarRow />
              <blockquote className="text-[1.0625rem] leading-[1.7] text-[var(--text)] sm:text-lg">
                <p>&ldquo;{t.quote}&rdquo;</p>
              </blockquote>
              <figcaption className="mt-6 flex flex-col items-center gap-3">
                <span
                  className="flex size-14 items-center justify-center rounded-full bg-[var(--green-700)] text-lg font-bold text-white"
                  style={{ fontFamily: "var(--font-heading)" }}
                  aria-hidden="true"
                >
                  {initials(t.name)}
                </span>
                <span>
                  <span
                    className="block text-lg font-bold text-[var(--green-900)]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {t.name}
                  </span>
                  <span className="block text-sm text-[var(--text-muted)]">{t.location}</span>
                </span>
              </figcaption>
            </figure>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center gap-1">
        {testimonials.map((t, i) => (
          <button
            key={t.name}
            type="button"
            onClick={() => setIndex(i)}
            aria-label={`Show testimonial ${i + 1} of ${count}, ${t.name}`}
            aria-current={i === index}
            className="flex size-8 items-center justify-center rounded-full focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2"
          >
            <span
              className={cn(
                "block h-2.5 rounded-full transition-[width,background-color] duration-150 motion-reduce:transition-none",
                i === index ? "w-6 bg-[var(--green-700)]" : "w-2.5 bg-[var(--green-700)]/30",
              )}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
