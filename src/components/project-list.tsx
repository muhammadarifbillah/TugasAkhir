"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewTransition, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m } from "motion/react";
import { FolderGit2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Dictionary } from "@/lib/i18n";
import { csrfFetch } from "@/lib/csrf-client";
import { GATE_CODES, isSearchShortcut, matchesGate, type GateCode } from "@/lib/dashboard-view";
import { fmt } from "@/lib/format";
import { ProjectCard } from "@/components/dashboard/project-card";

export interface ProjectCardData {
  id: string;
  name: string;
  description: string | null;
  status: string;
  version: string;
  stack: string;
  score: number | null;
  scoreSource: "scanner" | "ai" | null;
  scoreStale: boolean;
  activeStage: string;
  stageProgress: { completed: number; total: number };
  revisionCount: number;
  updatedAt: string;
  scannedAt: string | null;
  template: string | null;
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
  const [gate, setGate] = useState<"all" | GateCode>("all");
  const [revisingId, setRevisingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  // Input (ui/input) does not forward refs, so the ref sits on its wrapper.
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!isSearchShortcut({ key: e.key, ctrlKey: e.ctrlKey, metaKey: e.metaKey, altKey: e.altKey, target: e.target as HTMLElement | null, defaultPrevented: e.defaultPrevented, isComposing: e.isComposing })) return;
      e.preventDefault();
      searchRef.current?.querySelector("input")?.focus();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function revise(p: ProjectCardData) {
    setRevisingId(p.id);
    setError(null);
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
        // Previously only logged to the console, so the user saw nothing happen.
        setError(data.error ?? dict.studio.requestFailed);
      }
    } catch {
      setError(dict.studio.networkError);
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
        return matchesGate(p, gate);
      }),
    [projects, filter, query, gate],
  );

  const filterChips: { key: FilterKey; label: string }[] = [
    { key: "all", label: `${dict.dashboard.all} (${counts.all})` },
    { key: "in_progress", label: `${dict.dashboard.inProgress} (${counts.in_progress})` },
    { key: "completed", label: `${dict.dashboard.completed} (${counts.completed})` },
    { key: "in_revision", label: `${dict.dashboard.inRevision} (${counts.in_revision})` },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-3 border-b bg-background px-4 py-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div ref={searchRef} className="relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="project-search"
            name="projectSearch"
            type="search"
            aria-label={dict.dashboard.search}
            placeholder={dict.dashboard.searchHint}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-11 pl-9 md:h-10"
          />
        </div>
        <Select value={gate} onValueChange={(v) => setGate(v as "all" | GateCode)}>
          <SelectTrigger aria-label={dict.dashboard.gateFilter} className="h-11 w-full md:h-10 md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{dict.dashboard.gateFilterAll}</SelectItem>
            {GATE_CODES.map((code, i) => (
              <SelectItem key={code} value={code}>
                {fmt(dict.dashboard.gateNumber, { n: i + 1 })} · {dict.stages[code].name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <Button
              key={chip.key}
              size="sm"
              className="h-11 md:h-8"
              variant={filter === chip.key ? "default" : "outline"}
              onClick={() => setFilter(chip.key)}
            >
              {chip.label}
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={FolderGit2}
          description={
            /* Distinguish "nothing matches this filter/search" from "no projects". */
            projects.length > 0 ? dict.dashboard.noMatches : dict.dashboard.empty
          }
          action={
            projects.length === 0 ? (
              <Button asChild size="sm">
                <Link href={`/${lang}/projects/new`}>{dict.dashboard.newProject}</Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {filtered.map((p, i) => (
              <m.div
                key={p.id}
                layout
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="project-card-enter"
                style={{ "--card-index": Math.min(i, 8) } as React.CSSProperties}
              >
                <ProjectCard
                  project={p}
                  dict={dict}
                  lang={lang}
                  revising={revisingId === p.id}
                  onRevise={() => revise(p)}
                  renderTitle={(t) => (
                    <ViewTransition name={`project-title-${p.id}`} share="morph" default="none">
                      {t}
                    </ViewTransition>
                  )}
                />
              </m.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
