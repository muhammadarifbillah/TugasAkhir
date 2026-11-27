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
      className="relative isolate overflow-hidden bg-[#000] pb-12 text-[#fff] [color-scheme:dark] lg:min-h-[calc(100svh-3.5rem)] lg:pb-20"
    >
      <HeroBackdrop className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[clamp(13rem,36vw,32.5rem)] w-full" />
      <div className="relative mx-auto max-w-3xl px-4 pt-[clamp(4.5rem,9vw,8.5rem)] text-center">
        <h1 className="font-wide text-balance text-2xl text-[#fff] md:text-3xl lg:text-4xl">{headline}</h1>
        <p className="mx-auto mt-3 max-w-[52ch] text-sm leading-relaxed text-[#fff]/70 md:text-base">{sub}</p>
        <Link
          href={ctaHref}
          className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#fff] px-6 text-sm font-medium text-[#000] transition-colors hover:bg-[#dfe6ee] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#000] motion-reduce:transition-none"
        >
          {ctaLabel}
        </Link>
      </div>
      <div className="relative z-[1] mt-8 lg:mt-10">
        <HeroWall />
      </div>
      <HeroFloor className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[34%] w-full" />
      <HeroGrass className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-10 w-full lg:h-[72px]" />
      <div className="relative z-[4] mt-2 text-center">
        <p className="text-sm text-[#fff]/60">{copy.hint}</p>
        <p className="mt-1 text-xs text-[#fff]/60">{labels.galleryLabel}</p>
      </div>
    </section>
  );
}
