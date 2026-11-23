"use client";

import Link from "next/link";
import { ArrowRight, CheckCheck, CheckCircle2, Eye, Loader2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";

interface StepRef {
  id: string;
  label: string;
}

/**
 * The one obvious "what now?" row under the stepper: current sub-step + gaps
 * while working, a Complete button once every requirement is met, and a link
 * to the next stage after completion.
 */
export function NextActionBar({
  dict,
  stageCompleted,
  isHandover,
  gaps,
  currentStep,
  nextStage,
  completing,
  onComplete,
  onAskAi,
  onViewResult,
}: {
  dict: Dictionary;
  stageCompleted: boolean;
  isHandover: boolean;
  gaps: StepRef[];
  currentStep: StepRef | null;
  nextStage: { name: string; href: string } | null;
  completing: boolean;
  onComplete: () => void;
  onAskAi: (stepId: string) => void;
  onViewResult: (stepId: string) => void;
}) {
  const w = dict.workspace;

  if (stageCompleted) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t bg-success/5 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-success">
          <CheckCircle2 className="size-4" aria-hidden="true" /> {w.nextActionDone}
        </span>
        {nextStage && (
          <Button asChild size="sm" variant="outline" className="h-7 ms-auto">
            <Link href={nextStage.href}>
              {fmt(w.goToNextStage, { stage: nextStage.name })} <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        )}
      </div>
    );
  }

  if (gaps.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t bg-primary/5 px-4 py-2 text-xs">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <CheckCircle2 className="size-4 text-success" aria-hidden="true" /> {w.nextActionReady}
        </span>
        <Button size="sm" className="h-7 ms-auto" onClick={onComplete} disabled={completing}>
          {completing ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCheck className="size-3.5" />}
          {isHandover ? dict.studio.finishProject : dict.studio.completeStage}
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t bg-warning/5 px-4 py-2 text-xs"
      aria-label={w.nextActionLabel}
      role="region"
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {w.nextActionLabel}
      </span>
      {currentStep && (
        <span className="min-w-0 font-medium text-foreground">
          {fmt(w.nextActionStep, { step: currentStep.label })}
        </span>
      )}
      <span className="text-muted-foreground tabular-nums">{fmt(w.gapsRemaining, { count: gaps.length })}</span>
      <ul className="flex flex-wrap gap-1">
        {gaps.map((g) => (
          <li key={g.id}>
            <button
              type="button"
              onClick={() => onViewResult(g.id)}
              title={fmt(w.viewStepResult, { step: g.label })}
              className="rounded-full border border-warning/40 bg-background px-2 py-0.5 text-[11px] text-foreground hover:bg-warning/10"
            >
              {g.label}
            </button>
          </li>
        ))}
      </ul>
      {currentStep && (
        <div className="ms-auto flex items-center gap-1.5">
          <Button size="sm" variant="ghost" className="h-7" onClick={() => onViewResult(currentStep.id)}>
            <Eye className="size-3.5" />
            <span className="sr-only sm:not-sr-only">{fmt(w.viewStepResult, { step: currentStep.label })}</span>
          </Button>
          <Button size="sm" className="h-7" onClick={() => onAskAi(currentStep.id)}>
            <Wand2 className="size-3.5" /> {w.askAiForStep}
          </Button>
        </div>
      )}
    </div>
  );
}
