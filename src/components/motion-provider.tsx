"use client";

import { LazyMotion, MotionConfig } from "motion/react";

const loadFeatures = () => import("./motion-features").then((mod) => mod.default);

/**
 * App-wide Motion setup. `strict` forbids the heavy `motion.*` components so
 * every animation goes through the lazily loaded `m.*`; `reducedMotion="user"`
 * turns transforms off when the OS asks for reduced motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
