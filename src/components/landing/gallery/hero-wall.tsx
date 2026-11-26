"use client";

import { useEffect, useRef } from "react";
import { SiteArt } from "@/components/site-art/site-art";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { LANDING_MOTION_QUERY } from "../motion";
import { pointerTilt, wallPose } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

const PAGES = [0, 1, 2] as const;
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
        <ul className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-[10vw] pb-4 lg:pointer-fine:justify-center lg:pointer-fine:gap-3 lg:pointer-fine:overflow-visible lg:pointer-fine:px-0 lg:pointer-fine:[perspective:1200px]">
          {SITE_CATEGORIES.map((c, i) => {
            const pose = wallPose(i, SITE_CATEGORIES.length);
            const name = (labels.items[c.id] as { name: string }).name;
            const pages = (data?: true) =>
              PAGES.map((p) => (
                <span key={p} data-panel-page={data ? "" : undefined} className="block">
                  <SiteArt category={c} pageIndex={p} labels={labels} className="block h-auto w-full" />
                </span>
              ));
            return (
              <li
                key={c.id}
                style={{ "--ry": `${pose.rotateY}deg`, "--tz": `${pose.z}px`, "--s": pose.scale } as React.CSSProperties}
                className="gallery-carousel-item w-[80vw] max-w-[360px] shrink-0 snap-center lg:pointer-fine:w-[clamp(8.5rem,14vw,15rem)] lg:pointer-fine:max-w-none lg:pointer-fine:motion-safe:[transform:rotateY(var(--ry))_translateZ(var(--tz))_scale(var(--s))]"
              >
                <button
                  type="button"
                  data-gallery-panel=""
                  aria-label={fmt(copy.openPanel, { category: name })}
                  onClick={(e) => open(c.id, e.currentTarget)}
                  className="group block w-full rounded-[1.25rem] text-left transition-transform duration-300 hover:-translate-y-3 focus-visible:-translate-y-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:focus-visible:translate-y-0"
                >
                  <span aria-hidden="true" className="font-narrow mb-2 block truncate text-center text-sm uppercase tracking-wider text-foreground">
                    {name}
                  </span>
                  <span className={`block aspect-[3/4] lg:pointer-fine:aspect-[2/3] ${FRAME}`}>
                    <span
                      aria-hidden="true"
                      data-panel-art=""
                      className="flex flex-col motion-safe:transition-transform motion-safe:duration-[1200ms] motion-safe:ease-out motion-safe:group-hover:-translate-y-[30%] motion-safe:group-focus-visible:-translate-y-[30%]"
                    >
                      {pages(true)}
                    </span>
                  </span>
                </button>
                {/* Floor reflection: 22 % of the 2:3 frame height (1.5w × 0.22 = 0.33w). */}
                <span
                  aria-hidden="true"
                  data-panel-reflection=""
                  className={`mt-2 hidden aspect-[100/33] opacity-30 [mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.5),transparent_75%)] lg:pointer-fine:motion-safe:block ${FRAME}`}
                >
                  <span className="flex -scale-y-100 flex-col">{pages()}</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div
          aria-hidden="true"
          className="mx-auto hidden h-0.5 w-4/5 bg-[radial-gradient(closest-side,var(--fuse-glow),transparent)] lg:pointer-fine:motion-safe:block"
        />
      </div>
      <p className="mt-4 text-center text-sm text-muted-foreground">{copy.hint}</p>
      <p className="mt-1 text-center text-xs text-muted-foreground">{labels.galleryLabel}</p>
    </div>
  );
}
