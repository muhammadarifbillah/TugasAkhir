"use client";

import type { PlanResult } from "@/lib/ai/result";
import { FileCode2, AlertTriangle, Play, X } from "lucide-react";

interface PlanCardProps {
  plan: PlanResult;
  onApprove: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function PlanCard({ plan, onApprove, onCancel, loading }: PlanCardProps) {
  const totalFiles = plan.actions.reduce((acc, a) => acc + a.files.length, 0);

  return (
    <div className="rounded-xl border border-blue-700 bg-blue-950/50 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-blue-900 flex items-center justify-center">
            <FileCode2 className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-blue-200">Implementation Plan</h4>
            <p className="text-[10px] text-blue-400">
              {plan.actions.length} actions · {totalFiles} files
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-2.5 border-b border-blue-800/50">
        <p className="text-xs text-zinc-300 leading-relaxed">{plan.summary}</p>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-2.5 max-h-60 overflow-y-auto scrollbar-thin">
        {plan.actions.map((action) => (
          <div
            key={action.step}
            className="flex gap-3 p-2.5 rounded-lg bg-blue-900/30 border border-blue-800/50"
          >
            <div className="w-6 h-6 rounded-full bg-blue-800 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-blue-300">{action.step}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200 leading-relaxed">{action.description}</p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {action.files.map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-900 text-[10px] text-blue-300 font-mono"
                  >
                    <FileCode2 className="w-2.5 h-2.5" />
                    {f.split("/").pop()}
                  </span>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">{action.impact}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Warnings */}
      {plan.warnings && plan.warnings.length > 0 && (
        <div className="px-4 py-2 border-t border-yellow-800/50 bg-yellow-950/30">
          {plan.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <AlertTriangle className="w-3 h-3 text-yellow-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-yellow-300">{w}</p>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 py-3 border-t border-blue-800 flex gap-2">
        <button
          onClick={onApprove}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white transition-colors"
        >
          {loading ? (
            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          {loading ? "Building..." : "Approve & Build"}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-xs text-zinc-300 transition-colors"
        >
          <X className="w-3 h-3" />
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
    <div className="rounded-xl border border-emerald-700 bg-emerald-950/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-emerald-800 flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-emerald-900 flex items-center justify-center">
          <Check className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-emerald-200">Build Complete</h4>
          <p className="text-[10px] text-emerald-400">
            {result.actionsExecuted} actions executed
          </p>
        </div>
      </div>
      <div className="px-4 py-3 space-y-1.5">
        {result.filesCreated.length > 0 && (
          <p className="text-xs text-zinc-300">
            Created: <span className="text-emerald-400">{result.filesCreated.length} files</span>
          </p>
        )}
        {result.filesModified.length > 0 && (
          <p className="text-xs text-zinc-300">
            Modified: <span className="text-yellow-400">{result.filesModified.length} files</span>
          </p>
        )}
        <p className="text-xs text-zinc-300">
          Recommendations: <span className="text-blue-400">{result.recommendationsCount} new</span>
        </p>
        {result.securityScore !== null && (
          <p className="text-xs text-zinc-300">
            Security Score: <span className="text-emerald-400">{result.securityScore}/100</span>
          </p>
        )}
      </div>
      {onViewChanges && (
        <div className="px-4 py-2.5 border-t border-emerald-800">
          <button
            onClick={onViewChanges}
            className="text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2"
          >
            View Changes →
          </button>
        </div>
      )}
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
