"use client";

import { motion, useReducedMotion } from "framer-motion";
import { easing, reveal as revealTokens } from "@/lib/motion";

interface HeroFadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  /** "image" uses scale instead of y-translate. */
  mode?: "text" | "image";
}

export function HeroFadeIn({
  children,
  className,
  delay = 0,
  mode = "text",
}: HeroFadeInProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const isImage = mode === "image";

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...(isImage ? { scale: 0.98 } : { y: revealTokens.distance }) }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: isImage ? 0.4 : 0.35,
        ease: [...easing.easeOut],
        delay,
      }}
    >
      {children}
    </motion.div>
  );
}
