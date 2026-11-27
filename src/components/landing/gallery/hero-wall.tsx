"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import { LANDING_MOTION_QUERY } from "../motion";
import { pointerTilt, wallPose } from "./gallery-logic";
import { useGallery } from "./gallery-provider";

/** A browser window (dark bar, three dots, <slug>.fuse.dev) showing a real template's mobile screenshot. */
function BrowserCard({ slug, image, hot, className, ...rest }: { slug: string; image: string; hot: boolean; className?: string; "data-panel-art"?: string }) {
  return (
    <span
      aria-hidden="true"
      {...rest}
      className={`flex aspect-[2/3] flex-col overflow-hidden rounded-[8px] border border-[rgb(255_255_255/0.14)] bg-[#000] shadow-[0_12px_32px_rgb(0_0_0/0.6)] transition-shadow motion-reduce:transition-none lg:pointer-fine:aspect-[10/19] ${className ?? ""}`}
    >
      <span data-browser-bar="" className="flex h-[7%] min-h-[14px] shrink-0 items-center gap-[3px] bg-[#1b1d22] px-[6%]">
        {["#ff5f57", "#febc2e", "#28c840"].map((dot) => (
          <span key={dot} data-browser-dot="" className="size-[5px] shrink-0 rounded-full" style={{ backgroundColor: dot }} />
        ))}
        <span className="ml-[6%] min-w-0 flex-1 truncate rounded-full bg-[#2a2d34] px-[6%] text-center text-[7px] leading-[1.6] text-[#9a9ea8]">
          {slug}.fuse.dev
        </span>
      </span>
      <span className="relative block min-h-0 flex-1">
        <Image
          src={image}
          alt=""
          fill
          sizes="(min-width:1024px) 16vw, 62vw"
          loading={hot ? "eager" : "lazy"}
          fetchPriority={hot ? "high" : undefined}
          draggable={false}
          className="object-cover object-top motion-safe:transition-[object-position] motion-safe:duration-[2400ms] motion-safe:ease-in-out motion-safe:group-hover:object-bottom motion-safe:group-focus-visible:object-bottom"
        />
      </span>
    </span>
  );
}

/** Hero gallery (herosection.jpeg): snap carousel on touch/small screens, concave CSS 3D wall on desktop pointers. */
export function HeroWall() {
  const { open, labels, copy } = useGallery();
  const wallRef = useRef<HTMLDivElement>(null);

  // Parallax only where the landing motion gate allows it; a CSS variable, no timers. Listen on the hero section: the
  // desktop wall is pointer-events-none, so its own pointerleave fired in every gap between panels.
  useEffect(() => {
    const el = wallRef.current;
    if (!el || !window.matchMedia(LANDING_MOTION_QUERY).matches) return;
    const area = el.closest<HTMLElement>("#mulai-hero") ?? el;
    const move = (e: PointerEvent) => {
      const rect = area.getBoundingClientRect();
      el.style.setProperty("--tilt", String(pointerTilt(e.clientX, rect.left, rect.width)));
    };
    const leave = () => el.style.setProperty("--tilt", "0");
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    return () => {
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div
      ref={wallRef}
      role="group"
      aria-label={copy.wallLabel}
      className="transition-transform duration-700 [transform-style:preserve-3d] motion-reduce:transition-none lg:pointer-fine:pointer-events-none lg:pointer-fine:motion-safe:[transform:rotateY(calc(var(--tilt,0)*3deg))]"
    >
      {/* Desktop: every li sits in one grid cell at the centre and is placed by its pose; preserve-3d depth-sorts them.
          The ul and group pass the pointer through so only the panel buttons hit-test (the mobile carousel keeps scrolling). */}
      <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-[19vw] pb-4 pt-6 lg:pointer-fine:pointer-events-none lg:pointer-fine:grid lg:pointer-fine:justify-center lg:pointer-fine:justify-items-center lg:pointer-fine:gap-[6px] lg:pointer-fine:overflow-visible lg:pointer-fine:px-0 lg:pointer-fine:pb-0 lg:pointer-fine:pt-6 lg:pointer-fine:[perspective:1200px] lg:pointer-fine:[transform-style:preserve-3d]">
        {SITE_CATEGORIES.map((c, i) => {
          const pose = wallPose(i, SITE_CATEGORIES.length);
          const name = (labels.items[c.id] as { name: string }).name;
          const t = SITE_TEMPLATES[c.id][0];
          // The two centre panels are the first thing seen on desktop; everything else loads lazily.
          const hot = i === 3 || i === 4;
          // The outer panels run off the screen: their labels align towards the inside and wrap within the visible 70 %.
          const align =
            i === 0
              ? "lg:pointer-fine:justify-end lg:pointer-fine:text-right lg:pointer-fine:pr-2 lg:pointer-fine:pl-[30%] lg:text-[clamp(0.7rem,1vw,1rem)]"
              : i === SITE_CATEGORIES.length - 1
                ? "lg:pointer-fine:justify-start lg:pointer-fine:text-left lg:pointer-fine:pl-2 lg:pointer-fine:pr-[30%] lg:text-[clamp(0.7rem,1vw,1rem)]"
                : "lg:text-[clamp(0.8rem,1vw,1rem)]";
          return (
            <li
              key={c.id}
              style={
                {
                  "--x": pose.x,
                  "--z": pose.z,
                  "--ry": `${pose.rotateY}deg`,
                  "--s": pose.scale,
                  // Nearer (edge) panels paint in front where 3D sorting is unavailable.
                  zIndex: Math.round((pose.z + 1) * 100),
                } as React.CSSProperties
              }
              className="gallery-carousel-item w-[62vw] max-w-[320px] shrink-0 snap-center lg:pointer-fine:w-[var(--pw)] lg:pointer-fine:max-w-none lg:pointer-fine:[--pw:clamp(9rem,10vw_+_3.6rem,17rem)] lg:pointer-fine:[grid-area:1/1] lg:pointer-fine:[transform:translateX(calc(var(--x)*var(--pw)))_translateZ(calc(var(--z)*var(--pw)))_rotateY(var(--ry))_scale(var(--s))]"
            >
              <button
                type="button"
                data-gallery-panel=""
                aria-label={fmt(copy.openPanel, { category: name })}
                onClick={(e) => open(c.id, e.currentTarget)}
                className="group pointer-events-auto block min-h-11 w-full rounded-[6px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000] hover:brightness-115 focus-visible:brightness-115 motion-safe:transition-[transform,filter] motion-safe:duration-300 motion-safe:hover:-translate-y-3.5 motion-safe:focus-visible:-translate-y-3.5 motion-reduce:transition-none"
              >
                {/* Wraps inside the panel (at most two lines on desktop); the fixed two-line box keeps all art on one baseline. */}
                <span aria-hidden="true" className={`mb-2 flex min-h-[2lh] items-end justify-center text-center text-[0.7rem] font-light uppercase tracking-[0.2em] text-[#fff] ${align}`}>
                  {name}
                </span>
                <BrowserCard
                  slug={t.slug}
                  image={t.mobile}
                  hot={hot}
                  data-panel-art=""
                  className="group-hover:shadow-[0_0_0_1px_rgb(255_255_255/0.55),0_0_28px_rgb(255_255_255/0.28)] group-focus-visible:shadow-[0_0_0_1px_rgb(255_255_255/0.55),0_0_28px_rgb(255_255_255/0.28)]"
                />
              </button>
              {/* Water reflection: the panel's lower 40 % mirrored, rippled by #hero-ripple (HeroFloor) and faded out. */}
              <span
                aria-hidden="true"
                data-panel-reflection=""
                className="mt-[6px] block aspect-[100/60] overflow-hidden rounded-[8px] opacity-45 [filter:url(#hero-ripple)] [mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.9),transparent_85%)]"
              >
                <BrowserCard slug={t.slug} image={t.mobile} hot={false} className="-scale-y-100" />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
