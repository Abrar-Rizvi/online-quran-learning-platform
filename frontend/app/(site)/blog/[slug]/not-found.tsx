import { Button, Container, PageHeader } from "@/components/ui";

/** Missing or unpublished article — rendered with a real 404 status (see page.tsx). */
export default function ArticleNotFound() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Blog", href: "/blog" },
          { label: "Not found" },
        ]}
        heading="Article Not Found"
        description="We couldn't find an article at this address."
      />

      <section className="bg-[var(--bg)] py-24">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <p className="text-[var(--text-muted)] leading-relaxed">It may have been moved or taken down.</p>
            <Button href="/blog" variant="primary" size="md" className="mt-8">
              Browse all articles
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
