"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { m, useReducedMotion } from "motion/react";
import { RotateCcw } from "lucide-react";
import { Hallmark } from "@/components/landing/hallmark";
import { isDesktop } from "@/components/landing/landing-motion";
import { EASE } from "@/components/landing/motion";
import { railSchedule } from "@/lib/rail-schedule";

const STEP_MS = 750;

export interface RailGate {
  title: string;
  nist: string;
  celsius: number;
  colourName: string;
}

/**
 * Hero signature: one project's steel bar heating through the five temper
 * colours, each gate stamped with its hallmark as it passes. Plays once on
 * desktop (< 5 s, so no pause control is needed under WCAG 2.2.2) and can be
 * replayed; the server, mobile and no-JS render the finished state.
 */
export function TemperRail({
  gates,
  labels,
}: {
  gates: RailGate[];
  labels: { label: string; passed: string; waiting: string; summary: string; replay: string };
}) {
  const ref = useRef<HTMLElement>(null);
  const timers = useRef<number[]>([]);
  const [step, setStep] = useState(gates.length);
  const [run, setRun] = useState(0);
  const reduce = useReducedMotion();

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = railSchedule(STEP_MS, gates.length).map(({ at, step: s }) =>
      window.setTimeout(() => setStep(s), at),
    );
    setRun((r) => r + 1);
  }, [gates.length]);

  useEffect(() => {
    const el = ref.current;
    const r = el?.getBoundingClientRect();
    // Only on desktop and only if the rail is on screen at load; otherwise keep the final state.
    if (isDesktop() && r && r.top < window.innerHeight && r.bottom > 0) {
      const id = window.setTimeout(play, 300);
      timers.current.push(id);
    }
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, [play]);

  const done = step >= gates.length;

  return (
    <figure ref={ref} className="card-elevated rounded-xl border bg-card p-5 md:p-6">
      <figcaption className="flex items-center justify-between gap-3">
        <span className="font-narrow text-sm text-muted-foreground">{labels.label}</span>
        <button
          type="button"
          onClick={play}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:hidden"
        >
          <RotateCcw className="size-3.5" aria-hidden="true" />
          {labels.replay}
        </button>
      </figcaption>

      <ol className="mt-5 grid grid-cols-5 gap-1">
        {gates.map((g, i) => {
          const passed = step > i;
          const stage = (i + 1) as 1 | 2 | 3 | 4 | 5;
          return (
            <li key={g.title} className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="relative inline-flex">
                  <m.span
                    className="inline-flex"
                    initial={false}
                    animate={{ scale: passed && run > 0 && !reduce ? [1.15, 1] : 1, opacity: passed ? 1 : 0.35 }}
                    transition={{ duration: 0.22, ease: EASE }}
                  >
                    <Hallmark stage={stage} className="size-4 md:size-5" />
                  </m.span>
                  {passed && run > 0 && !reduce && (
                    <m.span
                      key={`ring-${run}`}
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 rounded-full border"
                      style={{ borderColor: `var(--stage-${stage})` }}
                      initial={{ opacity: 0.6, scale: 1 }}
                      animate={{ opacity: 0, scale: 1.8 }}
                      transition={{ duration: 0.6, ease: EASE }}
                    />
                  )}
                </span>
                <span className="font-narrow text-xs tabular-nums text-muted-foreground">{g.celsius}°</span>
              </div>

              <span className="mt-2 block h-2 overflow-hidden rounded-sm bg-muted" aria-hidden="true">
                <m.span
                  className="block h-full origin-left"
                  style={{ background: `var(--stage-${stage})` }}
                  initial={false}
                  animate={{ scaleX: passed ? (run > 0 && !reduce ? [0, 1.04, 1] : 1) : 0 }}
                  // A replay resets instantly; only the heating is animated.
                  transition={passed ? { duration: 0.6, ease: EASE } : { duration: 0 }}
                />
              </span>

              <p className="font-narrow mt-2 line-clamp-2 min-h-[2lh] text-xs leading-tight md:text-sm">
                {g.title}
              </p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{g.nist}</p>
              <p
                className="mt-1 text-xs font-medium transition-colors duration-300"
                style={{ color: passed ? "var(--success)" : "var(--muted-foreground)" }}
              >
                {passed ? labels.passed : labels.waiting}
              </p>
              <span className="sr-only">{g.colourName}</span>
            </li>
          );
        })}
      </ol>

      <m.p
        className="mt-5 border-t border-[var(--ledger-rule)] pt-4 text-sm font-medium"
        initial={false}
        animate={{ opacity: done ? 1 : 0.25 }}
        transition={{ duration: 0.3 }}
      >
        {labels.summary}
      </m.p>
    </figure>
  );
}
