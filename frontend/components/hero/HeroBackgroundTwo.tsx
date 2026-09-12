"use client";

import { ParallaxLayer } from "./ParallaxLayersTwo";
import type { MotionValue } from "framer-motion";

/** Distant 8-point star + lattice used as a very low-contrast motif. */
function GeometricPatternSVG() {
  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      style={{ color: "#F5E6C8", opacity: 0.05 }}
    >
      <defs>
        <pattern
          id="two-geometric-lattice"
          width="140"
          height="140"
          patternUnits="userSpaceOnUse"
        >
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="2" y="2" width="136" height="136" />
            <path d="M70 24 L88 52 L116 70 L88 88 L70 116 L52 88 L24 70 L52 52 Z" />
            <path d="M70 42 L80 60 L98 70 L80 80 L70 98 L60 80 L42 70 L60 60 Z" />
            <circle cx="70" cy="70" r="46" />
            <path d="M24 24 L44 44 M116 24 L96 44 M24 116 L44 96 M116 116 L96 96" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#two-geometric-lattice)" />
    </svg>
  );
}

const PARTICLES = [
  { left: "10%", top: "18%", size: 5, delay: 0 },
  { left: "16%", top: "70%", size: 8, delay: 1.1 },
  { left: "30%", top: "12%", size: 6, delay: 0.4 },
  { left: "44%", top: "82%", size: 4, delay: 1.7 },
  { left: "70%", top: "10%", size: 7, delay: 0.8 },
  { left: "86%", top: "46%", size: 5, delay: 2.1 },
  { left: "60%", top: "90%", size: 6, delay: 1.4 },
];

const DISTANT_STARS = [
  { left: "7%", top: "42%", size: 14 },
  { left: "90%", top: "16%", size: 18 },
  { left: "24%", top: "88%", size: 12 },
  { left: "77%", top: "80%", size: 10 },
];

interface HeroBackgroundTwoProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
}

export default function HeroBackgroundTwo({ x, y }: HeroBackgroundTwoProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Islamic geometric lattice — near-static */}
      <ParallaxLayer x={x} y={y} factor={6} className="absolute inset-0">
        <GeometricPatternSVG />
      </ParallaxLayer>

      {/* soft brand glows */}
      <ParallaxLayer
        x={x}
        y={y}
        factor={10}
        className="absolute -left-32 top-8 h-96 w-96 rounded-full bg-cream/10 blur-3xl"
      />
      <ParallaxLayer
        x={x}
        y={y}
        factor={10}
        className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl"
      />

      {/* small distant diamond motifs */}
      {DISTANT_STARS.map((s, i) => (
        <div
          key={`star-${i}`}
          className="absolute"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size }}
        >
          <ParallaxLayer
            x={x}
            y={y}
            factor={16 + i * 2}
            className="h-full w-full"
          >
            <span
              className="block h-full w-full rotate-45 border border-gold/20"
              style={{ borderRadius: 2 }}
            />
          </ParallaxLayer>
        </div>
      ))}

      {/* minimal particles */}
      {PARTICLES.map((p, i) => (
        <div
          key={`dot-${i}`}
          className="absolute"
          style={{ left: p.left, top: p.top, width: p.size, height: p.size }}
        >
          <ParallaxLayer
            x={x}
            y={y}
            factor={20 + (i % 3) * 5}
            className="h-full w-full"
          >
            <span
              className="block h-full w-full rounded-full"
              style={{
                background: i % 2 === 0 ? "#F5E6C8" : "#D4A017",
                opacity: 0.16,
              }}
            />
          </ParallaxLayer>
        </div>
      ))}
    </div>
  );
}
