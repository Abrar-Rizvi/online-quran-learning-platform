import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BlogCta } from "@/components/blog/blog-cta";
import { PostCard } from "@/components/blog/post-card";
import { ArrowIcon } from "@/components/blog/arrow-icon";
import { ArticleCover } from "@/components/blog/post-cover";
import { MarkdownContent } from "@/components/markdown/markdown-content";
import { Container, PageHeader, Reveal } from "@/components/ui";
import { fetchBlogPost, fetchBlogPosts } from "@/lib/api";
import { countWords, readingMinutes } from "@/lib/blog-rules";
import { formatSiteDate, parseApiDate, toIsoDate } from "@/lib/dates";

type Params = Promise<{ slug: string }>;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Same origin as metadataBase in app/layout.tsx (JSON-LD needs absolute URLs). */
const SITE_URL = "https://quranclass.us";

// generateMetadata and the page share one request per render.
const getPost = cache(fetchBlogPost);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const res = await getPost((await params).slug);
  if (!res.ok) {
    return res.notFound ? { title: "Article not found" } : { title: "Blog", robots: { index: false, follow: true } };
  }
  const post = res.data;
  const url = `/blog/${post.slug}`;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.excerpt,
      siteName: "Adan Online Academy",
      publishedTime: post.published_at ? toIsoDate(post.published_at) : undefined,
      modifiedTime: toIsoDate(post.updated_at),
      images: post.cover_image_url ? [{ url: post.cover_image_url, alt: post.title }] : undefined,
    },
  };
}

/** JSON-LD inside <script>: escape "<" so content can never close the tag. */
function jsonLd(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

const backLinkClasses =
  "group inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

/** "← Back to all articles": only the text is underlined; the arrow slides left on hover/focus. */
function BackToArticles() {
  return (
    <Link href="/blog" className={backLinkClasses}>
      <ArrowIcon direction="left" className="motion-safe:group-hover:-translate-x-1 motion-safe:group-focus-visible:-translate-x-1" />
      <span className="underline-offset-4 group-hover:underline group-focus-visible:underline">Back to all articles</span>
    </Link>
  );
}

export default async function BlogArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const res = await getPost(slug);

  if (!res.ok && res.notFound) notFound();

  if (!res.ok) {
    return (
      <>
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: "Article" }]}
          heading="We couldn't load this article"
          description="Something went wrong on our side. Please refresh the page or try again in a few minutes."
        />
        <section className="bg-[var(--bg)] py-16 lg:py-24">
          <Container>
            <div className="mx-auto max-w-md text-center">
              <BackToArticles />
            </div>
          </Container>
        </section>
      </>
    );
  }

  const post = res.data;
  const minutes = readingMinutes(countWords(post.content));
  const published = post.published_at ? formatSiteDate(post.published_at) : null;
  const updatedLater =
    post.published_at && parseApiDate(post.updated_at).getTime() - parseApiDate(post.published_at).getTime() > DAY_MS;
  const meta = [
    published,
    minutes > 0 ? `${minutes} min read` : null,
    updatedLater ? `Updated ${formatSiteDate(post.updated_at)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  // "More articles": the latest posts except this one. If this fails, the section is simply left out.
  const latest = await fetchBlogPosts({ limit: 4, offset: 0 });
  const more = latest.ok ? latest.data.items.filter((p) => p.slug !== post.slug).slice(0, 3) : [];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.published_at ? toIsoDate(post.published_at) : undefined,
    dateModified: toIsoDate(post.updated_at),
    image: post.cover_image_url ?? undefined,
    author: { "@type": "Organization", name: "Adan Online Academy" },
    publisher: { "@type": "Organization", name: "Adan Online Academy" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/blog/${post.slug}` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }} />

      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog", href: "/blog" }, { label: post.title }]}
        heading={post.title}
        description={meta}
      />

      <section className="bg-[var(--bg)] py-12 lg:py-16">
        <Container>
          <article className="mx-auto max-w-[720px]">
            {post.cover_image_url && <ArticleCover src={post.cover_image_url} alt={post.title} />}
            <MarkdownContent className="md-prose-full">{post.content}</MarkdownContent>
          </article>

          <div className="mx-auto mt-14 max-w-[720px]">
            <Reveal>
              <BlogCta />
            </Reveal>
          </div>
        </Container>
      </section>

      {more.length > 0 && (
        <section aria-labelledby="more-articles-heading" className="bg-[var(--surface-alt)] py-16 lg:py-24">
          <Container>
            <Reveal>
              <h2 id="more-articles-heading" className="text-center">
                More articles
              </h2>
            </Reveal>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p, i) => (
                <li key={p.id}>
                  <Reveal staggerIndex={i} className="h-full">
                    <PostCard post={p} headingLevel="h3" />
                  </Reveal>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <div className="bg-[var(--bg)] py-10">
        <Container className="text-center">
          <BackToArticles />
        </Container>
      </div>
    </>
  );
}
