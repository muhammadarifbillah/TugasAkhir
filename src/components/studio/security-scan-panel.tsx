"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Play, ShieldAlert, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InlineAlert } from "@/components/ui/inline-alert";
import { csrfFetch } from "@/lib/csrf-client";
import { fmt } from "@/lib/format";
import { scoreBadgeVariant } from "@/lib/project-stats";
import { severityRank, severityVariant } from "@/lib/severity";

export interface SecurityScanLabels {
  title: string;
  run: string;
  running: string;
  empty: string;
  failed: string;
  needCode: string;
  skipped: string;
  filterSeverity: string;
  filterTool: string;
  filterAll: string;
  showingOf: string;
  showMore: string;
  fixWithAi: string;
  openLocation: string;
  dismiss: string;
  /** Maps a raw severity ("high") to its localised label. */
  severityLabel: (severity: string) => string;
}

export interface ScanFinding {
  id: string;
  tool: string;
  severity: string;
  title: string;
  filePath: string | null;
  line: number | null;
  ruleId: string | null;
}

interface ScanSummary {
  toolsRun?: string[];
  toolsSkipped?: { tool: string; reason: string }[];
  findingCount?: number;
}

const PAGE_SIZE = 25;
const SEVERITIES = ["critical", "high", "medium", "low", "info"];

export function SecurityScanPanel({
  projectId,
  hasCode,
  labels,
  onOpenFile,
  onFixWithAi,
  onScanComplete,
}: {
  projectId: string;
  hasCode: boolean;
  labels: SecurityScanLabels;
  onOpenFile?: (file: string, line: number | null) => void;
  onFixWithAi?: (finding: ScanFinding) => void;
  /** Called after a successful scan so the server-derived score can refresh. */
  onScanComplete?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [findings, setFindings] = useState<ScanFinding[]>([]);
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [severity, setSeverity] = useState("all");
  const [tool, setTool] = useState("all");
  const [limit, setLimit] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/scan`);
        if (!res.ok) return;
        const data = (await res.json()) as {
          score?: number | null;
          findings?: ScanFinding[];
          scan?: ScanSummary | null;
        };
        if (cancelled) return;
        setScore(typeof data.score === "number" ? data.score : null);
        setFindings(Array.isArray(data.findings) ? data.findings : []);
        setScan(data.scan ?? null);
      } catch {
        // A failed background load should not block the panel.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${projectId}/scan`, { method: "POST" });
      const data = (await res.json()) as {
        score?: number;
        findings?: ScanFinding[];
        toolsRun?: string[];
        toolsSkipped?: { tool: string; reason: string }[];
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? labels.failed);
        return;
      }
      setScore(typeof data.score === "number" ? data.score : null);
      setFindings(data.findings ?? []);
      setScan({ toolsRun: data.toolsRun, toolsSkipped: data.toolsSkipped });
      setLimit(PAGE_SIZE);
      onScanComplete?.();
    } catch {
      setError(labels.failed);
    } finally {
      setLoading(false);
    }
  }

  const tools = useMemo(() => [...new Set(findings.map((f) => f.tool))].sort(), [findings]);
  const presentSeverities = useMemo(
    () => SEVERITIES.filter((s) => findings.some((f) => f.severity.toLowerCase() === s)),
    [findings],
  );
  const filtered = useMemo(
    () =>
      findings
        .filter((f) => severity === "all" || f.severity.toLowerCase() === severity)
        .filter((f) => tool === "all" || f.tool === tool)
        .sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
    [findings, severity, tool],
  );
  const shown = filtered.slice(0, limit);

  const selectClass =
    "h-7 min-w-0 flex-1 rounded-md border border-input bg-background px-1.5 text-[11px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <ShieldAlert className="size-3.5 text-primary" />
          {labels.title}
        </span>
        {score != null && (
          <Badge variant={scoreBadgeVariant(score)} className="tabular-nums">
            {score} / 100
          </Badge>
        )}
      </div>

      <Button size="sm" variant="outline" className="w-full" disabled={loading || !hasCode} onClick={run}>
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        {loading ? labels.running : labels.run}
      </Button>

      {!hasCode && <p className="mt-2 text-[11px] text-muted-foreground">{labels.needCode}</p>}
      {error && (
        <InlineAlert className="mt-2" message={error} onDismiss={() => setError(null)} dismissLabel={labels.dismiss} />
      )}

      {scan?.toolsSkipped && scan.toolsSkipped.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {labels.skipped}: {scan.toolsSkipped.map((t) => t.tool).join(", ")}
        </p>
      )}

      {findings.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center gap-2">
            <label className="sr-only" htmlFor={`scan-sev-${projectId}`}>
              {labels.filterSeverity}
            </label>
            <select
              id={`scan-sev-${projectId}`}
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value);
                setLimit(PAGE_SIZE);
              }}
              className={selectClass}
              title={labels.filterSeverity}
            >
              <option value="all">
                {labels.filterSeverity}: {labels.filterAll}
              </option>
              {presentSeverities.map((s) => (
                <option key={s} value={s}>
                  {labels.severityLabel(s)}
                </option>
              ))}
            </select>
            {tools.length > 1 && (
              <>
                <label className="sr-only" htmlFor={`scan-tool-${projectId}`}>
                  {labels.filterTool}
                </label>
                <select
                  id={`scan-tool-${projectId}`}
                  value={tool}
                  onChange={(e) => {
                    setTool(e.target.value);
                    setLimit(PAGE_SIZE);
                  }}
                  className={selectClass}
                  title={labels.filterTool}
                >
                  <option value="all">
                    {labels.filterTool}: {labels.filterAll}
                  </option>
                  {tools.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground tabular-nums" aria-live="polite">
            {fmt(labels.showingOf, { shown: shown.length, total: filtered.length })}
          </p>
          <ul className="mt-1.5 flex flex-col gap-2">
            {shown.map((f) => {
              const location = f.filePath ? `${f.filePath}${f.line != null ? `:${f.line}` : ""}` : null;
              return (
                <li key={f.id} className="rounded-md border p-2">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Badge variant={severityVariant(f.severity)}>{labels.severityLabel(f.severity)}</Badge>
                    <Badge variant="muted">{f.tool}</Badge>
                  </div>
                  <p className="text-[11px] font-medium">{f.title}</p>
                  {location && f.filePath && (
                    onOpenFile ? (
                      <button
                        type="button"
                        onClick={() => onOpenFile(f.filePath!, f.line)}
                        title={fmt(labels.openLocation, { location })}
                        className="mt-0.5 block max-w-full truncate text-start font-mono text-[11px] text-primary underline-offset-2 hover:underline"
                      >
                        {location}
                      </button>
                    ) : (
                      <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">{location}</p>
                    )
                  )}
                  {onFixWithAi && (
                    <Button size="sm" variant="ghost" className="mt-1 h-7 px-2 text-[11px]" onClick={() => onFixWithAi(f)}>
                      <Wand2 className="size-3" /> {labels.fixWithAi}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
          {filtered.length > shown.length && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 w-full text-[11px]"
              onClick={() => setLimit((l) => l + PAGE_SIZE)}
            >
              {labels.showMore}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
