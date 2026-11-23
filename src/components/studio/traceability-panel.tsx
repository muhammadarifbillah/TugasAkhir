"use client";

import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TraceRowData {
  reqId: string;
  text: string;
  nist: string;
  iso: string[];
  files: string[];
  status: string;
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "info" | "danger"> = {
  Implemented: "success",
  Partial: "warning",
  Gap: "info",
  Issue: "danger",
};

export function TraceabilityPanel({
  projectId,
  labels,
  onOpenFile,
}: {
  projectId: string;
  labels: { title: string; empty: string };
  onOpenFile?: (file: string) => void;
}) {
  const [rows, setRows] = useState<TraceRowData[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/traceability`);
        if (!res.ok) return;
        const data = (await res.json()) as { rows?: TraceRowData[] };
        if (!cancelled) setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch {
        // A failed background load should not block the panel.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium">
        <ListChecks className="size-3.5 text-primary" />
        {labels.title}
      </div>

      {rows.length === 0 ? (
        <p className="mt-2 rounded-md border border-dashed p-3 text-center text-[11px] text-muted-foreground">
          {labels.empty}
        </p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.reqId} className="rounded-md border p-2">
              <div className="mb-1 flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold">{r.reqId}</span>
                <Badge variant={STATUS_VARIANT[r.status] ?? "secondary"}>{r.status}</Badge>
                <span className="ml-auto font-mono text-[11px] text-muted-foreground">{r.nist}</span>
              </div>
              <p className="text-[11px]">{r.text}</p>
              {r.iso.length > 0 && (
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{r.iso.join(", ")}</p>
              )}
              {r.files.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {r.files.map((file) => (
                    <button
                      key={file}
                      type="button"
                      onClick={() => onOpenFile?.(file)}
                      className="truncate rounded border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    >
                      {file}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
