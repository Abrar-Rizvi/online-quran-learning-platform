import type { Metadata } from "next";
import Link from "next/link";
import { PostMutationsProvider } from "@/components/admin/blog/post-mutations";
import { PostRowActions } from "@/components/admin/blog/post-row-actions";
import { WidgetError, cardClasses } from "@/components/admin/dashboard/widget";
import { PostStatusBadge } from "@/components/admin/status";
import { Pagination } from "@/components/admin/ui/pagination";
import { SearchInput } from "@/components/admin/ui/search-input";
import { TabLinks } from "@/components/admin/ui/tab-links";
import { Button } from "@/components/ui";
import { BLOG_PAGE_SIZE, BLOG_TABS, blogHref, matchesBlogSearch, parseBlogQuery, toBlogRow } from "@/lib/admin-blog";
import { getAdminBlogPosts } from "@/lib/admin-data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog",
};

const clearLinkClass =
  "rounded-[var(--radius-sm)] font-medium text-[var(--green-700)] underline underline-offset-4 hover:text-[var(--green-800)] focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

/** The title link covers the whole row/card (stretched with ::after), so a click anywhere opens the editor. */
const stretchedLink =
  "rounded-[var(--radius-sm)] after:absolute after:inset-0 after:content-[''] hover:underline underline-offset-4 focus-visible:outline-3 focus-visible:outline-[var(--focus-ring-color)] focus-visible:outline-offset-2";

function Message({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-md)] bg-[var(--surface-alt)] px-4 py-10 text-center">
      <p className="font-medium text-[var(--green-900)]">{title}</p>
      {children && <div className="mt-3 text-sm text-[var(--text-muted)]">{children}</div>}
    </div>
  );
}

function NewPostButton({ className }: { className?: string }) {
  return (
    <Button href="/admin/blog/new" size="md" className={cn("h-11", className)}>
      <span aria-hidden="true" className="text-lg leading-none">+</span>
      New post
    </Button>
  );
}

/**
 * One GET /admin/blog (all posts) feeds the tab counts; the status tab
 * (?status), search (?q) and pagination (?page) are applied here on the server.
 */
export default async function AdminBlogPage({ searchParams }: PageProps<"/admin/blog">) {
  const query = parseBlogQuery(await searchParams);
  const posts = await getAdminBlogPosts();

  if (!posts.ok) {
    return <WidgetError title="Blog posts" retryHref={blogHref(query)} />;
  }

  const counts = {
    all: posts.data.length,
    draft: posts.data.filter((p) => p.status === "draft").length,
    published: posts.data.filter((p) => p.status === "published").length,
  };
  const inTab = query.status === "all" ? posts.data : posts.data.filter((p) => p.status === query.status);
  const filtered = inTab.filter((p) => matchesBlogSearch(p, query.q));

  const totalPages = Math.max(1, Math.ceil(filtered.length / BLOG_PAGE_SIZE));
  const page = Math.min(query.page, totalPages);
  const start = (page - 1) * BLOG_PAGE_SIZE;
  const rows = filtered.slice(start, start + BLOG_PAGE_SIZE).map(toBlogRow);

  return (
    <PostMutationsProvider>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <h2 id="posts-heading" tabIndex={-1} className="sr-only">
            Blog posts
          </h2>
          <p className="text-sm text-[var(--text-muted)]">Write articles for the website blog.</p>
          <NewPostButton className="shrink-0" />
        </div>

        <section className={cn(cardClasses, "p-0 sm:p-0")} aria-labelledby="posts-heading">
          <div className="flex flex-col gap-3 border-b border-[var(--border)] p-4 sm:p-5 xl:flex-row xl:items-center xl:justify-between">
            <SearchInput label="Search posts" placeholder="Search title or address" className="w-full xl:max-w-md" />
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <TabLinks
                label="Filter by status"
                items={BLOG_TABS.map((t) => ({
                  label: t.label,
                  count: counts[t.key],
                  current: query.status === t.key,
                  href: blogHref({ status: t.key, q: query.q }),
                }))}
              />
              {filtered.length > 0 && (
                <p className="shrink-0 text-sm text-[var(--text-muted)] tabular-nums" aria-live="polite">
                  Showing {start + 1}–{start + rows.length} of {filtered.length}
                </p>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {posts.data.length === 0 ? (
              <Message title="No posts yet. Write your first article.">
                <NewPostButton />
              </Message>
            ) : rows.length === 0 ? (
              query.q ? (
                <Message title="No posts match your search.">
                  <Link href={blogHref({ status: query.status })} className={clearLinkClass}>
                    Clear search
                  </Link>
                </Message>
              ) : (
                <Message title={query.status === "draft" ? "No drafts." : "No published posts yet."} />
              )
            ) : (
              <>
                {/* Mobile/tablet: stacked cards */}
                <ul className="flex flex-col gap-3 lg:hidden">
                  {rows.map((r) => (
                    <li
                      key={r.id}
                      className="relative rounded-[var(--radius-md)] border border-[var(--border)] p-4 transition-colors duration-150 hover:bg-[var(--bg)] motion-reduce:transition-none"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/admin/blog/${r.id}`} dir="auto" className={cn("min-w-0 font-semibold text-[var(--text)]", stretchedLink)}>
                          {r.title}
                        </Link>
                        <PostStatusBadge status={r.status} className="mt-0.5 shrink-0" />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">/blog/{r.slug}</p>
                      <p className="mt-2 text-sm text-[var(--text-muted)] tabular-nums">
                        {r.published ? `Published ${r.published}` : "Not published"} · Updated {r.updated}
                      </p>
                      <div className="mt-2 flex justify-end">
                        <PostRowActions row={r} menuOnly />
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Desktop/laptop: table */}
                <div className="relative -mx-2 hidden overflow-x-auto lg:block">
                  <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                        <th scope="col" className="px-2 pb-2.5 font-medium">Title</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Status</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Published</th>
                        <th scope="col" className="px-2 pb-2.5 font-medium">Last updated</th>
                        <th scope="col" className="px-2 pb-2.5 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {rows.map((r) => (
                        <tr key={r.id} className="relative transition-colors duration-150 hover:bg-[var(--bg)] motion-reduce:transition-none">
                          <td className="max-w-[28rem] px-2 py-3">
                            <Link href={`/admin/blog/${r.id}`} dir="auto" className={cn("font-medium text-[var(--text)]", stretchedLink)}>
                              {r.title}
                            </Link>
                            <p className="truncate text-xs text-[var(--text-muted)]">/blog/{r.slug}</p>
                          </td>
                          <td className="px-2 py-3">
                            <PostStatusBadge status={r.status} />
                          </td>
                          <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{r.published ?? "—"}</td>
                          <td className="whitespace-nowrap px-2 py-3 text-[var(--text-muted)] tabular-nums">{r.updated}</td>
                          <td className="px-2 py-2">
                            <PostRowActions row={r} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-[var(--border)] p-4 sm:p-5">
              <Pagination page={page} totalPages={totalPages} hrefFor={(p) => blogHref({ ...query, page: p })} />
            </div>
          )}
        </section>
      </div>
    </PostMutationsProvider>
  );
}
