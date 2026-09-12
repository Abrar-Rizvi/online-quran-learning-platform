import type { Metadata } from "next";
import QuranHeroTwo from "@/components/hero/QuranHeroTwo";

export const metadata: Metadata = {
  title: "Design Preview Two — Adan Academy Hero Concept",
  description:
    "Second design exploration: an emotional, child-first Quran-learning hero on a dark-green premium background.",
};

export default function DesignTemplateTwoPage() {
  return <QuranHeroTwo />;
}
