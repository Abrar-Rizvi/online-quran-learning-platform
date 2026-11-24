import { SkipLink } from "@/components/layout/skip-link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ChatLauncher } from "@/components/chat/chat-launcher";
import { ImageAltProvider } from "@/components/site-image";
import { getPublicImageAlts } from "@/lib/public-image-alts";

export default async function SiteLayout({ children }: LayoutProps<"/">) {
  return (
    <ImageAltProvider alts={await getPublicImageAlts()}>
      <SkipLink />
      <Navbar />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <Footer />
      <ChatLauncher />
    </ImageAltProvider>
  );
}
