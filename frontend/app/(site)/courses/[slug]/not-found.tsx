import { Button, Container, PageHeader } from "@/components/ui";

export default function CourseNotFound() {
  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Courses", href: "/courses" },
          { label: "Not found" },
        ]}
        heading="Course Not Found"
        description="We couldn't find a course at this address — browse the full catalog instead."
      />

      <section className="bg-[var(--bg)] py-24">
        <Container>
          <div className="mx-auto max-w-md text-center">
            <p className="text-[var(--text-muted)] leading-relaxed">
              It may have been renamed or removed.
            </p>
            <Button href="/courses" variant="primary" size="md" className="mt-8">
              Browse all courses
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
