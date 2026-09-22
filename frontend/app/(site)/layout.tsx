import { SkipLink } from "@/components/layout/skip-link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SkipLink />
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
