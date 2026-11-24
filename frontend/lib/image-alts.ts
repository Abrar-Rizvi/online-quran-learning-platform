import { SITE_URL } from "./seo";

export const IMAGE_ALTS_TAG = "image-alts";
export const IMAGE_ALT_LIMIT = 125;

export interface ImageAlt {
  alt_text: string;
  is_decorative: boolean;
}

export interface AdminImageAlt extends ImageAlt {
  id: number;
  image_path: string;
  created_at: string;
  updated_at: string;
}

export type ImageAltMap = Record<string, ImageAlt>;

const SITE_HOST = new URL(SITE_URL).hostname.replace(/^www\./, "");

/** Match files under /images/ on this site, including same-site absolute blog URLs. */
export function localImagePath(src: string): string | undefined {
  if (!src.startsWith("/images/") && !/^https?:\/\//i.test(src)) return;
  try {
    const url = new URL(src, SITE_URL);
    if (url.hostname.replace(/^www\./, "") !== SITE_HOST || !url.pathname.startsWith("/images/")) return;
    return url.pathname.split("/").map((part) => encodeURIComponent(decodeURIComponent(part))).join("/");
  } catch {
    return;
  }
}

export function resolveImageAlt(src: string, defaultAlt: string, alts: ImageAltMap): string {
  const path = localImagePath(src);
  const value = path && alts[path];
  if (!value) return defaultAlt;
  return value.is_decorative ? "" : value.alt_text;
}
