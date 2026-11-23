"use client";

import type { PlanResult } from "@/lib/ai/result";
import { AlertTriangle, Check, FileCode2, FilePlus2, FilePen, Loader2, Play, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fmt } from "@/lib/format";
import { scoreBadgeVariant } from "@/lib/project-stats";

export interface PlanCardLabels {
  planTitle: string;
  planMeta: string;
  approveBuild: string;
  approveShortcut: string;
  building: string;
  discardPlan: string;
  buildDone: string;
  actionsExecuted: string;
  filesCreated: string;
  filesModified: string;
  newRecommendations: string;
  viewChanges: string;
  scoreLabel: string;
}

interface PlanCardProps {
  plan: PlanResult;
  onApprove: () => void;
  onCancel: () => void;
  loading?: boolean;
  labels: PlanCardLabels;
}

export function PlanCard({ plan, onApprove, onCancel, loading, labels }: PlanCardProps) {
  const totalFiles = plan.actions.reduce((acc, a) => acc + a.files.length, 0);

  return (
    <div className="card-elevated overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
            <FileCode2 className="size-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">{labels.planTitle}</h4>
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {fmt(labels.planMeta, { actions: plan.actions.length, files: totalFiles })}
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-primary/20 px-4 py-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
      </div>

      <ol className="max-h-60 space-y-2.5 overflow-y-auto px-4 py-3">
        {plan.actions.map((action) => (
          <li key={action.step} className="flex gap-3 rounded-lg border border-border bg-background/60 p-2.5">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <span className="text-[11px] font-bold text-primary tabular-nums">{action.step}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-foreground">{action.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {action.files.map((f) => (
                  <span
                    key={f}
                    title={f}
                    className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                  >
                    <FileCode2 className="size-3" />
                    {f.split("/").pop()}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{action.impact}</p>
            </div>
          </li>
        ))}
      </ol>

      {plan.warnings && plan.warnings.length > 0 && (
        <div className="border-t border-warning/30 bg-warning/10 px-4 py-2">
          {plan.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning" />
              <p className="text-[11px] text-warning">{w}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 border-t border-primary/20 px-4 py-3">
        <button
          type="button"
          onClick={onApprove}
          disabled={loading}
          title={labels.approveShortcut}
          aria-keyshortcuts="Control+Shift+Enter Meta+Shift+Enter"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
          {loading ? labels.building : labels.approveBuild}
          {!loading && (
            <kbd className="ms-1 hidden rounded border border-primary-foreground/30 px-1 font-sans text-[11px] opacity-80 sm:inline">
              {labels.approveShortcut}
            </kbd>
          )}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          aria-label={labels.discardPlan}
          title={labels.discardPlan}
          className="rounded-lg bg-secondary px-3 py-2 text-xs text-secondary-foreground transition hover:bg-secondary/80 disabled:opacity-50"
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function BuildResultCard({
  result,
  labels,
  onOpenFile,
}: {
  result: {
    actionsExecuted: number;
    filesCreated: string[];
    filesModified: string[];
    recommendationsCount: number;
    securityScore: number | null;
  };
  labels: PlanCardLabels;
  /** Opens a changed file in the editor ("view changes"). */
  onOpenFile?: (file: string) => void;
}) {
  const files = [
    ...result.filesCreated.map((f) => ({ file: f, created: true })),
    ...result.filesModified.map((f) => ({ file: f, created: false })),
  ];
  return (
    <div className="card-elevated overflow-hidden rounded-xl border border-success/30 bg-success/5">
      <div className="flex items-center gap-2 border-b border-success/20 px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-success/15">
          <Check className="size-4 text-success" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">{labels.buildDone}</h4>
          <p className="text-[11px] text-success tabular-nums">
            {fmt(labels.actionsExecuted, { count: result.actionsExecuted })}
          </p>
        </div>
        {result.securityScore !== null && (
          <Badge variant={scoreBadgeVariant(result.securityScore)} className="tabular-nums" title={labels.scoreLabel}>
            {Math.round(result.securityScore)} / 100
          </Badge>
        )}
      </div>
      <div className="space-y-2 px-4 py-3">
        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
          {result.filesCreated.length > 0 && (
            <span>
              {labels.filesCreated}: <span className="font-medium text-success">{result.filesCreated.length}</span>
            </span>
          )}
          {result.filesModified.length > 0 && (
            <span>
              {labels.filesModified}: <span className="font-medium text-warning">{result.filesModified.length}</span>
            </span>
          )}
          {result.recommendationsCount > 0 && (
            <span>{fmt(labels.newRecommendations, { count: result.recommendationsCount })}</span>
          )}
        </p>
        {files.length > 0 && onOpenFile && (
          <div>
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">{labels.viewChanges}</p>
            <ul className="max-h-40 space-y-0.5 overflow-y-auto">
              {files.map(({ file, created }) => (
                <li key={file}>
                  <button
                    type="button"
                    onClick={() => onOpenFile(file)}
                    className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-start font-mono text-[11px] text-foreground hover:bg-success/10"
                    title={`${created ? labels.filesCreated : labels.filesModified}: ${file}`}
                  >
                    {created ? (
                      <FilePlus2 className="size-3 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <FilePen className="size-3 shrink-0 text-warning" aria-hidden="true" />
                    )}
                    <span className="sr-only">{created ? labels.filesCreated : labels.filesModified}: </span>
                    <span className="truncate">{file}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
