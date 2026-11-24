"use client";

import { m } from "motion/react";
import { reveal } from "@/components/landing/motion";

/** Fades and lifts its content in the first time it scrolls into view. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <m.div className={className} {...reveal(delay)}>
      {children}
    </m.div>
  );
}
