"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { m, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { isDesktop } from "@/components/landing/landing-motion";
import { EASE } from "@/components/landing/motion";

export interface PreviewShot {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

function BrowserFrame({ shot, url, priority }: { shot: PreviewShot; url: string; priority?: boolean }) {
  return (
    <figure className="soft-card overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-danger/60" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ms-2 truncate rounded-md bg-background px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {url}
        </span>
      </div>
      <Image
        src={shot.src}
        width={shot.width}
        height={shot.height}
        alt={shot.alt}
        sizes="(min-width: 1024px) 1100px, 100vw"
        priority={priority}
        className="block h-auto w-full"
      />
      <figcaption className="border-t px-4 py-2 text-xs text-muted-foreground">{shot.caption}</figcaption>
    </figure>
  );
}

/**
 * One large studio screenshot with two smaller ones overlapping it. On desktop the
 * small frames drift a little against the scroll of <main id="main"> (the
 * app's scroll container); off under reduced motion.
 */
export function ProductPreview({ shots, url }: { shots: [PreviewShot, PreviewShot, PreviewShot]; url: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const raw = useMotionValue(0);
  const offset = useSpring(raw, { stiffness: 120, damping: 24 });
  const inverse = useSpring(useMotionValue(0), { stiffness: 120, damping: 24 });

  useEffect(() => {
    const main = document.getElementById("main");
    const el = ref.current;
    if (!main || !el || reduce || !isDesktop()) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const vh = main.clientHeight;
      // -1 when the section is below the viewport, +1 when above it.
      const p = Math.max(-1, Math.min(1, (vh / 2 - (r.top + r.height / 2)) / vh));
      raw.set(p * -24);
      inverse.set(p * 24);
    };
    onScroll();
    main.addEventListener("scroll", onScroll, { passive: true });
    return () => main.removeEventListener("scroll", onScroll);
  }, [raw, inverse, reduce]);

  const [main, left, right] = shots;
  return (
    <div ref={ref} className="relative mt-12 overflow-x-clip py-2 md:pb-40">
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: EASE }}
        className="md:mx-[12%]"
      >
        <BrowserFrame shot={main} url={url} />
      </m.div>
      <div className="mt-6 grid gap-6 md:mt-0 md:block">
        <m.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.15 }}
          style={{ y: offset }}
          className="md:absolute md:bottom-0 md:left-0 md:w-[27%]"
        >
          <BrowserFrame shot={left} url={url} />
        </m.div>
        <m.div
          initial={{ opacity: 0, x: 40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.25 }}
          style={{ y: inverse }}
          className="md:absolute md:bottom-8 md:right-0 md:w-[27%]"
        >
          <BrowserFrame shot={right} url={url} />
        </m.div>
      </div>
    </div>
  );
}
