import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://quranclass.us"),
  title: "QuranClass — Online Quran Learning Platform",
  description:
    "QuranClass is an online Quran learning platform serving students worldwide. Our website is under construction — exciting things are coming soon!",
  openGraph: {
    title: "QuranClass — Online Quran Learning Platform",
    description:
      "We are building an online Quran learning platform to serve students worldwide. Exciting things are coming soon!",
    url: "https://quranclass.us",
    siteName: "QuranClass",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
