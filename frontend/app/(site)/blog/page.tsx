import type { Metadata } from "next";
import Link from "next/link";
import { ArrowIcon } from "@/components/blog/arrow-icon";
import { PostCard } from "@/components/blog/post-card";
import { Button, Container, PageHeader, Reveal } from "@/components/ui";
import { fetchBlogPosts, type BlogPostPage } from "@/lib/api";
import { cn } from "@/lib/utils";

const DESCRIPTION = "Articles on Quran learning, Tajweed, and raising children with the Quran.";
const PAGE_SIZE = 9;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** Positive whole number from ?page, else 1. */
function requestedPage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && /^\d{1,6}$/.test(value) && Number(value) > 0 ? Number(value) : 1;
}

/**
 * Loads the requested page. A page past the end is served as page 1 (with
 * page 1's canonical), so a stale or mistyped link still shows articles
 * instead of an empty page.
 */
async function loadPage(page: number): Promise<{ page: number; data: BlogPostPage } | null> {
  const res = await fetchBlogPosts({ limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE });
  if (!res.ok) return null;
  if (page > 1 && res.data.items.length === 0) return loadPage(1);
  return { page, data: res.data };
}

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const loaded = await loadPage(requestedPage((await searchParams).page));
  const page = loaded?.page ?? 1;
  const empty = !loaded || loaded.data.total === 0;
  return {
    title: page > 1 ? `Blog — Page ${page}` : "Blog",
    description: DESCRIPTION,
    alternates: { canonical: page > 1 ? `/blog?page=${page}` : "/blog" },
    openGraph: { title: "Blog | Adan Online Academy", description: DESCRIPTION, url: "/blog", type: "website" },
    // Nothing to index yet (or the backend is down): keep the page out of search results.
    ...(empty ? { robots: { index: false, follow: true } } : {}),
  };
}

function MessageCard({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6 text-center sm:p-10">
      {/* Inline: the global unlayered h2 rule would override Tailwind color/size utilities. */}
      <h2
        className="m-0"
        style={{ fontFamily: "var(--font-heading)", fontSize: "1.375rem", fontWeight: 600, lineHeight: 1.25, color: "var(--green-900)" }}
      >
        {title}
      </h2>
      <p className="mt-2 text-[0.9375rem] text-[var(--text-muted)]">{text}</p>
      {children}
    </div>
  );
}

const pageLinkClasses =
  "inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

function BlogPagination({ page, totalPages }: { page: number; totalPages: number }) {
  const href = (p: number) => (p > 1 ? `/blog?page=${p}` : "/blog");
  // Arrow icons sit outside the label text; on an enabled link they slide outward on hover/focus.
  const edge = (target: number, label: string, rel: "prev" | "next", enabled: boolean) => {
    const arrow = (
      <ArrowIcon
        direction={rel === "prev" ? "left" : "right"}
        className={
          !enabled
            ? undefined
            : rel === "prev"
              ? "motion-safe:group-hover:-translate-x-1 motion-safe:group-focus-visible:-translate-x-1"
              : "motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1"
        }
      />
    );
    const content = rel === "prev" ? <>{arrow}<span>{label}</span></> : <><span>{label}</span>{arrow}</>;
    return enabled ? (
      <Link href={href(target)} rel={rel} className={cn(pageLinkClasses, "group gap-1.5 text-[var(--green-800)] hover:bg-[var(--green-50)]")}>
        {content}
      </Link>
    ) : (
      <span aria-disabled="true" className={cn(pageLinkClasses, "gap-1.5 cursor-not-allowed text-[var(--text-muted)] opacity-60")}>
        {content}
      </span>
    );
  };

  return (
    <nav aria-label="Blog pages" className="mt-12 flex items-center justify-between gap-3">
      {edge(page - 1, "Previous", "prev", page > 1)}
      <p className="text-sm text-[var(--text-muted)] tabular-nums">
        Page {page} of {totalPages}
      </p>
      {edge(page + 1, "Next", "next", page < totalPages)}
    </nav>
  );
}

export default async function BlogPage({ searchParams }: { searchParams: SearchParams }) {
  const loaded = await loadPage(requestedPage((await searchParams).page));

  let body: React.ReactNode;
  if (!loaded) {
    body = (
      <Reveal>
        <MessageCard
          title="We couldn't load our articles"
          text="Something went wrong on our side. Please refresh the page or try again in a few minutes."
        >
          <Button href="/courses" variant="secondary" size="md" className="mt-6 w-full sm:w-auto">
            Browse courses
          </Button>
        </MessageCard>
      </Reveal>
    );
  } else if (loaded.data.total === 0) {
    body = (
      <Reveal>
        <MessageCard
          title="Our first articles are on the way."
          text="We're writing about Quran learning and Tajweed. Check back soon, in sha Allah."
        >
          <Button href="/courses" variant="secondary" size="md" className="mt-6 w-full sm:w-auto">
            Browse courses
          </Button>
        </MessageCard>
      </Reveal>
    );
  } else {
    const { page, data } = loaded;
    const [first, ...others] = data.items;
    const featured = page === 1 ? first : null;
    const grid = page === 1 ? others : data.items;
    const totalPages = Math.ceil(data.total / PAGE_SIZE);

    body = (
      <>
        {featured && (
          <Reveal>
            <PostCard post={featured} featured />
          </Reveal>
        )}
        {grid.length > 0 && (
          <ul className={cn("grid gap-6 sm:grid-cols-2 lg:grid-cols-3", featured && "mt-8 lg:mt-10")}>
            {grid.map((post, i) => (
              <li key={post.id}>
                <Reveal staggerIndex={i % 3} className="h-full">
                  <PostCard post={post} />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
        {data.total > PAGE_SIZE && <BlogPagination page={page} totalPages={totalPages} />}
      </>
    );
  }

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Home", href: "/" }, { label: "Blog" }]} heading="Our Blog" description={DESCRIPTION} />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>{body}</Container>
      </section>
    </>
  );
}
