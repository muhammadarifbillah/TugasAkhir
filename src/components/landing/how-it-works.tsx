"use client";

import { useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { HowVignette, type VignetteCopy } from "@/components/landing/how-vignettes";
import { EASE } from "@/components/landing/motion";
import { tabKeyNav } from "@/components/studio/tab-key-nav";
import { cn } from "@/lib/utils";

/**
 * §4 six-step flow as tabs (vertical on lg, a scrollable row below). Motion
 * only answers the user's tab change; nothing advances on its own.
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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-10 lg:gap-8">
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="vertical"
        className="flex min-w-0 gap-1 overflow-x-auto pb-1 scrollbar-none lg:col-span-4 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0"
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
                "relative flex min-h-11 shrink-0 gap-3 rounded-2xl px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:shrink",
                selected ? "clay-card text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {selected && (
                <m.span
                  layoutId="how-indicator"
                  className="absolute inset-y-3 start-0 w-1 rounded-full bg-[var(--clay-line)] shadow-[0_0_12px_var(--clay-glow)] max-lg:inset-x-3 max-lg:inset-y-auto max-lg:bottom-0 max-lg:h-1 max-lg:w-auto"
                  transition={{ type: "spring", stiffness: 400, damping: 34 }}
                  aria-hidden="true"
                />
              )}
              <span className="font-narrow pt-0.5 text-sm tabular-nums">{i + 1}</span>
              <span className="min-w-0">
                <span className="block font-medium">{s.title}</span>
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
        className="clay-card relative min-h-[18rem] overflow-hidden lg:col-span-6 lg:self-start"
      >
        <p className="border-b px-5 py-3 text-sm text-muted-foreground lg:hidden">{steps[active].desc}</p>
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <HowVignette step={active} copy={copy} />
          </m.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
