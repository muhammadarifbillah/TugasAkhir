"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  FolderGit2,
  GitPullRequest,
  Search,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { Dictionary } from "@/lib/i18n";
import { csrfFetch } from "@/lib/csrf-client";
import { scoreColorClass } from "@/lib/project-stats";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: string;
  stack: string;
  score: number | null;
  stageProgress: { completed: number; total: number };
  revisionCount: number;
  updatedAt: string;
}

type FilterKey = "all" | "in_progress" | "completed" | "in_revision";

export function ProjectList({
  projects,
  dict,
  lang,
}: {
  projects: ProjectCardData[];
  dict: Dictionary;
  lang: string;
}) {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [query, setQuery] = useState("");
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const router = useRouter();

  async function revise(p: ProjectCardData) {
    setRevisingId(p.id);
    try {
      const res = await csrfFetch("/api/revisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: p.id, summary: dict.dashboard.revisionSummary.replace("{name}", p.name) }),
      });
      const data = (await res.json()) as { error?: string };
      if (res.ok) {
        router.push(`/${lang}/studio/${p.id}/analysis`);
        router.refresh();
      } else {
        console.error("[project-list] revise failed:", data.error);
      }
    } catch (err) {
      console.error("[project-list] revise error:", err);
    } finally {
      setRevisingId(null);
    }
  }

  const counts = useMemo(
    () => ({
      all: projects.length,
      in_progress: projects.filter((p) => p.status === "in_progress" || p.status === "draft").length,
      completed: projects.filter((p) => p.status === "completed").length,
      in_revision: projects.filter((p) => p.status === "in_revision").length,
    }),
    [projects],
  );

  const filtered = useMemo(
    () =>
      projects.filter((p) => {
        if (filter !== "all") {
          if (filter === "in_progress" && !(p.status === "in_progress" || p.status === "draft")) return false;
          if (filter === "completed" && p.status !== "completed") return false;
          if (filter === "in_revision" && p.status !== "in_revision") return false;
        }
        if (query && !`${p.name} ${p.stack} ${p.description ?? ""}`.toLowerCase().includes(query.toLowerCase())) {
          return false;
        }
        return true;
      }),
    [projects, filter, query],
  );

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: `${dict.dashboard.all} (${counts.all})` },
    { key: "in_progress", label: `${dict.dashboard.inProgress} (${counts.in_progress})` },
    { key: "completed", label: `${dict.dashboard.completed} (${counts.completed})` },
    { key: "in_revision", label: `${dict.dashboard.inRevision} (${counts.in_revision})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={dict.dashboard.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <Button
              key={chip.key}
              size="sm"
              variant={filter === chip.key ? "default" : "outline"}
              onClick={() => setFilter(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FolderGit2 className="size-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{dict.dashboard.empty}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const status = p.status === "completed"
              ? { variant: "success" as const, text: dict.dashboard.statusCompleted }
              : p.status === "in_revision"
                ? { variant: "warning" as const, text: dict.dashboard.statusInRevision }
                : p.status === "draft"
                  ? { variant: "default" as const, text: dict.dashboard.statusDraft }
                  : { variant: "muted" as const, text: dict.dashboard.statusInProgress };
            return (
              <Card key={p.id} className="transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.name}</p>
                      {p.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p>
                      )}
                    </div>
                    <Badge variant={status.variant}>{status.text}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">#{p.stack}</Badge>
                    <Badge variant="outline">{dict.dashboard.version}: {p.version}</Badge>
                    {p.revisionCount > 0 && (
                      <Badge variant="outline">
                        <GitPullRequest className="size-3" /> {p.revisionCount}
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    <ShieldCheck className={`size-4 ${scoreColorClass(p.score)}`} />
                    <span className={scoreColorClass(p.score)}>
                      {p.score != null
                        ? `${dict.dashboard.securityScore}: ${p.score}%`
                        : `${dict.dashboard.securityScore}: ${dict.studio.notScored}`}
                    </span>
                  </div>
                  <Progress
                    value={p.score ?? 0}
                    indicatorClassName={
                      p.score == null
                        ? "bg-muted"
                        : p.score >= 85
                          ? "bg-success"
                          : p.score >= 60
                            ? "bg-warning"
                            : "bg-danger"
                    }
                  />

                  <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="muted">
                      {dict.dashboard.stageLabel} {p.stageProgress.completed}/{p.stageProgress.total}
                    </Badge>
                    <div className="flex gap-2">
                      {p.status === "completed" && (
                        <Button size="sm" variant="outline" onClick={() => revise(p)} disabled={revisingId === p.id}>
                          <RefreshCw className={`size-3 ${revisingId === p.id ? "animate-spin" : ""}`} />
                          {dict.dashboard.revise}
                        </Button>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/${lang}/studio/${p.id}/analysis`}>
                          {dict.dashboard.openStudio} <ArrowRight className="size-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
