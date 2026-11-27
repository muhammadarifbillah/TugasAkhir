"use client";

import Link from "next/link";
import { HeroWall } from "../gallery/hero-wall";
import { useGallery } from "../gallery/gallery-provider";
import { HeroBackdrop } from "./hero-backdrop";
import { HeroFloor } from "./hero-floor";
import { HeroGrass } from "./hero-grass";
import "./hero.css";

interface HeroSectionProps {
  headline: string;
  sub: string;
  ctaHref: string;
  ctaLabel: string;
}

/** Landing hero after herosection.jpeg: black room in both themes, moon sky, title with one button, concave wall, water floor, grass. */
export function HeroSection({ headline, sub, ctaHref, ctaLabel }: HeroSectionProps) {
  const { copy, labels } = useGallery();
  return (
    <section
      id="mulai-hero"
      className="relative isolate overflow-hidden bg-[#000] pb-12 text-[#fff] [color-scheme:dark] lg:flex lg:h-[calc(100svh-3.5rem)] lg:min-h-[640px] lg:flex-col lg:pb-0"
    >
      <HeroBackdrop className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[clamp(13rem,36vw,32.5rem)] w-full" />
      <div className="relative mx-auto max-w-3xl px-4 pt-[clamp(4.5rem,9vw,8.5rem)] text-center lg:pt-[clamp(4rem,12svh,7rem)]">
        <h1 className="font-wide text-balance text-2xl text-[#fff] md:text-3xl lg:text-4xl">{headline}</h1>
        <p className="mx-auto mt-2 max-w-[52ch] text-sm leading-relaxed text-[#fff]/70 md:text-base">{sub}</p>
        <Link
          href={ctaHref}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[#fff] px-6 text-sm font-medium text-[#000] transition-colors hover:bg-[#dfe6ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000] motion-reduce:transition-none"
        >
          {ctaLabel}
        </Link>
      </div>
      <div className="relative z-[1] mt-8 lg:mt-[clamp(0.25rem,2svh,1.5rem)]">
        <HeroWall />
      </div>
      {/* The floor stays behind the wall (z-0 < z-[1]): its burst and orbs light the water, never a panel. */}
      <HeroFloor className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[34%] w-full" />
      <HeroGrass className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10 w-full lg:h-[72px]" />
      <div className="relative z-[4] mt-2 text-center lg:absolute lg:inset-x-0 lg:bottom-[clamp(1.25rem,4svh,2.5rem)] lg:mt-0">
        <p className="text-sm text-[#fff]/60">{copy.hint}</p>
        <p className="mt-1 text-xs text-[#fff]/60">{labels.galleryLabel}</p>
      </div>
    </section>
  );
}
