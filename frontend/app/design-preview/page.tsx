// TODO: Remove this route before launch — internal design review only.

import type { Metadata } from "next";
import { DesignPreviewClient } from "./client";

export const metadata: Metadata = {
  robots: "noindex, nofollow",
  title: "Design Preview — Internal",
};

export default function DesignPreviewPage() {
  return <DesignPreviewClient />;
}
