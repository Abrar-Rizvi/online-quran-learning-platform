import type { Metadata } from "next";

/**
 * Root of the whole /admin area (login + panel). Deliberately outside the
 * (site) group, so there is no public Navbar, Footer or chat launcher here.
 */
export const metadata: Metadata = {
  title: {
    template: "%s · Admin",
    default: "Admin",
  },
  robots: "noindex, nofollow",
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex flex-1 flex-col bg-[var(--bg)]">{children}</div>;
}
