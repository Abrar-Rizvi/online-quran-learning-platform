import { Button, Container } from "@/components/ui";

export default function ConfirmationNotFound() {
  return (
    <section className="bg-[var(--bg)] py-24">
      <Container>
        <div className="mx-auto max-w-md text-center">
          <h1>We couldn&apos;t find that enrollment</h1>
          <p className="mt-4 text-[var(--text-muted)] leading-relaxed">
            This confirmation link may be incorrect or the enrollment no longer exists.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button href="/enroll" variant="primary" size="md">
              Back to enrollment
            </Button>
            <Button href="/" variant="secondary" size="md">
              Go to homepage
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
