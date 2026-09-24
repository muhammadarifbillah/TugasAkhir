"use client";

import { useState } from "react";
import { Database, Loader2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { csrfFetch } from "@/lib/csrf-client";

export interface DatabaseRow {
  projectId: string;
  projectName: string;
  service: string;
  hostPort: number;
  status: string;
}

interface DatabaseListProps {
  rows: DatabaseRow[];
  labels: { empty: string; delete: string; failed: string; networkError: string };
}

export function DatabaseList({ rows, labels }: DatabaseListProps) {
  const [items, setItems] = useState(rows);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function remove(projectId: string) {
    setBusy(projectId);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${projectId}/database`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? labels.failed);
        return;
      }
      setItems((prev) => prev.filter((r) => r.projectId !== projectId));
    } catch {
      setError(labels.networkError);
    } finally {
      setBusy(null);
    }
  }

  if (items.length === 0) {
    return <EmptyState icon={Database} description={labels.empty} className="border-0 py-8" />;
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
      {items.map((row) => (
        <div
          key={row.projectId}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
        >
          <div className="flex min-w-0 items-center gap-2">
            <Badge variant="secondary">{row.service}</Badge>
            <span className="truncate font-medium">{row.projectName}</span>
            <span className="font-mono text-xs text-muted-foreground">:{row.hostPort}</span>
            <Badge variant="success">{row.status}</Badge>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => remove(row.projectId)}
            disabled={busy === row.projectId}
          >
            {busy === row.projectId ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5 text-destructive" />
            )}
            {labels.delete}
          </Button>
        </div>
      ))}
    </div>
  );
}
