import type { Metadata } from "next";
import { Container, PageHeader, Reveal } from "@/components/ui";
import { TrialRequestForm } from "@/components/trial/trial-request-form";

export const metadata: Metadata = {
  title: "Book a Free Trial",
  description:
    "Book a free trial with Adan Online Academy — no card needed. Meet your teacher and find the right Quran course.",
};

export default function BookFreeTrialPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Free Trial" }]}
        heading="Book Your Free Trial"
        description="No card needed — meet your teacher and find the right course, free."
      />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          <Reveal>
            <div className="mx-auto max-w-xl">
              {/* The page header is the only heading; the card starts with its intro line. */}
              <TrialRequestForm heading={null} />
            </div>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
