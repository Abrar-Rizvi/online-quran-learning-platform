"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { duration, easing, reveal as revealTokens } from "@/lib/motion";

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds before animation starts. */
  delay?: number;
  /** Index for staggered lists (delay = index * stagger). */
  staggerIndex?: number;
}

export function Reveal({
  children,
  className,
  delay = 0,
  staggerIndex,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

  const computedDelay =
    staggerIndex !== undefined
      ? staggerIndex * revealTokens.stagger + delay
      : delay;

  // Content is always visible — animation is progressive enhancement only.
  if (prefersReduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: revealTokens.distance }}
      animate={
        isInView
          ? { opacity: 1, y: 0 }
          : { opacity: 0, y: revealTokens.distance }
      }
      transition={{
        duration: duration.reveal,
        ease: [...easing.easeOut],
        delay: computedDelay,
      }}
    >
      {children}
    </motion.div>
  );
}
