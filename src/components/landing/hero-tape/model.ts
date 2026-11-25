import { GATE_MAPPING } from "@/lib/landing-facts";
import { enrichFinding } from "@/lib/scanner/mapping";
import { SCORE_WEIGHTS, computeSecurityScore, severityCounts } from "@/lib/scanner/score";
import type { RawFinding } from "@/lib/scanner/types";

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

/** [progress, world px] keyframes of the tape. */
export const TAPE_KEYS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.25, 220],
  [0.5, 330],
  [0.6, 330],
  [0.75, 400],
  [1, 560],
];
/** Heads 1..5 light up (cumulative). */
export const HEAD_AT = [1 / 12, 2 / 12, 3 / 12, 0.4, 0.9] as const;
/** Findings 1..3 are caught by head 4. */
export const CATCH_AT = [0.4, 0.45, 0.5] as const;
/** The brake clamps in [0.40, 0.60). */
export const BRAKE = [0.4, 0.6] as const;
export const FIXED_AT = 0.6;
export const STAMP_AT = 0.7;
/** Copy step index 0..4. */
export const STEP_AT = [0.125, 0.375, 0.625, 0.875] as const;

export interface Pose {
  progress: number;
  tapeX: number;
  headsLit: number;
  caught: number;
  brake: boolean;
  fixed: boolean;
  odometer: number;
  stamp: boolean;
  step: number;
}

const countReached = (marks: readonly number[], p: number) => marks.filter((m) => m <= p).length;

function tapeXAt(p: number): number {
  for (let i = 1; i < TAPE_KEYS.length; i++) {
    const [p1, x1] = TAPE_KEYS[i];
    if (p <= p1) {
      const [p0, x0] = TAPE_KEYS[i - 1];
      return x0 + ((x1 - x0) * (p - p0)) / (p1 - p0);
    }
  }
  return TAPE_KEYS[TAPE_KEYS.length - 1][1];
}

export function poseOf(progress: number): Pose {
  const p = Math.min(1, Math.max(0, progress));
  const caught = countReached(CATCH_AT, p);
  return {
    progress: p,
    tapeX: tapeXAt(p),
    headsLit: countReached(HEAD_AT, p),
    caught,
    brake: BRAKE[0] <= p && p < BRAKE[1],
    fixed: p >= FIXED_AT,
    odometer: computeSecurityScore(HERO_FINDINGS.slice(0, caught)),
    stamp: p >= STAMP_AT,
    step: countReached(STEP_AT, p),
  };
}

// Tier 0 shows the stamp so no information is lost (PRD criterion 19).
export const POSTER_POSE: Pose = { ...poseOf(0.5), stamp: true };
