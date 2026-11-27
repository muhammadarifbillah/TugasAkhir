"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { CategoryIcon } from "@/components/site-art/category-icon";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import { useAmbientMotion } from "../use-ambient-motion";
import { useGallery } from "./gallery-provider";

const CARD_W = "w-[clamp(17rem,26vw,30rem)]";

/** Wide media card (download.jpeg): thin frame, rounded corners, full-bleed 16:10 template screenshot. */
function Card({ image, hot, className, children }: { image: string; hot: boolean; className?: string; children?: ReactNode }) {
  return (
    <span
      data-hero-card=""
      className={`relative block aspect-[16/10] ${CARD_W} overflow-hidden rounded-[10px] border border-[rgb(255_255_255/0.16)] bg-[#05070c] shadow-[0_18px_40px_rgb(0_0_0/0.65)] ${className ?? ""}`}
    >
      <Image
        src={image}
        alt=""
        fill
        sizes="(min-width:1024px) 30vw, 80vw"
        loading={hot ? "eager" : "lazy"}
        fetchPriority={hot ? "high" : undefined}
        draggable={false}
        className="object-cover object-top"
      />
      <span className="absolute inset-0 rounded-[inherit] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
      {children}
    </span>
  );
}

/** Hero gallery: a row of wide cards that runs on its own on desktop (pausable) and is a snap carousel elsewhere. */
export function HeroWall() {
  const { open, labels, copy } = useGallery();
  const motion = useAmbientMotion();
  const [paused, setPaused] = useState(false);

  // The marquee needs two identical sets; the second is hidden from AT and focus, and only shown where the row moves.
  const set = (clone: boolean) =>
    SITE_CATEGORIES.map((c, i) => {
      const name = (labels.items[c.id] as { name: string }).name;
      const list = SITE_TEMPLATES[c.id];
      const image = list[0].pages[0].src;
      const hot = !clone && i < 3;
      return (
        <li
          key={`${clone ? "b" : "a"}-${c.id}`}
          aria-hidden={clone || undefined}
          inert={clone || undefined}
          className={`gallery-carousel-item shrink-0 snap-center ${clone ? "hidden lg:pointer-fine:motion-safe:block" : ""}`}
        >
          <button
            type="button"
            data-gallery-panel=""
            aria-label={fmt(copy.openPanel, { category: name })}
            onClick={(e) => open(c.id, e.currentTarget)}
            className="group block rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000] hover:brightness-110 focus-visible:brightness-110 motion-safe:transition-[filter] motion-safe:duration-300"
          >
            <Card
              image={image}
              hot={hot}
              className="group-hover:border-[rgb(255_255_255/0.55)] group-focus-visible:border-[rgb(255_255_255/0.55)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-0 flex items-end bg-[linear-gradient(0deg,rgb(0_0_0/0.78)_0%,rgb(0_0_0/0.25)_45%,transparent_70%)]"
              >
                <span className="flex w-full min-w-0 items-center gap-2.5 px-3 pb-2.5">
                  <span
                    data-card-badge=""
                    className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[rgb(255_255_255/0.45)] bg-[rgb(0_0_0/0.45)]"
                  >
                    <CategoryIcon id={c.id} className="size-3.5 text-[#fff]" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span data-card-title="" className="line-clamp-2 text-[13px] font-semibold leading-tight text-[#fff]">
                      {name}
                    </span>
                    <span data-card-meta="" className="truncate text-[11px] text-[rgb(255_255_255/0.72)]">
                      {fmt(copy.heroMeta, { n: list.length, license: list[0].license })}
                    </span>
                  </span>
                </span>
              </span>
            </Card>
          </button>
          {/* Water reflection: the card's lower quarter mirrored, rippled by #hero-ripple (HeroFloor) and faded out. */}
          <span
            aria-hidden="true"
            data-panel-reflection=""
            className={`mt-1.5 block aspect-[16/4] ${CARD_W} overflow-hidden rounded-[10px] opacity-35 [filter:url(#hero-ripple)] [mask-image:linear-gradient(to_bottom,rgb(0_0_0/0.9),transparent_85%)]`}
          >
            <Card image={image} hot={false} className="-scale-y-100" />
          </span>
        </li>
      );
    });

  return (
    <div role="group" aria-label={copy.wallLabel}>
      <div className="relative flex items-center justify-center px-4 pb-3">
        <p className="flex min-h-11 items-center text-[11px] uppercase tracking-[0.3em] text-[rgb(255_255_255/0.7)]">{copy.heroRecent}</p>
        {motion && (
          <button
            type="button"
            data-hero-pause=""
            aria-label={copy.heroPause}
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
            className="absolute right-4 top-0 inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border border-[rgb(255_255_255/0.3)] bg-[rgb(0_0_0/0.5)] px-3 text-xs text-[#fff] hover:bg-[rgb(255_255_255/0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff]"
          >
            {paused ? <Play aria-hidden="true" className="size-3.5" /> : <Pause aria-hidden="true" className="size-3.5" />}
            <span aria-hidden="true">{paused ? copy.heroPlay : copy.heroPause}</span>
          </button>
        )}
      </div>
      {/* Small screens, coarse pointers and reduced motion: a snap carousel. Desktop: the track runs (fuse-marquee in hero.css). */}
      <div className="snap-x snap-mandatory overflow-x-auto px-[10vw] pb-4 motion-reduce:overflow-x-auto lg:pointer-fine:motion-safe:snap-none lg:pointer-fine:motion-safe:overflow-hidden lg:pointer-fine:motion-safe:px-0">
        {/* pr-5 closes the last gap so -50 % is exactly one set wide. */}
        <ul
          data-hero-track=""
          className={`flex w-max gap-5 pr-5 lg:pointer-fine:motion-safe:animate-[fuse-marquee_70s_linear_infinite] hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none ${paused ? "[animation-play-state:paused]!" : ""}`}
        >
          {set(false)}
          {set(true)}
        </ul>
      </div>
    </div>
  );
}
