import Image from "next/image";
import type { Metadata } from "next";
import { Container, PageHeader, Reveal } from "@/components/ui";
import { HeaderFeatureTiles } from "@/components/contact/header-feature-tiles";
import { ContactInfo } from "@/components/contact/contact-info";
import { TrialRequestForm } from "@/components/trial/trial-request-form";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with Adan Online Academy — call, email, or register for a free Quran class assessment.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Contact Us" }]}
        heading="Contact Us"
        description="We're here to help you start your Quran learning journey."
      >
        <HeaderFeatureTiles />
      </PageHeader>

      {/* Main section: image + Send Us Email / CTA */}
      <section className="relative bg-[var(--bg)] pt-16 pb-10 lg:pt-24 lg:pb-20">
        {/*
          Wider than the shared Container (1400px vs --container-max 1200px) so the photo can run
          larger; same horizontal gutters. Local to this section — the header and form keep Container.
        */}
        <div className="mx-auto w-full max-w-[1400px] px-[var(--container-px)]">
          <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-2 lg:gap-12">
            {/* Image first in the DOM: stacks above the text on mobile, left column on desktop. */}
            <div>
              <Reveal>
                <div
                  className="relative overflow-hidden rounded-[var(--radius-lg)]"
                  style={{ aspectRatio: "4/3" }}
                >
                  <Image
                    src="/images/contact/contact-photo.png"
                    alt="Smiling Quran teacher in a hijab at her desk, following an online class on her laptop, with Islamic books on the shelves behind her"
                    fill
                    sizes="(min-width: 1400px) 644px, (min-width: 1024px) 46vw, 100vw"
                    className="object-cover object-center"
                  />
                </div>
              </Reveal>
            </div>

            <div>
              <ContactInfo />
            </div>
          </div>
        </div>
      </section>

      {/*
        Footer-join: the form card straddles the light page background and a dark band in the
        Footer's exact bg token (--green-950). The band runs flush to the section's bottom edge and
        <main> sits directly on the Footer, so band + Footer read as one dark area.
        The band's top edge = (section height - bottom padding) x split, i.e. a fixed fraction of
        the card's own height, so the overlap holds whatever height the card's content has.
        --join-split: share of the card on the light background (75% on mobile, 60% from sm up).
        --join-pb:    dark space below the card, before the Footer's own top padding.
      */}
      <section
        id="assessment-form"
        className="relative bg-[var(--bg)] pb-[var(--join-pb)] [--join-pb:1.5rem] [--join-split:0.75] sm:[--join-pb:2rem] sm:[--join-split:0.6] lg:[--join-pb:2.5rem]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 top-[calc((100%-var(--join-pb))*var(--join-split))] bg-[var(--green-950)]"
        />

        <Container className="relative z-10">
          <div className="mx-auto max-w-[760px]">
            <Reveal>
              <TrialRequestForm
                heading="Register for Free Assessment"
                subtext="Tell us a little about yourself and we'll contact you on WhatsApp to schedule a free assessment class."
                submitLabel="Register Now"
                successMessage="Thank you! We'll reach out on WhatsApp shortly to schedule your free assessment."
                layout="grid"
                className="shadow-[var(--shadow-floating),var(--shadow-card-hover)] sm:p-8 lg:p-10"
              />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
