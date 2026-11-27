"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, m, useInView } from "motion/react";
import { CodeXml, CornerLeftUp, Download, PackageCheck, PencilRuler, ScanSearch, Search, Undo2 } from "lucide-react";
import { Hallmark } from "@/components/landing/hallmark";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { buildMatrixCsv, type MatrixRow } from "@/lib/matrix-csv";
import { EASE } from "../motion";
import { useAmbientMotion } from "../use-ambient-motion";
import { LANE_DROP, LANE_HALF, LOOP_VIEW, loopLayout } from "./loop-geometry";

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
  "relative flex size-22 items-center justify-center rounded-[1.5rem] border border-[#4A7FA7]/45 bg-[#B3CFE5]/25 text-[#1A3D63] shadow-[inset_0_1px_0_rgb(246_250_253/0.35),0_14px_24px_-12px_rgb(10_25_49/0.7)] transition-colors hover:border-[#1A3D63] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-[#1A3D63] aria-pressed:ring-2 aria-pressed:ring-[#4A7FA7]/50 dark:border-[#B3CFE5]/45 dark:bg-[#F6FAFD]/10 dark:text-[#B3CFE5] dark:hover:border-[#B3CFE5] dark:aria-pressed:border-[#B3CFE5] dark:aria-pressed:ring-[#B3CFE5]/40";

function StationButton({ gate, i, selected, label, onSelect, mobile }: {
  gate: LoopGate; i: number; selected: boolean; label: string; onSelect: () => void; mobile?: boolean;
}) {
  const Icon = ICONS[gate.code] ?? Search;
  const data = mobile ? { "data-loop-station-m": i } : { "data-loop-station": i };
  return (
    <button type="button" {...data} data-loop-glass="" aria-pressed={selected} aria-label={label} onClick={onSelect} className={STATION}>
      <Icon className="size-8" aria-hidden="true" />
      <Hallmark stage={(i + 1) as Stage} className="absolute -right-1.5 -top-1.5 size-4 rounded-full bg-card" />
    </button>
  );
}

function StationText({ gate, i, substeps, mobile }: { gate: LoopGate; i: number; substeps: string; mobile?: boolean }) {
  return (
    <>
      <p className="font-wide text-3xl leading-none tabular-nums text-[#1A3D63]/55 xl:text-[40px] dark:text-[#B3CFE5]/55">0{i + 1}</p>
      <p className={`mt-1 font-semibold leading-snug text-foreground ${mobile ? "" : "text-sm xl:text-base"}`}>{gate.title}</p>
      <p className={`mt-0.5 leading-snug text-muted-foreground ${mobile ? "text-sm" : "text-xs xl:text-sm"}`}>{gate.why}</p>
      <p className="mt-0.5 text-xs text-[var(--fuse-accent-text)]">{substeps}</p>
    </>
  );
}

/** Raised lane: dark side dropped LANE_DROP below, deep-to-steel surface, glowing mist edge on top. */
function Lane({ d, kind, gradient }: { d: string; kind: "forward" | "back"; gradient: string }) {
  const common = { d, fill: "none", strokeLinecap: "round" as const };
  return (
    <g data-loop-lane={kind} {...(kind === "back" ? { "data-loop-return": "" } : {})}>
      <path {...common} data-lane-layer="side" stroke="#0A1931" strokeWidth={2 * LANE_HALF} transform={`translate(0 ${LANE_DROP})`} />
      <path {...common} data-lane-layer="surface" stroke={`url(#${gradient})`} strokeWidth={2 * LANE_HALF} />
      <path
        {...common}
        data-lane-layer="edge"
        stroke="#B3CFE5"
        strokeWidth={2}
        strokeOpacity={0.7}
        transform={`translate(0 ${1 - LANE_HALF})`}
        style={{ filter: "drop-shadow(0 0 4px rgb(179 207 229 / 0.7))" }}
      />
    </g>
  );
}

/** The same raised lane, vertical, for the mobile list. */
function MobileLane({ kind, className }: { kind: "forward" | "back"; className: string }) {
  return (
    <div data-loop-lane-m={kind} aria-hidden="true" className={`absolute w-6 ${className}`}>
      <span data-lane-layer="side" className="absolute inset-y-0 left-0 w-6 translate-x-[4px] translate-y-[6px] rounded-full bg-[#0A1931]" />
      <span data-lane-layer="surface" className="absolute inset-y-0 left-0 w-6 rounded-full bg-[linear-gradient(180deg,#4A7FA7,#1A3D63)]" />
      <span data-lane-layer="edge" className="absolute inset-y-0 left-0 w-px bg-[#B3CFE5]/70" />
    </div>
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

        <div className="relative hidden aspect-[1000/680] lg:block">
          <svg viewBox={`0 0 ${LOOP_VIEW.width} ${LOOP_VIEW.height}`} aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
            <defs>
              <linearGradient id={`${pathId}-surface`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#4A7FA7" />
                <stop offset="1" stopColor="#1A3D63" />
              </linearGradient>
            </defs>
            <path id={pathId} d={`${layout.forward} ${layout.back}`} fill="none" stroke="none" />
            <Lane d={layout.back} kind="back" gradient={`${pathId}-surface`} />
            <Lane d={layout.forward} kind="forward" gradient={`${pathId}-surface`} />
            <CentreLine d={layout.forward} colour="#B3CFE5" ambient={ambient} />
            {layout.arrows.map((a) => (
              <polygon
                key={`${a.x}-${a.y}`}
                data-loop-arrow={a.dir}
                points="-6,-6 7,0 -6,6"
                transform={`translate(${a.x} ${a.y}) rotate(${a.angle})`}
                fill="#B3CFE5"
              />
            ))}
            {showDot && (
              <circle r="7" data-loop-dot="" fill="#F6FAFD">
                <animateMotion ref={dotRef} dur="4.5s" repeatCount="1" fill="freeze" begin="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
          </svg>

          {layout.stations.map((s, i) => (
            <div
              key={gates[i].code}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${s.x / 10}%`, top: `${(s.y * 100) / LOOP_VIEW.height}%` }}
            >
              <StationButton gate={gates[i]} i={i} selected={selected === i} label={stationLabel(i)} onSelect={() => setSelected(i)} />
            </div>
          ))}

          {layout.labels.map((box, i) => (
            <div
              key={gates[i].code}
              data-loop-text=""
              className={`absolute flex flex-col text-left ${i % 2 === 0 ? "justify-end" : "justify-start"}`}
              style={{
                left: `${box.x / 10}%`,
                top: `${(box.y * 100) / LOOP_VIEW.height}%`,
                width: `${box.w / 10}%`,
                height: `${(box.h * 100) / LOOP_VIEW.height}%`,
              }}
            >
              <StationText gate={gates[i]} i={i} substeps={fmt(labels.substeps, { count: gates[i].steps.length })} />
            </div>
          ))}

          <div
            className="absolute w-96 -translate-x-1/2 text-center"
            style={{ left: `${layout.returnLabel.x / 10}%`, top: `${(layout.returnLabel.y * 100) / LOOP_VIEW.height}%` }}
          >
            <p className="flex items-center justify-center gap-2 text-sm font-medium">
              <Undo2 className="size-4 text-[var(--ring)]" aria-hidden="true" />
              {labels.returnLabel}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{labels.returnNote}</p>
          </div>
        </div>

        <div className="lg:hidden">
          <div className="relative pr-12">
            <MobileLane kind="forward" className="bottom-11 left-8 top-11" />
            <ol className="space-y-6">
              {gates.map((gate, i) => (
                <li key={gate.code} className="flex gap-4">
                  <div className="shrink-0">
                    <StationButton gate={gate} i={i} selected={selected === i} label={stationLabel(i)} onSelect={() => setSelected(i)} mobile />
                  </div>
                  <div>
                    <StationText gate={gate} i={i} substeps={fmt(labels.substeps, { count: gate.steps.length })} mobile />
                  </div>
                </li>
              ))}
            </ol>
            <MobileLane kind="back" className="bottom-0 right-2 top-8" />
            <CornerLeftUp aria-hidden="true" className="absolute right-1 top-0 size-6 text-[var(--ring)]" />
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
