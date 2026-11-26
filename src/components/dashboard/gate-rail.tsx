import { Hallmark } from "@/components/landing/hallmark";
import { fmt } from "@/lib/format";
import { gateRail } from "@/lib/dashboard-view";

export function GateRail({
  activeStage,
  stageProgress,
  stageNames,
  labels,
  compact = false,
}: {
  activeStage: string;
  stageProgress: { completed: number; total: number };
  stageNames: string[];
  labels: { gates: string; gateActive: string; allDone: string };
  /** Card already shows the hallmark + label row, so drop it here. */
  compact?: boolean;
}) {
  const { segments, activeIndex } = gateRail(activeStage, stageProgress);
  return (
    <div className="flex flex-col gap-1.5">
      <span className={compact ? "sr-only" : "text-[11px] text-muted-foreground"}>{labels.gates}</span>
      <div aria-hidden="true" className="flex gap-1.5">
        {segments.map((s) => (
          <span
            key={s.code}
            data-gate-segment=""
            data-state={s.state}
            className={`h-2 flex-1 rounded-full ${
              s.state === "active" ? "border-2 bg-transparent" : s.state === "pending" ? "bg-muted" : ""
            }`}
            style={
              s.state === "done"
                ? { background: `var(--stage-${s.n})` }
                : s.state === "active"
                  ? { borderColor: `var(--stage-${s.n})` }
                  : undefined
            }
          />
        ))}
      </div>
      {!compact && (
        <p className="flex items-center gap-1.5 text-xs">
          <Hallmark stage={activeIndex === null ? 5 : segments[activeIndex]!.n} className="size-4" />
          <span>
            {activeIndex === null
              ? labels.allDone
              : `${fmt(labels.gateActive, { n: activeIndex + 1 })} · ${stageNames[activeIndex] ?? ""}`}
          </span>
        </p>
      )}
    </div>
  );
}
