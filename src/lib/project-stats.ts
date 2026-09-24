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

export function scoreColorClass(score: number | null): string {
  if (score == null) return "text-muted-foreground";
  if (score >= 85) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-danger";
}
