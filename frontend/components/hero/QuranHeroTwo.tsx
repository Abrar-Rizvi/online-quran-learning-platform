"use client";

import { MotionConfig } from "framer-motion";
import HeroBackgroundTwo from "./HeroBackgroundTwo";
import HeroContentTwo from "./HeroContentTwo";
import HeroIllustrationTwo from "./HeroIllustrationTwo";
import { useParallaxMotion } from "./ParallaxLayersTwo";

export default function QuranHeroTwo() {
  const { x, y, onMouseMove, onMouseLeave } = useParallaxMotion();

  return (
    <MotionConfig reducedMotion="user">
      <section
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        aria-label="Learn Quran online hero"
        className="relative isolate overflow-hidden bg-primary text-cream"
      >
        {/* decorative background depth layers */}
        <HeroBackgroundTwo x={x} y={y} />

        <div className="relative z-10 mx-auto grid w-full max-w-7xl items-center gap-14 px-6 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.02fr_0.98fr] lg:gap-8 lg:pb-24 lg:pt-20">
          {/* messaging */}
          <HeroContentTwo />

          {/* child + laptop learning scene */}
          <HeroIllustrationTwo x={x} y={y} />
        </div>

        {/* soft blend into page background below the hero */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-canvas/15"
        />
      </section>
    </MotionConfig>
  );
}
