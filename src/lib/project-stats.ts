import type { Prisma } from "@/generated/prisma/client";

/**
 * Security score. Prefers the deterministic score produced by the scanner
 * tooling (`testing.scanScore`); falls back to the AI audit score from the
 * testing stage. Returns null when neither exists, so the number is never
 * misleading.
 */
export function getProjectScore(project: {
  globalSpec: Prisma.JsonValue | null;
}): number | null {
  const gs = (project.globalSpec as Record<string, unknown> | null) ?? {};
  const testing = (gs.testing as Record<string, unknown> | null) ?? {};
  const score = typeof testing.scanScore === "number" ? testing.scanScore : testing.securityScore;
  if (typeof score !== "number") return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Cheap, deterministic fingerprint of the generated source (FNV-1a over the
 * sorted path/content pairs). Used only for change detection — e.g. to flag a
 * scanner score as stale once the code has changed since the last scan.
 */
export function artifactsFingerprint(artifacts: Record<string, string> | null | undefined): string {
  let hash = 0x811c9dc5;
  const entries = Object.entries(artifacts ?? {}).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [path, content] of entries) {
    const chunk = `${path}\u0000${content}\u0001`;
    for (let i = 0; i < chunk.length; i++) {
      hash ^= chunk.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return `${entries.length}:${hash.toString(16)}`;
}

export interface ScoreInfo {
  score: number | null;
  /** "scanner" = deterministic Semgrep/Trivy result, "ai" = model estimate. */
  source: "scanner" | "ai" | null;
  scannedAt: string | null;
  /** True when the code changed after the scan that produced the score. */
  stale: boolean;
}

export function getScoreInfo(globalSpec: Prisma.JsonValue | null): ScoreInfo {
  const gs = (globalSpec as Record<string, unknown> | null) ?? {};
  const testing = (gs.testing as Record<string, unknown> | null) ?? {};
  const scan = (testing.scan as Record<string, unknown> | null) ?? null;
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
  if (typeof testing.scanScore === "number") {
    const fingerprint = typeof scan?.codeFingerprint === "string" ? scan.codeFingerprint : null;
    const current = artifactsFingerprint(gs.codeArtifacts as Record<string, string> | null);
    return {
      score: clamp(testing.scanScore),
      source: "scanner",
      scannedAt: typeof scan?.scannedAt === "string" ? scan.scannedAt : null,
      stale: fingerprint != null && fingerprint !== current,
    };
  }
  if (typeof testing.securityScore === "number") {
    return { score: clamp(testing.securityScore), source: "ai", scannedAt: null, stale: false };
  }
  return { score: null, source: null, scannedAt: null, stale: false };
}

/**
 * Stage the user should land on when opening a project: the first stage that
 * is not completed, or the last stage when everything is done.
 */
export function getActiveStageCode(
  stages: { status: string; code: string; orderIndex: number }[],
): string | null {
  const ordered = [...stages].sort((a, b) => a.orderIndex - b.orderIndex);
  if (ordered.length === 0) return null;
  return (ordered.find((s) => s.status !== "completed") ?? ordered[ordered.length - 1]).code;
}

export function getStageProgress(project: {
  projectStages: { status: string }[];
}): { completed: number; total: number } {
  const completed = project.projectStages.filter((s) => s.status === "completed").length;
  return { completed, total: project.projectStages.length };
}

export function getProjectStack(project: {
  globalSpec: Prisma.JsonValue | null;
  languagePlan: Prisma.JsonValue | null;
}): string {
  const plan = (project.languagePlan as Record<string, unknown> | null) ?? null;
  const stack = (plan?.recommendedStack as Record<string, unknown> | null) ?? null;
  if (stack && Array.isArray(stack.languages) && stack.languages.length > 0) {
    return stack.languages.join(" + ");
  }
  const gs = (project.globalSpec as Record<string, unknown> | null) ?? null;
  const analysis = (gs?.analysis as Record<string, unknown> | null) ?? null;
  if (analysis && Array.isArray(analysis.languages) && analysis.languages.length > 0) {
    return analysis.languages.join(" + ");
  }
  return "TBD";
}

export type ScoreBand = "none" | "good" | "fair" | "poor";

/** Single source of truth for the score thresholds (>=85 good, >=60 fair). */
export function scoreBand(score: number | null | undefined): ScoreBand {
  if (score == null) return "none";
  if (score >= 85) return "good";
  if (score >= 60) return "fair";
  return "poor";
}

const BAND_VARIANT = { none: "secondary", good: "success", fair: "warning", poor: "danger" } as const;
const BAND_TEXT = { none: "text-muted-foreground", good: "text-success", fair: "text-warning", poor: "text-danger" } as const;
const BAND_BG = { none: "bg-muted", good: "bg-success", fair: "bg-warning", poor: "bg-danger" } as const;

export function scoreBadgeVariant(score: number | null | undefined) {
  return BAND_VARIANT[scoreBand(score)];
}

export function scoreColorClass(score: number | null | undefined): string {
  return BAND_TEXT[scoreBand(score)];
}

export function scoreBgClass(score: number | null | undefined): string {
  return BAND_BG[scoreBand(score)];
}
