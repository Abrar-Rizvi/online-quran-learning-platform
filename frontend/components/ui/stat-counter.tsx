"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { easing } from "@/lib/motion";

interface StatCounterProps {
  /** Final numeric value, e.g. 1000. */
  value: number;
  /** Static text appended throughout, e.g. "+". */
  suffix?: string;
  /** Count-up duration in seconds. */
  duration?: number;
}

/**
 * Counts from 0 to `value` once, when first scrolled into view (same `once` / `amount: 0.2`
 * trigger as Reveal). Renders the final value on the server and with reduced motion, and
 * reserves the final number's width so digits changing never shift the layout.
 */
export function StatCounter({ value, suffix = "", duration = 1.25 }: StatCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  const count = useMotionValue(value);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (prefersReduced) return;
    if (!isInView) {
      count.jump(0);
      return;
    }
    const controls = animate(count, value, { duration, ease: [...easing.easeOut] });
    return () => controls.stop();
  }, [isInView, prefersReduced, count, value, duration]);

  return (
    <span ref={ref} className="relative inline-block tabular-nums">
      <span className="sr-only">
        {value}
        {suffix}
      </span>
      {/* Invisible copy of the final number holds the width; the animated one overlays it. */}
      <span aria-hidden="true" className="invisible">
        {value}
        {suffix}
      </span>
      <span aria-hidden="true" className="absolute inset-0 text-center">
        <motion.span>{rounded}</motion.span>
        {suffix}
      </span>
    </span>
  );
}
