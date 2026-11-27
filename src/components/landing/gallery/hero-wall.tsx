"use client";

import { useEffect, useRef } from "react";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { HeroScene } from "../hero/hero-scene";
import { LANDING_MOTION_QUERY } from "../motion";
import { pointerTilt, wallPose } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

/** Hero gallery (herosection.jpeg): snap carousel on touch/small screens, concave CSS 3D wall on desktop pointers. */
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
    <div
      ref={wallRef}
      role="group"
      aria-label={copy.wallLabel}
      className="transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none lg:pointer-fine:motion-safe:[transform:rotateY(calc(var(--tilt,0)*3deg))]"
    >
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[19vw] pb-4 pt-6 lg:pointer-fine:justify-center lg:pointer-fine:gap-[6px] lg:pointer-fine:overflow-visible lg:pointer-fine:px-0 lg:pointer-fine:pt-10 lg:pointer-fine:[perspective:1200px]">
        {SITE_CATEGORIES.map((c, i) => {
          const pose = wallPose(i, SITE_CATEGORIES.length);
          const name = (labels.items[c.id] as { name: string }).name;
          return (
            <li
              key={c.id}
              style={{ "--ry": `${pose.rotateY}deg`, "--tz": `${pose.z}px`, "--s": pose.scale } as React.CSSProperties}
              className="gallery-carousel-item w-[62vw] max-w-[320px] shrink-0 snap-center lg:pointer-fine:w-[clamp(9rem,13vw,15rem)] lg:pointer-fine:max-w-none lg:pointer-fine:[transform:rotateY(var(--ry))_translateZ(var(--tz))_scale(var(--s))]"
            >
              <button
                type="button"
                data-gallery-panel=""
                aria-label={fmt(copy.openPanel, { category: name })}
                onClick={(e) => open(c.id, e.currentTarget)}
                className="group block w-full rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000] motion-safe:transition-[transform,filter] motion-safe:duration-300 motion-safe:hover:-translate-y-2 motion-safe:hover:brightness-110 motion-safe:focus-visible:-translate-y-2 motion-safe:focus-visible:brightness-110 motion-reduce:transition-none"
              >
                <span aria-hidden="true" className="mb-2 block truncate text-center text-[0.7rem] font-light uppercase tracking-[0.2em] text-[#fff] lg:text-[clamp(0.6rem,0.85vw,0.85rem)]">
                  {name}
                </span>
                <span aria-hidden="true" data-panel-art="" className="block aspect-[2/3] overflow-hidden rounded-[6px] bg-[#000]">
                  <HeroScene category={c} mood={i + 1} className="block h-full w-full" />
                </span>
              </button>
              {/* Water reflection: the panel's lower 40 % mirrored, rippled by #hero-ripple (HeroFloor) and faded out. */}
              <span
                aria-hidden="true"
                data-panel-reflection=""
                className="mt-[6px] block aspect-[100/60] overflow-hidden rounded-[6px] opacity-45 [filter:url(#hero-ripple)] [mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.9),transparent_85%)]"
              >
                <span className="block aspect-[2/3] -scale-y-100">
                  <HeroScene category={c} mood={i + 1} className="block h-full w-full" />
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
