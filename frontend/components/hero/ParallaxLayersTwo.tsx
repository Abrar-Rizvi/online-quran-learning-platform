"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { MouseEvent, ReactNode } from "react";

/**
 * Lightweight multi-layer parallax primitives for the "Two" hero concept.
 * Depth factor is translation in px per 0.5 unit of mouse offset (so a
 * factor of 20 means ±10px travel). Kept isolated from the /design-template
 * hero on purpose.
 */

export interface ParallaxMotion {
  x: MotionValue<number>;
  y: MotionValue<number>;
  onMouseMove: (event: MouseEvent<HTMLElement>) => void;
  onMouseLeave: () => void;
  reduced: boolean;
}

export function useParallaxMotion(): ParallaxMotion {
  const reduced = useReducedMotion() ?? false;

  const mx = useMotionValue(0);
  const my = useMotionValue(0);

  const x = useSpring(mx, { stiffness: 70, damping: 22, mass: 0.6 });
  const y = useSpring(my, { stiffness: 70, damping: 22, mass: 0.6 });

  function onMouseMove(event: MouseEvent<HTMLElement>) {
    if (reduced) return;
    const rect = event.currentTarget.getBoundingClientRect();
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  function onMouseLeave() {
    mx.set(0);
    my.set(0);
  }

  return { x, y, onMouseMove, onMouseLeave, reduced };
}

interface ParallaxLayerProps {
  x: MotionValue<number>;
  y: MotionValue<number>;
  factor: number;
  className?: string;
  children?: ReactNode;
}

/** Wraps content and shifts it by `factor` px as the mouse moves. */
export function ParallaxLayer({
  x,
  y,
  factor,
  className,
  children,
}: ParallaxLayerProps) {
  const tx = useTransform(x, (v) => v * factor);
  const ty = useTransform(y, (v) => v * factor * 0.6);

  return (
    <motion.div className={className} style={{ x: tx, y: ty }}>
      {children}
    </motion.div>
  );
}
