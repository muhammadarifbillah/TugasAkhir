"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, m, useInView } from "motion/react";
import { ChevronDown, CodeXml, CornerLeftUp, Download, PackageCheck, PencilRuler, ScanSearch, Search, Undo2 } from "lucide-react";
import { Hallmark } from "@/components/landing/hallmark";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { buildMatrixCsv, type MatrixRow } from "@/lib/matrix-csv";
import { EASE } from "../motion";
import { useAmbientMotion } from "../use-ambient-motion";
import { LOOP_VIEW, loopLayout } from "./loop-geometry";

export interface LoopGate {
  code: string;
  title: string;
  why: string;
  artifact: string;
  nist: string[];
  iso: string[];
  steps: { label: string; nist: string[]; iso: string[] }[];
}

type Labels = Dictionary["landing"]["loop"] & { nist: string; iso: string; artifact: string };
type Stage = 1 | 2 | 3 | 4 | 5;

const ICONS: Record<string, React.ElementType> = {
  analysis: Search,
  design: PencilRuler,
  development: CodeXml,
  testing: ScanSearch,
  handover: PackageCheck,
};

const STATION =
  "relative flex size-16 items-center justify-center rounded-2xl border border-[color-mix(in_oklab,var(--fuse-accent-text)_35%,transparent)] bg-card text-[var(--fuse-accent-text)] shadow-[var(--fuse-shadow-soft),var(--fuse-sheen)] transition-colors hover:border-[var(--fuse-accent-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-[var(--fuse-accent-text)] aria-pressed:bg-[color-mix(in_oklab,var(--fuse-accent-text)_18%,var(--card))]";

function StationButton({ gate, i, selected, label, onSelect, mobile }: {
  gate: LoopGate; i: number; selected: boolean; label: string; onSelect: () => void; mobile?: boolean;
}) {
  const Icon = ICONS[gate.code] ?? Search;
  const data = mobile ? { "data-loop-station-m": i } : { "data-loop-station": i };
  return (
    <button type="button" {...data} aria-pressed={selected} aria-label={label} onClick={onSelect} className={STATION}>
      <Icon className="size-7" aria-hidden="true" />
      <Hallmark stage={(i + 1) as Stage} className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-card" />
    </button>
  );
}

function StationText({ gate, i, substeps }: { gate: LoopGate; i: number; substeps: string }) {
  return (
    <>
      <p className="font-wide text-3xl tabular-nums text-muted-foreground">0{i + 1}</p>
      <p className="mt-1 font-semibold leading-snug">{gate.title}</p>
      <p className="mt-1 text-sm leading-snug text-muted-foreground">{gate.why}</p>
      <p className="mt-1 text-xs text-[var(--fuse-accent-text)]">{substeps}</p>
    </>
  );
}

/** Centre line of a raised lane: drawn once on first view where ambient motion is allowed, else static. */
function CentreLine({ d, colour, ambient }: { d: string; colour: string; ambient: boolean }) {
  const common = { d, fill: "none", stroke: colour, strokeWidth: 2.5, strokeLinecap: "round" as const };
  if (!ambient) return <path {...common} strokeDasharray="6 8" />;
  return (
    <m.path
      {...common}
      initial={{ pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 1.4, ease: EASE }}
    />
  );
}

/** The five gates as one loop: a winding lane left to right, and a revision lane back to gate 1. */
export function GateLoop({ gates, labels, matrix }: { gates: LoopGate[]; labels: Labels; matrix: MatrixRow[] }) {
  const [selected, setSelected] = useState(0);
  const ambient = useAmbientMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  const dotRef = useRef<SVGAnimateMotionElement>(null);
  const pathId = `loop-path-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const layout = loopLayout(gates.length);
  const showDot = ambient && inView;
  const total = gates.reduce((n, g) => n + g.steps.length, 0);
  const stationLabel = (i: number) => fmt(labels.stationLabel, { n: i + 1, title: gates[i].title });
  const g = gates[selected];

  // One trip round the loop (4.5 s, under the WCAG 2.2.2 five-second limit), never repeated.
  useEffect(() => {
    if (showDot) dotRef.current?.beginElement();
  }, [showDot]);

  const download = () => {
    const blob = new Blob(["\uFEFF" + buildMatrixCsv(matrix)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "saksi-matriks-nist-iso.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <MotionConfig skipAnimations={false}>
      <div ref={ref}>
        <div className="mb-8 text-center">
          <p className="font-medium">{fmt(labels.total, { count: total })}</p>
          <p className="mt-1 text-sm text-muted-foreground">{labels.hint}</p>
        </div>

        <div className="relative hidden aspect-[1000/520] lg:block">
          <svg viewBox={`0 0 ${LOOP_VIEW.width} ${LOOP_VIEW.height}`} aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
            <path id={pathId} d={`${layout.forward} ${layout.back}`} fill="none" stroke="none" />
            {[layout.forward, layout.back].map((d, k) => (
              <g key={d} {...(k === 1 ? { "data-loop-return": "" } : {})}>
                <path d={d} fill="none" stroke="var(--card)" strokeWidth={28} strokeLinecap="round" />
                <path d={d} fill="none" stroke="var(--clay-surface-hi)" strokeWidth={20} strokeLinecap="round" opacity={0.6} />
              </g>
            ))}
            <CentreLine d={layout.forward} colour="var(--fuse-accent-text)" ambient={ambient} />
            <path data-loop-return="" d={layout.back} fill="none" stroke="var(--ring)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="6 8" />
            {layout.arrows.map((a) => (
              <polygon
                key={`${a.x}-${a.y}`}
                data-loop-arrow={a.dir}
                points="-6,-6 7,0 -6,6"
                transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}
                fill={a.dir === "back" ? "var(--ring)" : "var(--fuse-accent-text)"}
              />
            ))}
            {showDot && (
              <circle r="7" data-loop-dot="" fill="var(--fuse-accent-text)">
                <animateMotion ref={dotRef} dur="4.5s" repeatCount="1" fill="freeze" begin="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
          </svg>

          {layout.stations.map((s, i) => (
            <div
              key={gates[i].code}
              className="absolute w-44 -translate-x-1/2 -translate-y-8 text-center"
              style={{ left: `${s.x / 10}%`, top: `${s.y / 5.2}%` }}
            >
              <div className="flex justify-center">
                <StationButton gate={gates[i]} i={i} selected={selected === i} label={stationLabel(i)} onSelect={() => setSelected(i)} />
              </div>
              <div className="mt-3">
                <StationText gate={gates[i]} i={i} substeps={fmt(labels.substeps, { count: gates[i].steps.length })} />
              </div>
            </div>
          ))}

          <div
            className="absolute w-96 -translate-x-1/2 text-center"
            style={{ left: `${layout.returnLabel.x / 10}%`, top: `${layout.returnLabel.y / 5.2}%` }}
          >
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <Undo2 className="size-4 text-[var(--ring)]" aria-hidden="true" />
              {labels.returnLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{labels.returnNote}</p>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="relative pr-10">
            <ol className="space-y-2">
              {gates.map((gate, i) => (
                <li key={gate.code} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <StationButton gate={gate} i={i} selected={selected === i} label={stationLabel(i)} onSelect={() => setSelected(i)} mobile />
                    {i < gates.length - 1 && (
                      <span aria-hidden="true" className="mt-2 flex flex-1 flex-col items-center text-muted-foreground">
                        <span className="w-px flex-1 bg-[var(--border)]" />
                        <ChevronDown className="size-4" />
                      </span>
                    )}
                  </div>
                  <div className="pb-6">
                    <StationText gate={gate} i={i} substeps={fmt(labels.substeps, { count: gate.steps.length })} />
                  </div>
                </li>
              ))}
            </ol>
            <span aria-hidden="true" className="absolute bottom-0 right-3 top-6 border-r-2 border-dashed border-[var(--ring)]" />
            <CornerLeftUp aria-hidden="true" className="absolute right-0 top-0 size-6 text-[var(--ring)]" />
          </div>
          <p className="mt-4 flex items-center gap-2 text-sm font-medium">
            <Undo2 className="size-4 shrink-0 text-[var(--ring)]" aria-hidden="true" />
            {labels.returnLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{labels.returnNote}</p>
        </div>

        <div aria-live="polite" className="mt-10">
          <AnimatePresence mode="wait" initial={false}>
            <m.div
              key={selected}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="clay-card grid gap-8 p-7 md:grid-cols-2 md:p-9"
              style={{ boxShadow: `var(--clay-shadow), inset 0 3px 0 var(--stage-${selected + 1})` }}
            >
              <div>
                <h3 className="flex items-center gap-2 text-xl font-semibold">
                  <Hallmark stage={(selected + 1) as Stage} />
                  {stationLabel(selected)}
                </h3>
                <p className="mt-2 leading-relaxed text-muted-foreground">{g.why}</p>
                <dl className="mt-5 space-y-2 text-sm">
                  <div className="flex gap-2">
                    <dt className="font-medium">{labels.artifact}</dt>
                    <dd className="text-muted-foreground">{g.artifact}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">{labels.nist}</dt>
                    <dd className="font-mono text-xs leading-5">{g.nist.join(", ")}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="font-medium">{labels.iso}</dt>
                    <dd className="font-mono text-xs leading-5">{g.iso.join(", ")}</dd>
                  </div>
                </dl>
                <button type="button" className="clay-btn mt-6" onClick={download}>
                  <Download className="size-4" aria-hidden="true" />
                  {fmt(labels.download, { count: matrix.length })}
                </button>
              </div>
              <div>
                <h4 className="font-narrow text-base">{labels.substepsTitle}</h4>
                <ol className="mt-3 divide-y divide-[var(--border)] text-sm">
                  {g.steps.map((s) => (
                    <li key={s.label} className="py-2.5">
                      {s.label}
                      <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                        {[...s.nist, ...s.iso].join(" · ")}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}
