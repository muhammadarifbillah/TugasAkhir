"use client";

import { useEffect, useRef } from "react";
import { SiteArt } from "@/components/site-art/site-art";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { LANDING_MOTION_QUERY } from "../motion";
import { pointerTilt, wallPose } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

const FRAME = "overflow-hidden rounded-[1.25rem] border border-border shadow-[var(--fuse-shadow-soft)]";

/** Hero gallery: snap carousel on touch/small screens, curved CSS 3D wall on desktop pointers. */
export function HeroWall() {
  const { open, labels, copy } = useGallery();
  const wallRef = useRef<HTMLDivElement>(null);

  // Parallax only where the landing motion gate allows it; a CSS variable, no timers.
  useEffect(() => {
    const el = wallRef.current;
    if (!el || !window.matchMedia(LANDING_MOTION_QUERY).matches) return;
    const move = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--tilt", String(pointerTilt(e.clientX, rect.left, rect.width)));
    };
    const leave = () => el.style.setProperty("--tilt", "0");
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div>
      <div
        ref={wallRef}
        role="group"
        aria-label={copy.wallLabel}
        className="transition-transform duration-700 [transform-style:preserve-3d] lg:pointer-fine:motion-safe:[transform:rotateY(calc(var(--tilt,0)*3deg))]"
      >
        <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[16vw] pb-4 lg:pointer-fine:justify-center lg:pointer-fine:overflow-visible lg:pointer-fine:px-0 lg:pointer-fine:[perspective:1400px]">
          {SITE_CATEGORIES.map((c, i) => {
            const pose = wallPose(i, SITE_CATEGORIES.length);
            const name = (labels.items[c.id] as { name: string }).name;
            return (
              <li
                key={c.id}
                style={{ "--ry": `${pose.rotateY}deg`, "--tz": `${pose.z}px` } as React.CSSProperties}
                className="w-[68vw] max-w-[300px] shrink-0 snap-center lg:pointer-fine:w-[clamp(7.5rem,10.5vw,10.5rem)] lg:pointer-fine:max-w-none lg:pointer-fine:motion-safe:[transform:rotateY(var(--ry))_translateZ(var(--tz))]"
              >
                <button
                  type="button"
                  data-gallery-panel=""
                  aria-label={fmt(copy.openPanel, { category: name })}
                  onClick={(e) => open(c.id, e.currentTarget)}
                  className="block w-full rounded-[1.25rem] text-left transition-transform duration-300 hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
                >
                  <span aria-hidden="true" className="font-narrow mb-2 block truncate text-center text-xs uppercase tracking-wider text-foreground">
                    {name}
                  </span>
                  <span className={`block ${FRAME}`}>
                    <SiteArt category={c} pageIndex={0} labels={labels} className="block h-auto w-full" />
                  </span>
                </button>
                <div
                  aria-hidden="true"
                  className={`mt-2 hidden h-12 opacity-25 [mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.55),transparent_70%)] lg:block ${FRAME}`}
                >
                  <SiteArt category={c} pageIndex={0} labels={labels} className="block h-auto w-full -scale-y-100" />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">{copy.hint}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{labels.galleryLabel}</p>
    </div>
  );
}
