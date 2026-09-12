import type { Metadata } from "next";
import HeroSection from "@/components/hero-section";

export const metadata: Metadata = {
  title: "Design Preview — UK EdTech Theme",
  description:
    "UK EdTech design preview: brand palette and hero with layered mouse parallax (quranclasses.uk inspired).",
};

const PALETTE: Array<{
  name: string;
  hex: string;
  swatch: string;
}> = [
  { name: "Primary Dark (Navy)", hex: "#0F172A", swatch: "bg-[#0F172A]" },
  { name: "Primary Accent / CTA", hex: "#0D9488", swatch: "bg-[#0D9488]" },
  { name: "Accent Badge (Gold)", hex: "#F59E0B", swatch: "bg-[#F59E0B]" },
  {
    name: "Canvas Background",
    hex: "#F8FAFC",
    swatch: "bg-[#F8FAFC] border border-[#E2E8F0]",
  },
  {
    name: "Card Surface",
    hex: "#FFFFFF",
    swatch: "bg-white border border-[#E2E8F0]",
  },
  { name: "Border Color", hex: "#E2E8F0", swatch: "bg-[#E2E8F0]" },
  { name: "Body Text", hex: "#334155", swatch: "bg-[#334155]" },
];

export default function DesignTemplatePage() {
  return (
    <main className="uk-edtech min-h-screen bg-[#F8FAFC] text-[#334155]">
      <div className="mx-auto max-w-6xl px-4 pt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0D9488]">
          Design Preview System — US EdTech
        </p>
        <h2 className="mt-1 text-2xl font-bold text-[#0F172A]">
          Brand color palette
        </h2>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PALETTE.map((color) => (
            <div
              key={color.hex}
              className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white shadow-sm"
            >
              <div className={`h-14 w-full ${color.swatch}`} />
              <div className="px-3 py-2">
                <p className="text-xs font-semibold text-[#0F172A]">{color.name}</p>
                <p className="text-xs text-[#334155]/60">{color.hex}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12">
        <HeroSection />
      </div>
    </main>
  );
}
