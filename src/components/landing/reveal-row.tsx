"use client";

import { m } from "motion/react";
import { reveal, stagger } from "@/components/landing/motion";

/** Table row that fades in with a small stagger; hover tints it with its stage colour. */
export function RevealRow({ index, tint, children }: { index: number; tint: string; children: React.ReactNode }) {
  return (
    <m.tr
      {...reveal(stagger(index, 0.05))}
      style={{ "--tint": tint } as React.CSSProperties}
      className="border-b transition-colors duration-150 last:border-b-0 hover:bg-[color-mix(in_oklab,var(--tint)_6%,transparent)]"
    >
      {children}
    </m.tr>
  );
}
