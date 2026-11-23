"use client";

import { useState } from "react";
import { CheckCircle2, ChevronRight, Circle, ExternalLink, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CodeViewer } from "@/components/studio/code-editor";
import { fmt } from "@/lib/format";
import { levelBadgeClass, severityRank, severityVariant } from "@/lib/severity";
import { scoreBadgeVariant, scoreBand, scoreBgClass } from "@/lib/project-stats";
import type { Dictionary } from "@/lib/i18n";

export interface RecommendationRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  content: string;
  suggestedCode: string | null;
  filePath: string | null;
  isApplied: boolean;
  nistControl: { taskCode: string; iso27001Mapping: string[] } | null;
}

type WorkspaceDict = Dictionary["workspace"];

const LEVEL_KEYS: Record<string, keyof WorkspaceDict> = {
  low: "levelLow",
  medium: "levelMedium",
  high: "levelHigh",
  critical: "levelCritical",
  sensitive: "levelSensitive",
  restricted: "levelRestricted",
  public: "levelPublic",
  internal: "levelInternal",
};

/** Localised label for a severity / likelihood / classification value. */
export function levelLabel(level: string, dict: Dictionary): string {
  const key = LEVEL_KEYS[level.toLowerCase()];
  return key ? dict.workspace[key] : level;
}

export function SeverityBadge({ level, dict }: { level: string; dict: Dictionary }) {
  return <Badge variant={severityVariant(level)}>{levelLabel(level, dict)}</Badge>;
}

function LevelChip({ level, dict }: { level: string; dict: Dictionary }) {
  if (!level) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`inline-block rounded border px-1.5 py-0.5 text-[11px] font-medium ${levelBadgeClass(level)}`}>
      {levelLabel(level, dict)}
    </span>
  );
}

/** Title + one-line summary used on the Overview tab of the step-result dialog. */
export function OverviewSummary({ title, text }: { title: string; text: string }) {
  return (
    <div className="space-y-2 text-sm">
      <h4 className="font-semibold text-foreground">{title}</h4>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

export function EmptyResult({ text }: { text: string }) {
  return <p className="text-sm italic text-muted-foreground">{text}</p>;
}

export function NumberedList({
  items,
  tone = "primary",
}: {
  items: string[];
  tone?: "primary" | "success" | "info";
}) {
  const toneClass = {
    primary: "bg-primary/15 text-primary",
    success: "bg-success/15 text-success",
    info: "bg-info/15 text-info",
  }[tone];
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
          <span
            className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold tabular-nums ${toneClass}`}
            aria-hidden="true"
          >
            {i + 1}
          </span>
          <p className="text-sm text-muted-foreground">{item}</p>
        </li>
      ))}
    </ol>
  );
}

export function RecommendationCard({
  rec,
  dict,
  onToggleApplied,
  onAutoFix,
}: {
  rec: RecommendationRow;
  dict: Dictionary;
  onToggleApplied?: (rec: RecommendationRow) => void;
  onAutoFix?: (rec: RecommendationRow) => void;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <SeverityBadge level={rec.severity} dict={dict} />
        <Badge variant="muted">{rec.category}</Badge>
        {rec.nistControl && (
          <Badge variant="outline" className="font-mono text-[11px]">
            {rec.nistControl.taskCode}
          </Badge>
        )}
        {onToggleApplied ? (
          <button
            type="button"
            onClick={() => onToggleApplied(rec)}
            aria-pressed={rec.isApplied}
            title={rec.isApplied ? dict.studio.markNotApplied : dict.studio.markApplied}
            className={`ms-auto inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
              rec.isApplied
                ? "border-success/40 bg-success/10 text-success hover:bg-success/15"
                : "border-border text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {rec.isApplied ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
            {rec.isApplied ? dict.workspace.applied : dict.workspace.notApplied}
          </button>
        ) : (
          rec.isApplied && (
            <Badge variant="success" className="ms-auto">
              {dict.workspace.applied}
            </Badge>
          )
        )}
      </div>
      <p className="text-sm font-medium">{rec.title}</p>
      <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{rec.content}</p>
      {rec.filePath && <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{rec.filePath}</p>}
      {onAutoFix && rec.suggestedCode && rec.filePath && (
        <Button size="sm" variant="outline" className="mt-2" onClick={() => onAutoFix(rec)}>
          <Wand2 className="size-3" /> {dict.studio.autoFix}
        </Button>
      )}
    </div>
  );
}

export function RecommendationList({
  recommendations,
  dict,
  onToggleApplied,
  onAutoFix,
}: {
  recommendations: RecommendationRow[];
  dict: Dictionary;
  onToggleApplied?: (rec: RecommendationRow) => void;
  onAutoFix?: (rec: RecommendationRow) => void;
}) {
  const sorted = [...recommendations].sort((a, b) => severityRank(a.severity) - severityRank(b.severity));
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((r) => (
        <RecommendationCard key={r.id} rec={r} dict={dict} onToggleApplied={onToggleApplied} onAutoFix={onAutoFix} />
      ))}
    </div>
  );
}

export function ThreatModelView({
  threats,
  dict,
  showHeatMap = true,
}: {
  threats: Record<string, unknown>[];
  dict: Dictionary;
  showHeatMap?: boolean;
}) {
  const w = dict.workspace;
  return (
    <div className="space-y-4">
      {showHeatMap && (
        <div>
          <h5 className="mb-2 text-sm font-semibold">{w.heatMap}</h5>
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as const).map((level) => {
              const count = threats.filter((t) => String(t.likelihood ?? "").toLowerCase() === level).length;
              return (
                <div key={level} className={`rounded-lg border p-2 text-center ${levelBadgeClass(level)}`}>
                  <p className="text-lg font-bold tabular-nums">{count}</p>
                  <p className="text-[11px]">{fmt(w.likelihoodOf, { level: levelLabel(level, dict) })}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div>
        {showHeatMap && <h5 className="mb-2 text-sm font-semibold">{w.threatTable}</h5>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th scope="col" className="py-1.5 pe-2 font-medium">{w.colThreat}</th>
                <th scope="col" className="py-1.5 pe-2 font-medium">{w.colLikelihood}</th>
                <th scope="col" className="py-1.5 pe-2 font-medium">{w.colImpact}</th>
                <th scope="col" className="py-1.5 font-medium">{w.colMitigation}</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((t, i) => (
                <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
                  <td className="py-1.5 pe-2 align-top">{String(t.threat ?? "")}</td>
                  <td className="py-1.5 pe-2 align-top">
                    <LevelChip level={String(t.likelihood ?? "")} dict={dict} />
                  </td>
                  <td className="py-1.5 pe-2 align-top">
                    <LevelChip level={String(t.impact ?? "")} dict={dict} />
                  </td>
                  <td className="py-1.5 align-top text-muted-foreground">{String(t.mitigation ?? "—")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** Heuristic classification of a free-text data category. */
export function classifyData(item: string): "sensitive" | "restricted" | "public" | "internal" {
  const lower = item.toLowerCase();
  if (lower.includes("pii") || lower.includes("personal")) return "sensitive";
  if (lower.includes("phi") || lower.includes("health")) return "restricted";
  if (lower.includes("public")) return "public";
  return "internal";
}

export function DataClassificationTable({ items, dict }: { items: string[]; dict: Dictionary }) {
  const w = dict.workspace;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th scope="col" className="py-1.5 pe-3 font-medium">#</th>
            <th scope="col" className="py-1.5 pe-3 font-medium">{w.colDataType}</th>
            <th scope="col" className="py-1.5 font-medium">{w.colClassification}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((d, i) => (
            <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
              <td className="py-1.5 pe-3 tabular-nums text-muted-foreground">{i + 1}</td>
              <td className="py-1.5 pe-3 font-medium">{d}</td>
              <td className="py-1.5">
                <LevelChip level={classifyData(d)} dict={dict} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function severityBreakdown(findings: Record<string, unknown>[]) {
  const count = (sev: string) => findings.filter((f) => String(f.severity ?? "").toLowerCase() === sev).length;
  return {
    critical: count("critical"),
    high: count("high"),
    medium: count("medium"),
    low: count("low"),
    total: findings.length,
  };
}

export function ScoreSummary({
  score,
  findings,
  dict,
}: {
  score: number;
  findings: Record<string, unknown>[];
  dict: Dictionary;
}) {
  const w = dict.workspace;
  const band = scoreBand(score);
  const bandLabel = band === "good" ? w.bandGood : band === "fair" ? w.bandFair : w.bandPoor;
  const b = severityBreakdown(findings);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant={scoreBadgeVariant(score)} className="px-3 py-1 text-lg tabular-nums">
          {score} / 100
        </Badge>
        <span className="text-sm text-muted-foreground">{bandLabel}</span>
      </div>
      <Progress value={score} indicatorClassName={scoreBgClass(score)} />
      <p className="text-xs text-muted-foreground tabular-nums">
        {b.total > 0 ? fmt(w.scoreBasis, b) : w.noFindingsYet}
      </p>
    </div>
  );
}

export function FindingsView({ findings, dict }: { findings: Record<string, unknown>[]; dict: Dictionary }) {
  const b = severityBreakdown(findings);
  const sorted = [...findings].sort((x, y) => severityRank(String(x.severity)) - severityRank(String(y.severity)));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["critical", "high", "medium", "low"] as const).map((sev) => (
          <div key={sev} className={`rounded-lg border p-2 text-center ${levelBadgeClass(sev)}`}>
            <p className="text-lg font-bold tabular-nums">{b[sev]}</p>
            <p className="text-[11px]">{levelLabel(sev, dict)}</p>
          </div>
        ))}
      </div>
      {sorted.map((f, i) => (
        <div key={i} className="rounded-md border p-3">
          <div className="mb-1 flex items-center gap-2">
            <SeverityBadge level={String(f.severity ?? "")} dict={dict} />
            <span className="text-sm font-medium">{String(f.title ?? "")}</span>
          </div>
          <p className="text-xs text-muted-foreground">{String(f.description ?? "")}</p>
          {typeof f.fix === "string" && <p className="mt-1 text-xs text-success">{f.fix}</p>}
        </div>
      ))}
    </div>
  );
}

/**
 * File list with lazily-mounted, syntax-highlighted previews (Monaco is only
 * created for expanded rows) and an "open in editor" shortcut.
 */
export function CodeFileList({
  files,
  dict,
  onOpenFile,
}: {
  files: [string, string][];
  dict: Dictionary;
  onOpenFile?: (path: string) => void;
}) {
  const [open, setOpen] = useState<Set<string>>(() => new Set(files.length === 1 ? [files[0][0]] : []));
  const w = dict.workspace;
  return (
    <div className="space-y-2">
      {files.map(([path, content]) => {
        const expanded = open.has(path);
        return (
          <div key={path} className="rounded-md border">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setOpen((prev) => {
                    const next = new Set(prev);
                    if (next.has(path)) next.delete(path);
                    else next.add(path);
                    return next;
                  })
                }
                className="flex min-w-0 flex-1 items-center gap-1.5 rounded text-start hover:text-foreground"
                title={w.showCode}
              >
                <ChevronRight className={`size-3.5 shrink-0 transition-transform ${expanded ? "rotate-90" : ""}`} />
                <span className="truncate font-mono text-xs font-medium">{path}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                  {fmt(w.lines, { count: content.split("\n").length })}
                </span>
              </button>
              {onOpenFile && (
                <Button size="sm" variant="ghost" className="h-7 shrink-0 px-2 text-[11px]" onClick={() => onOpenFile(path)}>
                  <ExternalLink className="size-3" /> {w.openInEditor}
                </Button>
              )}
            </div>
            {expanded && (
              <div className="border-t p-2">
                <CodeViewer value={content} path={path} height={260} loadingLabel={dict.studio.loadingEditor} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
