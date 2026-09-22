import type { Metadata } from "next";
import { El_Messiri, Source_Sans_3, Amiri } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const elMessiri = El_Messiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-heading",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-body",
});

const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  variable: "--font-arabic",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quranclass.us"),
  title: {
    template: "%s | Adan Online Academy",
    default: "Adan Online Academy — Online Quran Classes",
  },
  description:
    "Live one-to-one online Quran classes for children and adults. Learn Quran reading, Tajweed, memorization, and Arabic with qualified teachers.",
  openGraph: {
    title: "Adan Online Academy — Online Quran Classes",
    description:
      "Live one-to-one online Quran classes for children and adults. Learn Quran reading, Tajweed, memorization, and Arabic with qualified teachers.",
    url: "https://quranclass.us",
    siteName: "Adan Online Academy",
    type: "website",
  },
  other: {
    "theme-color": "#0F5C45",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${elMessiri.variable} ${sourceSans.variable} ${amiri.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
