import { fmt } from "@/lib/format";

// Locked to STAGE_DEFINITIONS by a test: stages.ts carries the system prompts and must stay out of the client bundle.
export const GATE_CODES = ["analysis", "design", "development", "testing", "handover"] as const;
export type GateCode = (typeof GATE_CODES)[number];

type Progress = { completed: number; total: number };
export type GateState = "done" | "active" | "pending";

export function gateRail(activeStage: string, progress: Progress) {
  const allDone = progress.total > 0 && progress.completed >= progress.total;
  const found = GATE_CODES.indexOf(activeStage as GateCode);
  const activeIndex = allDone ? null : Math.max(found, 0);
  const segments = GATE_CODES.map((code, i) => ({
    code,
    n: (i + 1) as 1 | 2 | 3 | 4 | 5,
    state: (activeIndex === null || i < activeIndex ? "done" : i === activeIndex ? "active" : "pending") as GateState,
  }));
  return { segments, activeIndex };
}

export function matchesGate(p: { activeStage: string; stageProgress: Progress }, gate: "all" | GateCode): boolean {
  if (gate === "all") return true;
  const { activeIndex } = gateRail(p.activeStage, p.stageProgress);
  return activeIndex !== null && GATE_CODES[activeIndex] === gate;
}

export function dashboardStats(cards: { status: string; score: number | null; scoreSource: string | null }[]) {
  const scanned = cards.filter((c) => c.scoreSource === "scanner" && c.score != null);
  return {
    inProgress: cards.filter((c) => c.status === "in_progress" || c.status === "draft").length,
    completed: cards.filter((c) => c.status === "completed").length,
    inRevision: cards.filter((c) => c.status === "in_revision").length,
    avgScanScore: scanned.length ? Math.round(scanned.reduce((sum, c) => sum + c.score!, 0) / scanned.length) : null,
    scannedCount: scanned.length,
  };
}

export interface ScoreSourceCopy {
  scanner: string;
  scannerNoDate: string;
  ai: string;
  none: string;
  stale: string;
}

export function scoreSourceText(
  p: { scoreSource: string | null; scannedAt: string | null; scoreStale: boolean },
  copy: ScoreSourceCopy,
): string {
  // slice, not Intl: identical on server and client, so no hydration mismatch.
  const base =
    p.scoreSource === "scanner"
      ? p.scannedAt
        ? fmt(copy.scanner, { date: p.scannedAt.slice(0, 10) })
        : copy.scannerNoDate
      : p.scoreSource === "ai"
        ? copy.ai
        : copy.none;
  return p.scoreStale ? `${base} · ${copy.stale}` : base;
}

export function isSearchShortcut(e: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  target: { tagName?: string; isContentEditable?: boolean } | null;
  defaultPrevented?: boolean;
  isComposing?: boolean;
}): boolean {
  if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.isComposing) return false;
  const tag = e.target?.tagName?.toUpperCase();
  return !(tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable);
}
