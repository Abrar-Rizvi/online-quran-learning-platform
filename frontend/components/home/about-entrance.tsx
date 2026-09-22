"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { easing } from "@/lib/motion";

interface ImageRevealProps {
  children: React.ReactNode;
  className?: string;
}

export function ImageReveal({ children, className }: ImageRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });
  const prefersReduced = useReducedMotion();

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={
        isInView
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: 0.98 }
      }
      transition={{ duration: 0.4, ease: [...easing.easeOut] }}
    >
      {children}
    </motion.div>
  );
}
