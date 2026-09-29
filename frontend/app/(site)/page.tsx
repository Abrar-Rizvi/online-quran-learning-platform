import type { Metadata } from "next";
import { Hero } from "@/components/home/hero";
import { About } from "@/components/home/about";
import { Courses } from "@/components/home/courses";
import { Fees } from "@/components/home/fees";
import { HowItWorks } from "@/components/home/how-it-works";
import { AcademyHighlights } from "@/components/home/academy-highlights";
import { FinalCta } from "@/components/home/final-cta";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Hero />
      <About />
      <Courses />
      <Fees />
      <HowItWorks />
      <AcademyHighlights />
      <FinalCta />
    </>
  );
}
