"use client";

import { ParallaxLayer } from "./ParallaxLayersTwo";
import type { MotionValue } from "framer-motion";

/* ------------------------------------------------------------------ */
/* Small floating educational objects                                  */
/* ------------------------------------------------------------------ */

function MiniQuranSVG({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 80" className={className}>
      <defs>
        <linearGradient id="mq-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4A017" />
          <stop offset="100%" stopColor="#F5E6C8" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#mq-gold)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40 22 C32 14 20 12 12 16 L12 62 C20 58 32 60 40 68 Z" />
        <path d="M40 22 C48 14 60 12 68 16 L68 62 C60 58 48 60 40 68 Z" />
        <path d="M40 24 L40 66" />
        <path d="M24 28 L34 32 M24 40 L34 44" />
        <path d="M56 28 L46 32 M56 40 L46 44" />
      </g>
    </svg>
  );
}

function TabletSVG({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 80" className={className}>
      <rect x="4" y="2" width="52" height="76" rx="10" fill="#1F2933" />
      <rect x="8" y="7" width="44" height="60" rx="4" fill="#FAFAF7" />
      <path d="M14 16 C18 11 24 10 28 13 L30 30 C22 28 15 22 14 16 Z" fill="#0F5132" />
      <path d="M30 14 C36 10 44 11 46 16 C44 22 38 28 30 30 Z" fill="#D4A017" opacity="0.9" />
      <circle cx="30" cy="66" r="3" fill="#F5E6C8" />
    </svg>
  );
}

function BookStackSVG({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 84 64" className={className}>
      <g stroke="#1F2933" strokeWidth="1" strokeLinejoin="round">
        <rect x="8" y="36" width="68" height="14" rx="3" fill="#F5E6C8" />
        <rect x="12" y="22" width="66" height="15" rx="3" fill="#D4A017" opacity="0.85" />
        <rect x="10" y="8" width="62" height="15" rx="3" fill="#198754" />
      </g>
      <path d="M18 34 L22 20 M62 34 L58 20" stroke="#1F2933" strokeWidth="2" opacity="0.35" />
      <path d="M10 36 L74 36" stroke="#1F2933" strokeWidth="1.4" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Main scene — child learning Quran on a laptop                       */
/* ------------------------------------------------------------------ */

function SceneSVG() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 640 500"
      className="h-auto w-full"
      role="img"
    >
      <defs>
        <linearGradient id="screen-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F5E6C8" />
        </linearGradient>
        <radialGradient id="scene-glow" cx="0.5" cy="0.45" r="0.65">
          <stop offset="0%" stopColor="#F5E6C8" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#F5E6C8" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* warm glow behind the scene */}
      <rect x="60" y="60" width="520" height="400" rx="60" fill="url(#scene-glow)" />

      {/* ---- child (behind the desk) ---- */}
      <g>
        {/* shoulders / torso */}
        <path
          d="M452 250 Q450 360 468 402 L532 402 Q550 360 548 250 Q548 208 500 208 Q452 208 452 250 Z"
          fill="#198754"
        />
        <path
          d="M452 300 Q450 360 468 402 L500 402 Q500 300 500 240 Z"
          fill="#13693f"
          opacity="0.5"
        />
        {/* neck */}
        <rect x="490" y="238" width="20" height="26" rx="8" fill="#F2BF92" />
        {/* head */}
        <circle cx="500" cy="196" r="46" fill="#F2BF92" />
        {/* ears */}
        <circle cx="457" cy="198" r="7" fill="#EDB387" />
        <circle cx="543" cy="198" r="7" fill="#EDB387" />
        {/* kufi cap */}
        <path d="M454 184 A46 46 0 0 1 546 184 Q546 162 500 162 Q454 162 454 184 Z" fill="#F5E6C8" />
        <path d="M458 186 Q500 174 542 186" fill="none" stroke="#D4A017" strokeWidth="3" strokeLinecap="round" />
        {/* face */}
        <circle cx="482" cy="196" r="5" fill="#1F2933" />
        <circle cx="518" cy="196" r="5" fill="#1F2933" />
        <circle cx="484" cy="194" r="1.6" fill="#FFF" />
        <circle cx="520" cy="194" r="1.6" fill="#FFF" />
        <circle cx="470" cy="214" r="7" fill="#F2C9A2" />
        <circle cx="530" cy="214" r="7" fill="#F2C9A2" />
        <path d="M488 216 Q500 226 512 216" fill="none" stroke="#C97A4B" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M468 190 Q476 184 486 190 M514 190 Q524 184 532 190" fill="none" stroke="#1F2933" strokeWidth="3" strokeLinecap="round" />
        {/* blush */}
        <ellipse cx="474" cy="212" rx="8" ry="5" fill="#F0A978" opacity="0.7" />
        <ellipse cx="526" cy="212" rx="8" ry="5" fill="#F0A978" opacity="0.7" />
      </g>

      {/* ---- desk apron ---- */}
      <rect x="96" y="400" width="448" height="86" rx="24" fill="#F5E6C8" />
      <rect x="96" y="464" width="448" height="22" rx="11" fill="#DCCDA6" />
      <rect x="96" y="400" width="448" height="6" rx="3" fill="#D4A017" opacity="0.55" />

      {/* ---- child hands resting on the desk top ---- */}
      <g>
        <rect x="442" y="352" width="34" height="64" rx="16" fill="#198754" />
        <rect x="530" y="352" width="34" height="64" rx="16" fill="#198754" />
        <ellipse cx="459" cy="408" rx="14" ry="10" fill="#F2BF92" />
        <ellipse cx="547" cy="408" rx="14" ry="10" fill="#F2BF92" />
      </g>

      {/* ---- laptop on the desk (screen faces viewer + child) ---- */}
      <g>
        {/* base */}
        <rect x="150" y="386" width="220" height="20" rx="9" fill="#151d25" />
        <rect x="180" y="392" width="70" height="4" rx="2" fill="#1F2933" opacity="0.9" />
        <rect x="262" y="392" width="70" height="4" rx="2" fill="#1F2933" opacity="0.6" />
        {/* screen shell */}
        <rect x="156" y="196" width="208" height="198" rx="16" fill="#1F2933" />
        <rect x="164" y="204" width="192" height="182" rx="10" fill="url(#screen-bg)" />
        {/* teacher video pip (1-on-1) */}
        <circle cx="192" cy="222" r="15" fill="#0F5132" />
        <circle cx="192" cy="216" r="6" fill="#F2BF92" />
        <path d="M186 228 a6 6 0 0 1 12 0 Z" fill="#F2BF92" />
        <rect x="214" y="213" width="26" height="4" rx="2" fill="#0F5132" opacity="0.5" />
        <rect x="214" y="221" width="18" height="4" rx="2" fill="#0F5132" opacity="0.3" />
        {/* open Quran on screen */}
        <g transform="translate(260 288)">
          <path d="M-30 -24 C-20 -30 -8 -28 0 -20 L0 26 C-8 18 -20 20 -30 26 Z" fill="#0F5132" />
          <path d="M30 -24 C20 -30 8 -28 0 -20 L0 26 C8 18 20 20 30 26 Z" fill="#D4A017" />
          <path d="M-22 -14 C-14 -18 -6 -16 -2 -10 M-22 -2 C-14 -6 -6 -4 -2 2" stroke="#F5E6C8" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        </g>
        {/* live waveform bars */}
        <g fill="#0F5132" opacity="0.65">
          <rect x="218" y="318" width="4" height="10" rx="2" />
          <rect x="226" y="314" width="4" height="18" rx="2" />
          <rect x="234" y="308" width="4" height="30" rx="2" />
          <rect x="242" y="312" width="4" height="22" rx="2" />
          <rect x="250" y="318" width="4" height="10" rx="2" />
        </g>
        {/* play button */}
        <circle cx="196" cy="342" r="12" fill="#198754" />
        <path d="M191 336 L191 348 L201 342 Z" fill="#FAFAF7" />
        {/* glare */}
        <path d="M176 210 L260 210 L180 300 Z" fill="#FFFFFF" opacity="0.12" />
      </g>

      {/* laptop soft shadow on desk */}
      <ellipse cx="260" cy="404" rx="120" ry="10" fill="#0F5132" opacity="0.14" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */

interface HeroIllustrationTwoProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export default function HeroIllustrationTwo({ x, y }: HeroIllustrationTwoProps) {
  return (
    <div className="relative mx-auto w-full max-w-[580px]">
      {/* main scene — controlled medium parallax */}
      <ParallaxLayer x={x} y={y} factor={22} className="relative">
        <SceneSVG />
      </ParallaxLayer>

      {/* floating small Quran — medium */}
      <div className="absolute -top-4 left-1" style={{ width: 64 }}>
        <ParallaxLayer x={x} y={y} factor={26} className="w-full">
          <MiniQuranSVG className="w-full" />
        </ParallaxLayer>
      </div>

      {/* floating tablet — medium, near top right */}
      <div className="absolute -top-6 right-2 hidden sm:block" style={{ width: 52 }}>
        <ParallaxLayer x={x} y={y} factor={34} className="w-full">
          <TabletSVG className="w-full drop-shadow-lg" />
        </ParallaxLayer>
      </div>

      {/* floating book stack — medium */}
      <div className="absolute -bottom-3 right-4" style={{ width: 76 }}>
        <ParallaxLayer x={x} y={y} factor={30} className="w-full">
          <BookStackSVG className="w-full drop-shadow-md" />
        </ParallaxLayer>
      </div>

      {/* foreground decorative accent */}
      <div
        aria-hidden="true"
        className="absolute -left-6 bottom-8 h-14 w-14 rounded-full border-2 border-dashed border-gold/40"
      >
        <ParallaxLayer x={x} y={y} factor={40} className="h-full w-full" />
      </div>
    </div>
  );
}
