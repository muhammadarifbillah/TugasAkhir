"use client";

import { m } from "motion/react";
import { CheckCircle2, Clock, Loader2, ShieldCheck, ShieldQuestion, X } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Progress } from "@/components/ui/progress";
import { SecurityScanPanel, type ScanFinding } from "@/components/studio/security-scan-panel";
import { TraceabilityPanel } from "@/components/studio/traceability-panel";
import { RecommendationList, levelLabel, type RecommendationRow } from "@/components/studio/studio-views";
import { tabKeyNav } from "@/components/studio/tab-key-nav";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { scoreBadgeVariant, scoreBgClass, type ScoreInfo } from "@/lib/project-stats";
import { cn } from "@/lib/utils";

export type PanelTab = "score" | "findings" | "compliance" | "traceability";

export function panelTabsFor(stageCode: string): PanelTab[] {
  return stageCode === "testing" || stageCode === "handover"
    ? ["score", "findings", "compliance", "traceability"]
    : ["score", "findings", "compliance"];
}

export function panelTabLabel(tab: PanelTab, dict: Dictionary): string {
  const w = dict.workspace;
  return { score: w.tabScore, findings: w.tabFindings, compliance: w.tabCompliance, traceability: w.tabTraceability }[tab];
}

export interface StudioRightPanelProps {
  dict: Dictionary;
  lang: string;
  projectId: string;
  stage: { code: string; nistGroups: string[]; nistTasks: string[]; isoControls: string[] };
  secureParams: string[];
  scoreInfo: ScoreInfo;
  recommendations: RecommendationRow[];
  hasCode: boolean;
  isCodeStage: boolean;
  tab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  error: string | null;
  onDismissError: () => void;
  onToggleApplied: (rec: RecommendationRow) => void;
  onAutoFix: (rec: RecommendationRow) => void;
  onFixAll: () => void;
  fixingAll: boolean;
  onOpenFile: (file: string, line?: number | null) => void;
  onFixWithAi: (finding: ScanFinding) => void;
  onFixAllWithAi: (findings: ScanFinding[]) => void;
  onScanComplete: () => void;
  onClose: () => void;
}

export function StudioRightPanel(props: StudioRightPanelProps) {
  const { dict, stage, tab, onTabChange } = props;
  const w = dict.workspace;
  const tabs = panelTabsFor(stage.code);

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ShieldCheck className="size-4" aria-hidden="true" />
        <span className="flex-1">{dict.studio.securityPanel}</span>
        <Button
          size="icon"
          variant="ghost"
          className="hidden size-7 md:inline-flex lg:hidden"
          onClick={props.onClose}
          aria-label={w.closePanel}
          title={w.closePanel}
        >
          <X className="size-4" />
        </Button>
      </div>
      <div
        role="tablist"
        aria-label={w.panelTabs}
        className="flex shrink-0 gap-0.5 overflow-x-auto border-b px-2 scrollbar-none"
        onKeyDown={(e) => tabKeyNav(e, tabs, tab, onTabChange)}
      >
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            id={`panel-tab-${t}`}
            aria-selected={tab === t}
            aria-controls={`panel-section-${t}`}
            tabIndex={tab === t ? 0 : -1}
            onClick={() => onTabChange(t)}
            className={cn(
              "relative shrink-0 px-2.5 py-2 text-xs font-medium transition-colors",
              tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab === t && (
              <m.span
                layoutId="panel-tab-indicator"
                className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                aria-hidden="true"
              />
            )}
            {panelTabLabel(t, dict)}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`panel-section-${tab}`}
        aria-labelledby={`panel-tab-${tab}`}
        tabIndex={0}
        className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-4 focus-visible:outline-none"
      >
        {tab === "score" && <ScoreSection {...props} />}
        {tab === "findings" && <FindingsSection {...props} />}
        {tab === "compliance" && <ComplianceSection {...props} />}
        {tab === "traceability" && (
          <TraceabilityPanel
            projectId={props.projectId}
            labels={{ title: dict.studio.traceTitle, empty: dict.studio.traceEmpty }}
            onOpenFile={(f) => props.onOpenFile(f)}
          />
        )}
      </div>
    </>
  );
}

function ScoreSection({ dict, lang, scoreInfo }: StudioRightPanelProps) {
  const w = dict.workspace;
  const { score } = scoreInfo;
  const trust =
    score == null
      ? null
      : scoreInfo.stale
        ? { variant: "warning" as const, icon: Clock, label: w.trustStale, hint: w.trustStaleHint }
        : scoreInfo.source === "scanner"
          ? { variant: "success" as const, icon: ShieldCheck, label: w.trustVerified, hint: w.trustVerifiedHint }
          : { variant: "info" as const, icon: ShieldQuestion, label: w.trustAi, hint: w.trustAiHint };

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium">{dict.studio.score}</span>
        {score == null ? (
          <Badge variant="secondary">{dict.studio.notScored}</Badge>
        ) : (
          <Badge variant={scoreBadgeVariant(score)} className="tabular-nums">
            <AnimatedNumber value={score} /> / 100
          </Badge>
        )}
      </div>
      <Progress value={score ?? 0} indicatorClassName={score == null ? "bg-muted" : scoreBgClass(score)} />
      {trust && (
        <div className="mt-3 space-y-1">
          <Badge variant={trust.variant}>
            <trust.icon className="size-3" aria-hidden="true" /> {trust.label}
          </Badge>
          <p className="text-[11px] text-muted-foreground">{trust.hint}</p>
          {scoreInfo.scannedAt && (
            <p className="text-[11px] text-muted-foreground tabular-nums" suppressHydrationWarning>
              {fmt(w.scannedAt, { date: new Date(scoreInfo.scannedAt).toLocaleString(lang) })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function FindingsSection(props: StudioRightPanelProps) {
  const { dict, stage, recommendations, isCodeStage } = props;
  const w = dict.workspace;
  const fixable = recommendations.filter(
    (r) => r.suggestedCode && r.filePath && !r.isApplied,
  ).length;
  return (
    <>
      {stage.code === "testing" && (
        <SecurityScanPanel
          projectId={props.projectId}
          hasCode={props.hasCode}
          onOpenFile={(f, line) => props.onOpenFile(f, line)}
          onFixWithAi={props.onFixWithAi}
          onFixAllWithAi={props.onFixAllWithAi}
          onScanComplete={props.onScanComplete}
          labels={{
            title: dict.studio.scanTitle,
            run: dict.studio.scanRun,
            running: dict.studio.scanRunning,
            empty: dict.studio.scanEmpty,
            failed: dict.studio.scanFailed,
            needCode: dict.studio.scanNeedCode,
            skipped: dict.studio.scanSkipped,
            filterSeverity: w.filterSeverity,
            filterTool: w.filterTool,
            filterAll: w.filterAll,
            showingOf: w.showingOf,
            showMore: w.showMore,
            fixWithAi: w.fixWithAi,
            fixAllWithAi: w.fixAllWithAi,
            help: dict.studio.scanHelp,
            helpLabel: dict.a11y.help,
            scanDone: dict.studio.scanDone,
            openLocation: w.openLocation,
            dismiss: w.dismiss,
            severityLabel: (s) => levelLabel(s, dict),
          }}
        />
      )}
      {props.error && (
        <InlineAlert message={props.error} onDismiss={props.onDismissError} dismissLabel={w.dismiss} />
      )}
      {recommendations.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
          {dict.studio.noRecommendations}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
            <span>{dict.studio.recommendations}</span>
            <div className="flex items-center gap-2">
              <span className="tabular-nums">
                {recommendations.filter((r) => r.isApplied).length}/{recommendations.length} {w.applied}
              </span>
              {fixable > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  disabled={props.fixingAll}
                  onClick={props.onFixAll}
                >
                  {props.fixingAll && <Loader2 className="size-3 animate-spin" />}
                  {fmt(w.fixAll, { count: fixable })}
                </Button>
              )}
            </div>
          </div>
          <RecommendationList
            recommendations={recommendations}
            dict={dict}
            onToggleApplied={props.onToggleApplied}
            onAutoFix={isCodeStage ? props.onAutoFix : undefined}
          />
        </div>
      )}
    </>
  );
}

function AppliedMark({ applied, dict }: { applied: boolean; dict: Dictionary }) {
  return applied ? (
    <CheckCircle2 className="size-3.5 text-success" aria-label={dict.workspace.applied} />
  ) : (
    <span className="text-muted-foreground" aria-label={dict.workspace.notApplied}>
      ·
    </span>
  );
}

function ComplianceSection({ dict, stage, secureParams, recommendations }: StudioRightPanelProps) {
  const isoIds = recommendations
    .flatMap((r) => r.nistControl?.iso27001Mapping ?? [])
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 14);
  const taskApplied = (task: string) =>
    recommendations.some((r) => r.isApplied && r.nistControl?.taskCode === task);

  return (
    <>
      <div className="rounded-lg border p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium">{dict.studio.stageSecurityParams}</span>
          <div className="flex gap-1">
            {stage.nistGroups.map((g) => (
              <Badge key={g} variant="outline">
                {g}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          NIST SSDF → ISO 27001
        </div>
        <div className="flex flex-wrap gap-1">
          {stage.nistTasks.map((t) => (
            <Badge key={t} variant="secondary" className="font-mono text-[11px]">
              {t}
            </Badge>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1">
          {stage.isoControls.map((iso) => (
            <Badge key={iso} variant="outline" className="font-mono text-[11px]">
              {iso}
            </Badge>
          ))}
        </div>
        <div className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {dict.studio.secureParams}
        </div>
        <ul className="space-y-1">
          {secureParams.map((p) => (
            <li key={p} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3 shrink-0 text-success" aria-hidden="true" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>

      {recommendations.length > 0 && (
        <>
          <div className="flex flex-col gap-2">
            <div className="text-xs font-semibold text-muted-foreground">{dict.studio.nistChecks}</div>
            {(["PO", "PW", "PS", "RV"] as const).map((group) => {
              const groupTasks = stage.nistTasks
                .filter((t) => t.startsWith(`${group}.`))
                .filter((task) => recommendations.some((r) => r.nistControl?.taskCode === task));
              if (groupTasks.length === 0) return null;
              return (
                <div key={group} className="min-w-0 rounded-md border border-dashed p-2">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold">{group}</span>
                    <AppliedMark applied={groupTasks.every(taskApplied)} dict={dict} />
                  </div>
                  <div className="space-y-0.5">
                    {groupTasks.slice(0, 6).map((task) => (
                      <div key={task} className="flex items-center justify-between text-xs">
                        <span className="font-mono">{task}</span>
                        <AppliedMark applied={taskApplied(task)} dict={dict} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-1">
            <div className="text-xs font-semibold text-muted-foreground">{dict.studio.isoMapping}</div>
            {isoIds.map((iso) => (
              <div key={iso} className="flex items-center justify-between font-mono text-xs">
                <span>{iso}</span>
                <AppliedMark
                  applied={recommendations.some((r) => r.isApplied && r.nistControl?.iso27001Mapping.includes(iso))}
                  dict={dict}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
