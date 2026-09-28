"use client";

import { useEffect, useRef, useState } from "react";
import { CourseArt } from "@/components/courses/course-art";
import { getCourseArtTone } from "@/lib/courses";
import { cn } from "@/lib/utils";

/**
 * onError for a server-rendered <img> that may have already failed before
 * React hydrated (the error event is then missed): also checks once on mount.
 */
function useImageFailed() {
  const ref = useRef<HTMLImageElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  return { ref, failed, onError: () => setFailed(true) };
}

/**
 * 16/9 cover for a post card: the cover image, or — when there is none or it
 * fails to load — the same khatam art tile courses use without a photo.
 * A plain <img>, not next/image: cover links can point at any host.
 */
export function PostCover({
  postId,
  src,
  className,
  eager = false,
}: {
  postId: number;
  src: string | null;
  className?: string;
  /** The featured card is near the top of the page, so it isn't lazy-loaded. */
  eager?: boolean;
}) {
  const { ref, failed, onError } = useImageFailed();

  if (!src || failed) {
    // Pattern ids only need to be unique per page; blog pages show no course art.
    return <CourseArt courseId={postId} tone={getCourseArtTone(postId)} className={cn("aspect-[16/9] w-full", className)} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt=""
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={onError}
      className={cn("aspect-[16/9] w-full bg-[var(--surface-alt)] object-cover", className)}
    />
  );
}

/** Article-page cover: rounded, alt = post title, simply hidden if the image fails. */
export function ArticleCover({ src, alt }: { src: string; alt: string }) {
  const { ref, failed, onError } = useImageFailed();
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      decoding="async"
      onError={onError}
      className="mb-10 aspect-[16/9] w-full rounded-[var(--radius-lg)] bg-[var(--surface-alt)] object-cover lg:max-h-[480px]"
    />
  );
}
