"use client";

import { m } from "motion/react";

/** Closing hairline in the temper colours; on desktop it cools to grey once when seen (a quench). */
export function QuenchRule() {
  return (
    <m.div
      aria-hidden="true"
      className="stage-ramp h-1 w-full rounded-full"
      initial={{ filter: "saturate(1)" }}
      whileInView={{ filter: "saturate(0.15)" }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 1.2, delay: 0.4 }}
    />
  );
}
