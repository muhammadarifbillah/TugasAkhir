"use client";

import type { PlanResult } from "@/lib/ai/result";
import { AlertTriangle, Check, FileCode2, Play, X } from "lucide-react";

interface PlanCardProps {
  plan: PlanResult;
  onApprove: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PlanCard({ plan, onApprove, onCancel, loading }: PlanCardProps) {
  const totalFiles = plan.actions.reduce((acc, a) => acc + a.files.length, 0);

  return (
    <div className="card-elevated overflow-hidden rounded-xl border border-primary/30 bg-primary/5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-primary/15">
            <FileCode2 className="size-4 text-primary" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-foreground">Implementation Plan</h4>
            <p className="text-[10px] text-muted-foreground">
              {plan.actions.length} actions · {totalFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="border-b border-primary/20 px-4 py-2.5">
        <p className="text-xs leading-relaxed text-muted-foreground">{plan.summary}</p>
      </div>

      {/* Actions */}
      <div className="max-h-60 space-y-2.5 overflow-y-auto px-4 py-3">
        {plan.actions.map((action) => (
          <div key={action.step} className="flex gap-3 rounded-lg border border-border bg-background/60 p-2.5">
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15">
              <span className="text-[10px] font-bold text-primary">{action.step}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-relaxed text-foreground">{action.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {action.files.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                  >
                    <FileCode2 className="size-2.5" />
                    {f.split("/").pop()}
                  </span>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">{action.impact}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {plan.warnings && plan.warnings.length > 0 && (
        <div className="border-t border-warning/30 bg-warning/10 px-4 py-2">
          {plan.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="mt-0.5 size-3 shrink-0 text-warning" />
              <p className="text-[10px] text-warning">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 border-t border-primary/20 px-4 py-3">
        <button
          onClick={onApprove}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <div className="size-3 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
          ) : (
            <Play className="size-3" />
          )}
          {loading ? "Building..." : "Approve & Build"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
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
  onViewChanges,
}: {
  result: {
    actionsExecuted: number;
    filesCreated: string[];
    filesModified: string[];
    recommendationsCount: number;
    securityScore: number | null;
  };
  onViewChanges?: () => void;
}) {
  return (
    <div className="card-elevated overflow-hidden rounded-xl border border-success/30 bg-success/5">
      <div className="flex items-center gap-2 border-b border-success/20 px-4 py-3">
        <div className="flex size-7 items-center justify-center rounded-lg bg-success/15">
          <Check className="size-4 text-success" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground">Build Complete</h4>
          <p className="text-[10px] text-success">{result.actionsExecuted} actions executed</p>
        </div>
      </div>
      <div className="space-y-1.5 px-4 py-3">
        {result.filesCreated.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Created: <span className="text-success">{result.filesCreated.length} files</span>
          </p>
        )}
        {result.filesModified.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Modified: <span className="text-warning">{result.filesModified.length} files</span>
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Recommendations: <span className="text-primary">{result.recommendationsCount} new</span>
        </p>
        {result.securityScore !== null && (
          <p className="text-xs text-muted-foreground">
            Security Score: <span className="text-success">{result.securityScore}/100</span>
          </p>
        )}
      </div>
      {onViewChanges && (
        <div className="border-t border-success/20 px-4 py-2.5">
          <button
            onClick={onViewChanges}
            className="text-xs text-primary underline underline-offset-2 hover:text-primary/80"
          >
            View Changes →
          </button>
        </div>
      )}
    </div>
  );
}
