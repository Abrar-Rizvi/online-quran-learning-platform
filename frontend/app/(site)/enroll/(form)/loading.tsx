import { Container } from "@/components/ui";

export default function EnrollLoading() {
  return (
    <section className="bg-[var(--bg)] py-16 lg:py-24">
      <Container>
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
          <div className="h-80 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-alt)]" />
          <div className="h-96 animate-pulse rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-alt)]" />
        </div>
      </Container>
    </section>
  );
}
