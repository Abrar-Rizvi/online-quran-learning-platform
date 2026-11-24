import "server-only";

import { cache } from "react";
import { IMAGE_ALTS_TAG, type ImageAltMap } from "./image-alts";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const getPublicImageAlts = cache(async (): Promise<ImageAltMap> => {
  try {
    const response = await fetch(`${API_URL}/image-alts`, {
      next: { tags: [IMAGE_ALTS_TAG], revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    });
    if (response.ok) {
      const value: unknown = await response.json();
      if (value && typeof value === "object" && !Array.isArray(value)) return value as ImageAltMap;
    }
  } catch {
    // Image markup still renders with its code defaults if the API is unavailable.
  }
  return {};
});
