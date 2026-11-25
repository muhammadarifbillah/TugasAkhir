import { GATE_MAPPING } from "@/lib/landing-facts";
import { enrichFinding } from "@/lib/scanner/mapping";
import { SCORE_WEIGHTS, computeSecurityScore, severityCounts } from "@/lib/scanner/score";
import type { RawFinding } from "@/lib/scanner/types";
import { poseCore, type PoseCore } from "./pose";

// Worked example for the hero; categories and score are computed by the product functions, not typed in.
export const HERO_FINDINGS: readonly RawFinding[] = [
  {
    tool: "semgrep",
    ruleId: "sql-injection",
    severity: "medium",
    title: "SQL injection in the search query",
    description: null,
    filePath: "app/api/search/route.ts",
    line: 14,
    cwe: "CWE-89",
    owasp: null,
    raw: null,
  },
  {
    tool: "semgrep",
    ruleId: "unescaped-html",
    severity: "medium",
    title: "Unescaped HTML in a comment (XSS)",
    description: null,
    filePath: "components/comment.tsx",
    line: 9,
    cwe: "CWE-79",
    owasp: null,
    raw: null,
  },
  {
    tool: "trivy",
    ruleId: "outdated-package",
    severity: "low",
    title: "Outdated package with a known vulnerability",
    description: null,
    filePath: "package.json",
    line: 12,
    cwe: null,
    owasp: null,
    raw: null,
  },
];

export const HERO_SCORE = computeSecurityScore([...HERO_FINDINGS]);

export function severityTally(): { medium: number; low: number } {
  const { medium, low } = severityCounts([...HERO_FINDINGS]);
  return { medium, low };
}

const codes = (iso: string[], nist: string) => `${iso.join(", ")} · ${nist}`;

export const GATE4_STAMP = codes(GATE_MAPPING[3].iso, GATE_MAPPING[3].nist);

export function findingRows() {
  return HERO_FINDINGS.map((f, i) => {
    const { isoControls, nistTask } = enrichFinding(f);
    return {
      severity: f.severity,
      tool: f.tool === "trivy" ? "Trivy" : "Semgrep",
      penalty: SCORE_WEIGHTS[f.severity],
      scoreAfter: computeSecurityScore(HERO_FINDINGS.slice(0, i + 1)),
      mapping: codes(isoControls, nistTask),
    };
  });
}

export { BRAKE, CATCH_AT, FIXED_AT, HEAD_AT, STAMP_AT, STEP_AT, TAPE_KEYS } from "./pose";

export type Pose = PoseCore & { odometer: number };

export function poseOf(progress: number): Pose {
  const core = poseCore(progress);
  return { ...core, odometer: computeSecurityScore(HERO_FINDINGS.slice(0, core.caught)) };
}

// Tier 0 shows the stamp so no information is lost (PRD criterion 19).
export const POSTER_POSE: Pose = { ...poseOf(0.5), stamp: true };