"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { MouseEvent } from "react";

/* ------------------------------------------------------------------ */
/* Deterministic decorative data                                       */
/* ------------------------------------------------------------------ */

const FLOATING_ACCENTS = [
  { kind: "square", left: "6%", top: "18%", size: 14, color: "#0D9488" },
  { kind: "dot", left: "14%", top: "74%", size: 8, color: "#F59E0B" },
  { kind: "ring", left: "26%", top: "12%", size: 18, color: "#0D9488" },
  { kind: "square", left: "44%", top: "86%", size: 10, color: "#F59E0B" },
  { kind: "dot", left: "68%", top: "12%", size: 9, color: "#0D9488" },
  { kind: "ring", left: "88%", top: "34%", size: 16, color: "#F59E0B" },
  { kind: "square", left: "92%", top: "78%", size: 12, color: "#0D9488" },
  { kind: "dot", left: "80%", top: "58%", size: 6, color: "#F59E0B" },
];

const TRUST_STATS = [
  { value: "500+", label: "Qualified Tutors", icon: "✦" },
  { value: "4.9★", label: "Parent Rating", icon: "★" },
];

/* ------------------------------------------------------------------ */

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: "easeOut" as const, delay },
});

interface ParallaxLayerProps {
  children: React.ReactNode;
  x: MotionValue<number>;
  y: MotionValue<number>;
  className?: string;
}

function ParallaxLayer({ children, x, y, className }: ParallaxLayerProps) {
  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      style={{ x, y }}
    >
      {children}
    </motion.div>
  );
}

export default function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 130, damping: 18, mass: 0.5 });
  const sy = useSpring(my, { stiffness: 130, damping: 18, mass: 0.5 });

  /* Layer 1 — student image: smooth, moderate travel */
  const layer1X = useTransform(sx, [-0.5, 0.5], [36, -36]);
  const layer1Y = useTransform(sy, [-0.5, 0.5], [20, -20]);

  /* Layer 2 — teal/gold accents: faster + opposite */
  const layer2X = useTransform(sx, [-0.5, 0.5], [-110, 110]);
  const layer2Y = useTransform(sy, [-0.5, 0.5], [-60, 60]);

  /* Layer 3 — foreground content: responsive depth */
  const contentX = useTransform(sx, [-0.5, 0.5], [34, -34]);
  const contentY = useTransform(sy, [-0.5, 0.5], [22, -22]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [2, -2]);
  const rotateX = useTransform(sy, [-0.5, 0.5], [-1.5, 1.5]);

  function onMouseMove(event: MouseEvent<HTMLElement>) {
    if (prefersReducedMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  return (
    <section
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      className="relative isolate overflow-hidden bg-canvas text-body-slate"
      style={{ perspective: 1400 }}
    >
      {/* ======= Layer 1 — student image (soft, light blend) ======= */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-24"
        style={{ x: layer1X, y: layer1Y }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- plain decorative bg image */}
        <img
          src="/images/hero-student.jpg"
          alt=""
          className="absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
          style={{ opacity: 0.22 }}
        />
        {/* soft overlays so copy stays sharp on the ice-slate canvas */}
        <div className="absolute inset-0 bg-gradient-to-r from-canvas via-transparent to-canvas" />
        <div className="absolute inset-0 bg-gradient-to-t from-canvas via-transparent to-canvas" />
        {/* readability veil behind the centered content */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 62% 60% at 50% 45%, rgba(248,250,252,0.94) 0%, rgba(248,250,252,0.72) 50%, rgba(248,250,252,0) 82%)",
          }}
        />
      </motion.div>

      {/* ======= Layer 2 — floating teal & gold geometric accents ======= */}
      <ParallaxLayer x={layer2X} y={layer2Y}>
        {FLOATING_ACCENTS.map((a, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: a.left, top: a.top, width: a.size, height: a.size }}
          >
            {a.kind === "square" && (
              <span
                className="block h-full w-full rotate-45 rounded-[3px]"
                style={{ background: a.color, opacity: 0.3 }}
              />
            )}
            {a.kind === "ring" && (
              <span
                className="block h-full w-full rounded-full border-2"
                style={{ borderColor: a.color, opacity: 0.5 }}
              />
            )}
            {a.kind === "dot" && (
              <span
                className="block h-full w-full rounded-full"
                style={{ background: a.color, opacity: 0.4 }}
              />
            )}
          </div>
        ))}
      </ParallaxLayer>

      {/* ======= Layer 3 — foreground content ======= */}
      <motion.div
        className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 py-24 text-center sm:py-28"
        style={{ x: contentX, y: contentY, rotateX, rotateY, transformStyle: "preserve-3d" }}
      >
        {/* top badge */}
        <motion.span
          {...fadeUp(0)}
          className="inline-flex items-center gap-2 rounded-full bg-light-gold px-4 py-1.5 text-sm font-semibold text-accent-gold ring-1 ring-accent-gold/30"
        >
          <span aria-hidden="true" className="text-accent-gold">
            ★
          </span>
          🇺🇸 1-on-1 Online Quran Classes | Tailored for US &amp; Global Timezones
        </motion.span>

        {/* main heading */}
        <motion.h1
          {...fadeUp(0.1)}
          className="mt-6 max-w-3xl text-4xl font-extrabold leading-[1.12] tracking-tight text-primary-slate sm:text-5xl md:text-[3.4rem]"
        >
          Master Quran Reading &amp; Tajweed With Certified Native Tutors
        </motion.h1>

        {/* subtitle */}
        <motion.p
          {...fadeUp(0.2)}
          className="mt-5 max-w-2xl text-lg leading-relaxed text-body-slate"
        >
          Interactive, safe, and flexible 1-on-1 online classes for kids &amp; adults.
        </motion.p>

        {/* CTAs */}
        <motion.div
          {...fadeUp(0.3)}
          className="mt-9 flex w-full max-w-2xl flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <button
            type="button"
            className="w-full rounded-xl bg-primary-teal px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary-teal/25 transition hover:-translate-y-0.5 hover:bg-hover-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold focus-visible:ring-offset-2 sm:w-auto"
          >
            Book Free Trial Class
          </button>
          <a
            href="#course-plans"
            className="inline-flex w-full items-center justify-center rounded-xl border border-border-slate bg-card px-7 py-4 text-base font-semibold text-primary-slate transition hover:border-primary-teal hover:text-primary-teal sm:w-auto"
          >
            View Course Plans ($45/mo)
          </a>
        </motion.div>

        {/* trust stats card */}
        <motion.div
          {...fadeUp(0.42)}
          className="mt-10 w-full max-w-2xl rounded-2xl border border-border-slate bg-card p-5 shadow-sm"
        >
          <dl className="grid grid-cols-1 divide-y divide-border-slate sm:grid-cols-2 sm:divide-x sm:divide-y-0">
            {TRUST_STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-center gap-3 px-6 py-3 sm:py-1"
              >
                <dt className="sr-only">{stat.label}</dt>
                <dd className="flex items-center gap-2 text-sm text-body-slate">
                  <span aria-hidden="true" className="text-accent-gold">
                    {stat.icon}
                  </span>
                  <span className="text-lg font-extrabold text-primary-slate">
                    {stat.value}
                  </span>
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </motion.div>
      </motion.div>
    </section>
  );
}
