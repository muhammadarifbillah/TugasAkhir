"use client";

import { useEffect, useState } from "react";
import { Loader2, Play, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { csrfFetch } from "@/lib/csrf-client";

export interface SecurityScanLabels {
  title: string;
  run: string;
  empty: string;
  failed: string;
  needCode: string;
  skipped: string;
}

interface ScanFinding {
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

const SEVERITY_VARIANT: Record<string, "danger" | "warning" | "secondary"> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "secondary",
};

export function SecurityScanPanel({
  projectId,
  hasCode,
  labels,
}: {
  projectId: string;
  hasCode: boolean;
  labels: SecurityScanLabels;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [findings, setFindings] = useState<ScanFinding[]>([]);
  const [scan, setScan] = useState<ScanSummary | null>(null);

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
    } catch {
      setError(labels.failed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <ShieldAlert className="size-3.5 text-primary" />
          {labels.title}
        </span>
        {score != null && (
          <Badge variant={score >= 85 ? "success" : score >= 60 ? "warning" : "danger"}>
            {score} / 100
          </Badge>
        )}
      </div>

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={loading || !hasCode}
        onClick={run}
      >
        {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Play className="size-3.5" />}
        {loading ? labels.title : labels.run}
      </Button>

      {!hasCode && <p className="mt-2 text-[11px] text-muted-foreground">{labels.needCode}</p>}
      {error && <p className="mt-2 text-[11px] text-danger">{error}</p>}

      {scan?.toolsSkipped && scan.toolsSkipped.length > 0 && (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {labels.skipped}: {scan.toolsSkipped.map((t) => t.tool).join(", ")}
        </p>
      )}

      {findings.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          {findings.slice(0, 25).map((f) => (
            <div key={f.id} className="rounded-md border p-2">
              <div className="mb-1 flex items-center gap-1.5">
                <Badge variant={SEVERITY_VARIANT[f.severity] ?? "secondary"}>{f.severity}</Badge>
                <Badge variant="muted">{f.tool}</Badge>
              </div>
              <p className="text-[11px] font-medium">{f.title}</p>
              {f.filePath && (
                <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                  {f.filePath}
                  {f.line != null ? `:${f.line}` : ""}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
