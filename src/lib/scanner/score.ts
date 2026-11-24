import type { RawFinding, ScanSeverity } from "./types";
import { enrichFinding } from "./mapping";

export const SCORE_WEIGHTS: Record<ScanSeverity, number> = {
  critical: 20,
  high: 10,
  medium: 4,
  low: 1,
};

/**
 * Deterministic 0-100 security score: starts at 100 and subtracts a weighted
 * penalty per finding. This replaces the previous AI-guessed score so the number
 * is reproducible and tied to actual tool output.
 */
export function computeSecurityScore(findings: Pick<RawFinding, "severity">[]): number {
  const penalty = findings.reduce((sum, f) => sum + (SCORE_WEIGHTS[f.severity] ?? 0), 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export function severityCounts(findings: { severity: ScanSeverity }[]): Record<ScanSeverity, number> {
  const counts: Record<ScanSeverity, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity] = (counts[f.severity] ?? 0) + 1;
  return counts;
}

/** Attaches NIST/ISO mapping to each raw finding. */
export function enrichFindings(findings: RawFinding[]) {
  return findings.map((f) => {
    const { nistTask, isoControls } = enrichFinding(f);
    return { ...f, nistTask, isoControls };
  });
}
