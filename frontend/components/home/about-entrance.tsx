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

  // Same motion.div on server and client (see Reveal): a plain <div> swap under
  // reduced motion kept the SSR'd hidden inline style after hydration.
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={
        isInView || prefersReduced
          ? { opacity: 1, scale: 1 }
          : { opacity: 0, scale: 0.98 }
      }
      transition={
        prefersReduced
          ? { duration: 0 }
          : { duration: 0.4, ease: [...easing.easeOut] }
      }
    >
      {children}
    </motion.div>
  );
}
