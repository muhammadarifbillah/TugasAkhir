"use client";

import { useState } from "react";
import { m } from "motion/react";
import { ShieldCheck } from "lucide-react";
import { EASE } from "@/components/landing/motion";
import { cn } from "@/lib/utils";

export interface ArchNode {
  name: string;
  note: string;
}

// Node centres in a 100 × 50 diagram space: Studio–AI on top, the gate pipeline below.
const POS = [
  { x: 12, y: 12 },
  { x: 42, y: 12 },
  { x: 12, y: 38 },
  { x: 38, y: 38 },
  { x: 63, y: 38 },
  { x: 88, y: 38 },
];
const EDGES: [number, number][] = [
  [0, 1],
  [0, 2],
  [2, 3],
  [3, 4],
  [4, 5],
];

/** Splits "plain sentence. (technical detail) limit." into its three parts. */
function NoteParts({ note }: { note: string }) {
  const m1 = /^(.*?)\s*\((.*)\)\s*(.*)$/.exec(note);
  if (!m1) return <p>{note}</p>;
  return (
    <>
      <p className="leading-relaxed">{m1[1]}</p>
      <p className="mt-2 font-mono text-xs leading-relaxed text-muted-foreground">{m1[2]}</p>
      {m1[3] && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m1[3]}</p>}
    </>
  );
}

/**
 * §5 architecture: six parts of ShieldForge. On desktop a clickable diagram
 * with the selected part's note beside it (user-triggered motion only); on
 * mobile an ordered list with every note visible.
 */
export function ArchitectureFlow({
  nodes,
  lede,
  platformTitle,
  platform,
}: {
  nodes: ArchNode[];
  lede: string;
  platformTitle: string;
  platform: string[];
}) {
  const [sel, setSel] = useState(0);

  return (
    <>
      <div className="hidden gap-8 lg:grid lg:grid-cols-10">
        <div className="relative col-span-7 aspect-[2/1]">
          <svg viewBox="0 0 100 50" className="absolute inset-0 size-full" aria-hidden="true" preserveAspectRatio="none">
            {EDGES.map(([a, b]) => {
              const on = a === sel || b === sel;
              return (
                <g key={`${a}-${b}`}>
                  <line x1={POS[a].x} y1={POS[a].y} x2={POS[b].x} y2={POS[b].y} stroke="var(--border)" strokeWidth={0.4} vectorEffect="non-scaling-stroke" />
                  {on && (
                    <m.line
                      key={`on-${sel}`}
                      x1={POS[a].x}
                      y1={POS[a].y}
                      x2={POS[b].x}
                      y2={POS[b].y}
                      stroke="var(--primary)"
                      strokeWidth={2}
                      vectorEffect="non-scaling-stroke"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  )}
                </g>
              );
            })}
          </svg>
          {nodes.map((n, i) => (
            <button
              key={n.name}
              type="button"
              aria-pressed={sel === i}
              aria-controls="arch-note"
              onClick={() => setSel(i)}
              onFocus={() => setSel(i)}
              className={cn(
                "absolute flex min-h-11 -translate-x-1/2 -translate-y-1/2 items-center gap-2 whitespace-nowrap rounded-sm border bg-card px-3 py-2 text-sm font-medium transition-[outline-color,color] duration-150 focus-visible:outline-none",
                sel === i ? "outline-2 outline-offset-2 outline-[var(--primary)]" : "outline-2 outline-transparent hover:text-primary",
              )}
              style={{ left: `${POS[i].x}%`, top: `${POS[i].y * 2}%` }}
            >
              <span className="font-narrow text-xs tabular-nums text-muted-foreground">{i + 1}</span>
              {n.name}
            </button>
          ))}
        </div>
        <div className="col-span-3">
          <p className="font-narrow text-sm text-muted-foreground">{lede}</p>
          <div id="arch-note" aria-live="polite" className="mt-3 border-t-2 border-[var(--primary)] pt-4">
            <m.div key={sel} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
              <h3 className="text-lg font-semibold">{nodes[sel].name}</h3>
              <div className="mt-2">
                <NoteParts note={nodes[sel].note} />
              </div>
            </m.div>
          </div>
        </div>
      </div>

      <ol className="divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)] lg:hidden">
        {nodes.map((n, i) => (
          <li key={n.name} className="py-4">
            <h3 className="font-semibold">
              <span className="font-narrow me-2 text-sm tabular-nums text-muted-foreground">{i + 1}</span>
              {n.name}
            </h3>
            <div className="mt-1">
              <NoteParts note={n.note} />
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12 max-w-3xl">
        <h3 className="font-narrow text-base">{platformTitle}</h3>
        <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
          {platform.map((p) => (
            <li key={p} className="flex gap-3 py-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
