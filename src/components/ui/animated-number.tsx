"use client";

import { useEffect } from "react";
import { m, useSpring, useTransform } from "motion/react";

/**
 * Integer that springs to each new value (e.g. the security score after a
 * scan). The first render prints `value` itself, so server HTML matches. A
 * changing number is not movement, so it also runs under reduced motion.
 */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const spring = useSpring(value, { stiffness: 120, damping: 20 });
  const shown = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <m.span className={className}>{shown}</m.span>;
}
