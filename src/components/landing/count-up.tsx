"use client";

import { useEffect, useRef } from "react";
import { animate, m, useMotionValue, useTransform } from "motion/react";
import { EASE } from "@/components/landing/motion";

/**
 * Counts from 0 to `value` the first time it scrolls into view. Server HTML
 * and anything already on screen at load show the final value (no flash,
 * correct for SEO and screen readers). A number changing is not movement, so
 * it also runs under reduced motion.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const mv = useMotionValue(value);
  const shown = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let armed = false;
    let first = true;
    const io = new IntersectionObserver(([entry]) => {
      if (first) {
        first = false;
        if (!entry.isIntersecting) {
          armed = true;
          mv.set(0);
        }
        return;
      }
      if (armed && entry.isIntersecting) {
        armed = false;
        animate(mv, value, { duration: 1.2, ease: EASE });
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [mv, value]);

  return (
    <m.span ref={ref} className={className}>
      {shown}
    </m.span>
  );
}
