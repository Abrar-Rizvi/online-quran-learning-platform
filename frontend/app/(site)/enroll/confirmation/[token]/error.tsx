"use client";

import { Button, Container } from "@/components/ui";

export default function ConfirmationError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="bg-[var(--bg)] py-24">
      <Container>
        <div className="mx-auto max-w-md text-center">
          <h1>We couldn&apos;t load your confirmation</h1>
          <p className="mt-4 text-[var(--text-muted)] leading-relaxed">
            Something went wrong reaching our server. Please try again in a moment.
          </p>
          <Button onClick={reset} variant="primary" size="md" className="mt-8">
            Try again
          </Button>
        </div>
      </Container>
    </section>
  );
}
