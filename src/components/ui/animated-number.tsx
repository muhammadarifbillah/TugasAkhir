"use client";

import { useEffect } from "react";
import { m, useReducedMotion, useSpring, useTransform } from "motion/react";

/**
 * Integer that springs to each new value (e.g. the security score after a
 * scan). The first render prints `value` itself, so server HTML matches.
 */
export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const spring = useSpring(value, { stiffness: 120, damping: 20 });
  const shown = useTransform(spring, (v) => Math.round(v));

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  if (reduce) return <span className={className}>{value}</span>;
  return <m.span className={className}>{shown}</m.span>;
}
