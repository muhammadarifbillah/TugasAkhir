"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(useGSAP, ScrollTrigger);

// Large screens get the pinned story; smaller ones get the stacked list. Under reduced
// motion the story still pins but panels only crossfade (no travel, no auto-snap).
const CONDITIONS = { large: "(min-width: 1024px)", reduce: "(prefers-reduced-motion: reduce)" };

export interface StageScrollStoryProps {
  title: string;
  steps: { title: string; artifact: string }[];
  codes: readonly { nist: string; iso: string }[];
  labels: { artifact: string; nist: string; iso: string };
}

/**
 * Landing scroll story: the section pins and each scroll step reveals the next
 * Secure SDLC stage with its artefact and NIST -> ISO mapping. The server
 * renders all five panels stacked, so the content is complete without JS and
 * for screen readers (panels are hidden with opacity only).
 */
export function StageScrollStory({ title, steps, codes, labels }: StageScrollStoryProps) {
  const container = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const root = container.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add(CONDITIONS, (ctx) => {
        const { large, reduce } = ctx.conditions as { large: boolean; reduce: boolean };
        if (!large) return;
        const shift = reduce ? 0 : 24;
        const panels = gsap.utils.toArray<HTMLElement>("[data-panel]", root);
        const segments = gsap.utils.toArray<HTMLElement>("[data-segment]", root);
        const last = panels.length - 1;
        // The app scrolls inside <main id="main">, not the window. Passed as an element:
        // string selectors would be resolved inside the useGSAP scope and miss it.
        const scroller = document.getElementById("main");
        if (!scroller || last < 1) return;
        root.dataset.pinned = "true";

        gsap.set(panels.slice(1), { opacity: 0, y: shift });
        gsap.set(segments.slice(1), { scaleX: 0 });

        const tl = gsap.timeline({
          defaults: { ease: "power2.out", duration: 1 },
          scrollTrigger: {
            trigger: root,
            scroller,
            pin: true,
            pinType: "transform",
            scrub: 0.5,
            start: "top top+=24",
            end: () => `+=${last * 90}%`,
            // inertia off: a fast wheel flick must land on the next stage, not fly to the last one.
            // Snapping auto-scrolls the page, so it is skipped under reduced motion.
            snap: reduce
              ? undefined
              : { snapTo: 1 / last, inertia: false, duration: { min: 0.2, max: 0.5 }, ease: "power1.inOut" },
            invalidateOnRefresh: true,
          },
        });
        for (let i = 1; i <= last; i++) {
          tl.to(panels[i - 1], { opacity: 0, y: -shift }, i - 1)
            .to(panels[i], { opacity: 1, y: 0 }, i - 1)
            .to(segments[i], { scaleX: 1 }, i - 1);
        }

        // Fonts change line heights, which changes the pin distance.
        document.fonts?.ready.then(() => ScrollTrigger.refresh());

        return () => {
          delete root.dataset.pinned;
        };
      });
      return () => mm.revert();
    },
    { scope: container, dependencies: [steps.length] },
  );

  return (
    <section ref={container} aria-labelledby="stage-story-title" className="group/story mt-20">
      <h2 id="stage-story-title" className="display-type text-2xl md:text-3xl">
        {title}
      </h2>

      <div className="mt-6 grid grid-cols-5 gap-1" aria-hidden="true">
        {codes.map((c, i) => (
          <span key={c.nist} className="relative h-1.5 overflow-hidden rounded-sm bg-muted">
            <span
              data-segment
              className="absolute inset-0 origin-left"
              style={{ background: `var(--stage-${i + 1})` }}
            />
          </span>
        ))}
      </div>

      {/* Stacked by default; when pinned, every panel shares one grid cell. */}
      <ol className="mt-6 flex flex-col gap-4 group-data-[pinned=true]/story:grid group-data-[pinned=true]/story:min-h-[22rem] group-data-[pinned=true]/story:gap-0">
        {steps.map((step, i) => (
          <li
            key={step.title}
            data-panel
            className="grid gap-6 rounded-lg border bg-card p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] group-data-[pinned=true]/story:[grid-area:1/1] group-data-[pinned=true]/story:p-10"
          >
            <div>
              <span
                className="display-type block text-5xl tabular-nums group-data-[pinned=true]/story:text-7xl"
                style={{ color: `var(--stage-${i + 1})` }}
              >
                {i + 1}
              </span>
              <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {labels.artifact}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.artifact}</p>
            </div>
            <dl className="flex flex-col justify-center gap-4 border-t pt-4 md:border-s md:border-t-0 md:ps-6 md:pt-0">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{labels.nist}</dt>
                <dd className="mt-1 font-mono text-lg font-semibold">{codes[i].nist}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{labels.iso}</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {codes[i].iso.split(", ").map((iso) => (
                    <span key={iso} className="rounded-md border px-2 py-0.5 font-mono text-sm">
                      {iso}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </li>
        ))}
      </ol>
    </section>
  );
}
