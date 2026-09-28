import Link from "next/link";
import type { BlogPostSummary } from "@/lib/api";
import { formatSiteDate, toIsoDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ArrowIcon } from "./arrow-icon";
import { PostCover } from "./post-cover";

/**
 * A post in a list. The title link is the card's only interactive element and
 * stretches over the whole card (::after), so the card is one link whose name
 * is the post title; "Read article" is visual only. The cover is decorative
 * (alt="") — the title says what the post is.
 */
/**
 * Featured cover on desktop: a fixed 3/2 frame (not the image's own shape,
 * which let a square or tall image blow the card up to full-screen height),
 * capped at 460px and filling the row if the text column is taller.
 */
const FEATURED_COVER = "lg:aspect-[3/2] lg:h-full lg:max-h-[460px]";

export function PostCard({
  post,
  featured = false,
  headingLevel = "h2",
}: {
  post: BlogPostSummary;
  featured?: boolean;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)]",
        "transition-[translate,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        "has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-[var(--focus-ring-color)]",
        // Featured (desktop): image ~55% / text ~45%.
        featured && "lg:grid lg:grid-cols-[minmax(0,55fr)_minmax(0,45fr)]",
      )}
    >
      <PostCover postId={post.id} src={post.cover_image_url} eager={featured} className={featured ? FEATURED_COVER : undefined} />

      <div className={cn("flex flex-1 flex-col gap-3 p-5", featured && "sm:p-6 lg:justify-center lg:px-10 lg:py-8")}>
        {post.published_at && (
          <time dateTime={toIsoDate(post.published_at)} className="text-sm text-[var(--text-muted)] tabular-nums">
            {formatSiteDate(post.published_at)}
          </time>
        )}

        {/* Inline: the global unlayered h2/h3 rules would override Tailwind size/color utilities. */}
        <Heading
          dir="auto"
          className="m-0"
          style={{
            fontFamily: "var(--font-heading)",
            fontSize: featured ? "clamp(1.5rem, 2.5vw, 2rem)" : "1.25rem",
            fontWeight: 600,
            lineHeight: 1.3,
            color: "var(--green-900)",
          }}
        >
          <Link
            href={`/blog/${post.slug}`}
            className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-[var(--green-700)]"
          >
            {post.title}
          </Link>
        </Heading>

        <p dir="auto" className={cn("line-clamp-3 leading-relaxed text-[var(--text-muted)]", featured ? "text-[1.0625rem]" : "text-[0.9375rem]")}>
          {post.excerpt}
        </p>

        {/* Grid cards pin it to the bottom so a row lines up; the featured card keeps it right under the excerpt. */}
        <span
          aria-hidden="true"
          className={cn("inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--green-700)]", featured ? "pt-1" : "mt-auto pt-1")}
        >
          <span className="underline-offset-4 group-hover:underline group-has-[a:focus-visible]:underline">Read article</span>
          <ArrowIcon direction="right" className="motion-safe:group-hover:translate-x-1 motion-safe:group-has-[a:focus-visible]:translate-x-1" />
        </span>
      </div>
    </article>
  );
}
