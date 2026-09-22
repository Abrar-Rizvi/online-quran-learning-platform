/** Motion design tokens for consistent animation across the site. */

export const duration = {
  fast: 0.15,
  base: 0.22,
  reveal: 0.35,
} as const;

export const easing = {
  easeOut: [0.22, 1, 0.36, 1] as readonly [number, number, number, number],
  easeIn: [0.4, 0, 1, 1] as readonly [number, number, number, number],
} as const;

export const reveal = {
  distance: 24,
  stagger: 0.06,
} as const;
