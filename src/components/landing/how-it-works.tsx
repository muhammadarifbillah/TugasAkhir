"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { HowVignette, type VignetteCopy } from "@/components/landing/how-vignettes";
import { EASE } from "@/components/landing/motion";
import { Reveal } from "@/components/landing/reveal";
import { tabKeyNav } from "@/components/studio/tab-key-nav";
import { cn } from "@/lib/utils";

/**
 * Six-step flow as tabs (vertical on lg, a scrollable row below). User-driven:
 * nothing advances on its own, so no pause control is needed.
 */
export function HowItWorks({
  steps,
  copy,
  label,
}: {
  steps: { title: string; desc: string }[];
  copy: VignetteCopy;
  label: string;
}) {
  const [active, setActive] = useState(0);
  const ids = steps.map((_, i) => String(i));

  return (
    <Reveal className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-10">
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="vertical"
        className="flex min-w-0 gap-2 overflow-x-auto pb-1 scrollbar-none lg:flex-col lg:overflow-visible lg:pb-0"
        onKeyDown={(e) => tabKeyNav(e, ids, String(active), (v) => setActive(Number(v)))}
      >
        {steps.map((s, i) => {
          const selected = i === active;
          return (
            <button
              key={s.title}
              type="button"
              role="tab"
              id={`how-tab-${i}`}
              aria-selected={selected}
              aria-controls="how-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(i)}
              className={cn(
                "relative isolate flex shrink-0 gap-3 rounded-xl px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:shrink",
                selected ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selected && (
                <m.span
                  layoutId="how-indicator"
                  className="soft-card absolute inset-0 -z-10"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  aria-hidden="true"
                />
              )}
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums",
                  selected && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {i + 1}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{s.title}</span>
                <span className="mt-0.5 hidden text-sm leading-relaxed text-muted-foreground lg:block">{s.desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${active}`}
        className="soft-card relative min-h-[18rem] overflow-hidden lg:self-start"
      >
        <p className="border-b px-5 py-3 text-sm text-muted-foreground lg:hidden">{steps[active].desc}</p>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="h-full"
          >
            <HowVignette step={active} copy={copy} />
          </m.div>
        </AnimatePresence>
      </div>
    </Reveal>
  );
}
