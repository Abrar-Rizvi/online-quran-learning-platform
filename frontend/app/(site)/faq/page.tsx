import type { Metadata } from "next";
import { Container, PageHeader, Reveal, WhatsAppCtaCard } from "@/components/ui";
import { FaqAccordion } from "@/components/faq/faq-accordion";
import { FAQ_ITEMS } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about Adan Online Academy's live one-to-one online Quran classes.",
};

export default function FaqPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "FAQ" }]}
        heading="Frequently Asked Questions"
        description="Everything you need to know about our online Quran classes."
      />

      <section className="bg-[var(--bg)] py-16 lg:py-24">
        <Container>
          <div className="mx-auto max-w-3xl">
            <Reveal>
              <FaqAccordion items={FAQ_ITEMS} />
            </Reveal>

            <Reveal>
              <div className="mt-12 lg:mt-16">
                <WhatsAppCtaCard
                  heading="Still have a question?"
                  description="We usually reply on WhatsApp within minutes."
                  buttonLabel="Ask us on WhatsApp"
                />
              </div>
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
