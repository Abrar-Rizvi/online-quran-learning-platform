import type { Metadata } from "next";

/** Canonical origin of the public site (quranclass.us redirects here). */
export const SITE_URL = "https://www.quranclass.us";
export const SITE_NAME = "Adan Online Academy";

/**
 * The social card from app/opengraph-image.tsx. A page that sets its own openGraph or
 * twitter replaces the inherited image, so it has to be listed again explicitly.
 */
export const SITE_OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Adan Online Academy — Live one-to-one online Quran classes",
};

/**
 * Per-page metadata for public pages. Metadata merges shallowly, so a page that
 * leaves out openGraph/twitter would inherit the homepage's og:url and title;
 * this gives every page its own canonical, Open Graph and Twitter fields.
 */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const fullTitle = `${title} | ${SITE_NAME}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title: fullTitle,
      description,
      images: [SITE_OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [SITE_OG_IMAGE] },
  };
}

/** Plain-text description of at most `max` characters, cut at a word boundary. */
export function trimDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[\s,;:.–—-]+$/, "")}…`;
}
