"use client";

import Image from "next/image";
import { m } from "motion/react";
import { EASE } from "@/components/landing/motion";

export interface PreviewShot {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

function Label({ caption, figure }: { caption: string; figure: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-3">
      <span className="text-sm font-medium">{caption}</span>
      <span className="clay-chip font-narrow shrink-0 px-2.5 py-0.5 text-xs text-muted-foreground">{figure}</span>
    </div>
  );
}

/**
 * Inside the studio: the workspace screenshot in a raised bezel that zooms in once,
 * with the two panel screenshots as label cards over its lower corners (below it on phones).
 * Reduced motion keeps only the fade (MotionConfig reducedMotion="user").
 */
export function ProductPreview({ shots, figureLabels }: { shots: PreviewShot[]; figureLabels: string[] }) {
  const [main, ...side] = shots;
  return (
    <figure className="relative mx-auto max-w-5xl md:pb-24">
      <m.div
        initial={{ scale: 0.96, opacity: 0.6 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8, ease: EASE }}
        className="rounded-[28px] bg-[var(--fuse-card-bg)] p-2.5 shadow-[var(--fuse-shadow-soft),var(--fuse-sheen)]"
      >
        <div className="relative aspect-[1440/842] overflow-hidden rounded-[18px] bg-[var(--clay-bg)]">
          <Image src={main.src} fill alt={main.alt} sizes="(min-width: 1024px) 64rem, 100vw" className="object-cover object-top" />
        </div>
        <Label caption={main.caption} figure={figureLabels[0]} />
      </m.div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 md:absolute md:inset-x-[-1.5rem] md:bottom-0 md:mt-0 md:flex md:justify-between">
        {side.map((s, k) => (
          <div key={s.src} className="clay-card overflow-hidden p-2 md:w-64">
            <div className="relative aspect-[360/460] overflow-hidden rounded-[0.9rem] bg-[var(--clay-bg)] md:aspect-[4/3]">
              <Image src={s.src} fill alt={s.alt} sizes="(min-width: 768px) 16rem, 50vw" className="object-cover object-top" />
            </div>
            <Label caption={s.caption} figure={figureLabels[k + 1]} />
          </div>
        ))}
      </div>
    </figure>
  );
}
