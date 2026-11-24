"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Decorative stage-colour gradient that drifts slowly (CSS). It pauses while
 * offscreen; reduced motion and high contrast are handled in globals.css.
 */
export function AuroraBackdrop({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-paused={!inView}
      className={cn("aurora pointer-events-none absolute inset-0 -z-10", className)}
    />
  );
}
