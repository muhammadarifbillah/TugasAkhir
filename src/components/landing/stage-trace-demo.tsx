"use client";

import { useEffect, useRef, useState } from "react";
import { m, useInView } from "motion/react";
import { Pause, Play } from "lucide-react";

const START = 2; // matches the static server HTML: two stages passed, the third running
const TICK_MS = 1800;

export interface StageTraceDemoProps {
  steps: { title: string }[];
  codes: readonly { nist: string }[];
  labels: {
    title: string;
    meta: string;
    pass: string;
    running: string;
    waiting: string;
    pause: string;
    play: string;
  };
}

/**
 * The landing hero card: one project moving through the five gates. It cycles
 * only while visible and playing. Only text, colour and bar fill change (no
 * travel), so it also runs under reduced motion; the pause button covers
 * WCAG 2.2.2 for auto-updating content.
 */
export function StageTraceDemo({ steps, codes, labels }: StageTraceDemoProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [playing, setPlaying] = useState(true);
  const [running, setRunning] = useState(START);
  const active = inView && playing;

  useEffect(() => {
    if (!active) return;
    // steps.length is the "all passed" frame before starting over.
    const id = setInterval(() => setRunning((r) => (r >= steps.length ? 0 : r + 1)), TICK_MS);
    return () => clearInterval(id);
  }, [active, steps.length]);

  const status = (i: number) =>
    i < running ? labels.pass : i === running ? labels.running : labels.waiting;
  // Status colours stay semantic: the stage ramp must never read as a warning.
  const color = (i: number) =>
    i < running ? "var(--success)" : i === running ? "var(--primary)" : "var(--muted-foreground)";

  return (
    <div ref={ref} className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <p className="text-sm font-semibold">{labels.title}</p>
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted-foreground">{labels.meta}</p>
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? labels.pause : labels.play}
            title={playing ? labels.pause : labels.play}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {playing ? <Pause className="size-3.5" aria-hidden="true" /> : <Play className="size-3.5" aria-hidden="true" />}
          </button>
        </div>
      </div>
      <div className="px-4 pt-3" aria-hidden="true">
        <div className="grid grid-cols-5 gap-1">
          {codes.map((c, i) => (
            <span key={c.nist} className="relative h-1.5 overflow-hidden rounded-sm bg-muted">
              <m.span
                className="absolute inset-y-0 left-0"
                style={{ background: `var(--stage-${i + 1})` }}
                initial={false}
                animate={{ width: i < running ? "100%" : i === running ? "55%" : "0%" }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
          ))}
        </div>
      </div>
      <ol className="px-4 pb-2 pt-2">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-start gap-3 border-t py-2.5 text-sm first:border-t-0"
          >
            <span className="pt-0.5 text-xs font-bold tabular-nums" style={{ color: `var(--stage-${i + 1})` }}>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{step.title}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">{codes[i].nist}</span>
            </span>
            <span className="pt-0.5 text-xs font-medium transition-colors duration-300" style={{ color: color(i) }}>
              {status(i)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
