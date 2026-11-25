import { describe, expect, it } from "vitest";
import { GATE_MAPPING } from "@/lib/landing-facts";
import { enrichFinding } from "@/lib/scanner/mapping";
import { SCORE_WEIGHTS, computeSecurityScore } from "@/lib/scanner/score";
import { GATE4_STAMP, HERO_FINDINGS, HERO_SCORE, POSTER_POSE, findingRows, poseOf, severityTally } from "./model";

const withoutProgress = (p: number) => {
  const { progress: _progress, ...rest } = poseOf(p);
  return rest;
};

const TABLE_A = [
  [0, { tapeX: 0, headsLit: 0, brake: false, caught: 0, fixed: false, odometer: 100, stamp: false, step: 0 }],
  [0.25, { tapeX: 220, headsLit: 3, brake: false, caught: 0, fixed: false, odometer: 100, stamp: false, step: 1 }],
  [0.5, { tapeX: 330, headsLit: 4, brake: true, caught: 3, fixed: false, odometer: 91, stamp: false, step: 2 }],
  [0.75, { tapeX: 400, headsLit: 4, brake: false, caught: 3, fixed: true, odometer: 91, stamp: true, step: 3 }],
  [1, { tapeX: 560, headsLit: 5, brake: false, caught: 3, fixed: true, odometer: 91, stamp: true, step: 4 }],
] as const;

describe("hero tape model", () => {
  it("example findings are 2 medium and 1 low", () => {
    expect(severityTally()).toEqual({ medium: 2, low: 1 });
    expect(HERO_FINDINGS.length).toBe(3);
  });

  it("HERO_SCORE comes from computeSecurityScore and is 91", () => {
    expect(HERO_SCORE).toBe(computeSecurityScore([...HERO_FINDINGS]));
    expect(HERO_SCORE).toBe(91);
  });

  it("finding categories come from enrichFinding", () => {
    expect(HERO_FINDINGS.map((f) => enrichFinding(f).category)).toEqual(["injection", "xss", "dependency"]);
  });

  it("rows carry penalty, running score and mapping", () => {
    const rows = findingRows();
    expect(rows.map((r) => r.penalty)).toEqual([4, 4, 1]);
    for (const r of rows) expect(r.penalty).toBe(SCORE_WEIGHTS[r.severity]);
    expect(rows.map((r) => r.scoreAfter)).toEqual([96, 92, 91]);
    expect(rows.map((r) => r.mapping)).toEqual(["A.8.28 · PW.4.1", "A.8.28 · PW.4.1", "A.8.8, A.8.29 · PW.7.2"]);
    expect(rows.map((r) => r.tool)).toEqual(["Semgrep", "Semgrep", "Trivy"]);
  });

  it("gate 4 stamp comes from GATE_MAPPING and differs from finding codes", () => {
    expect(GATE4_STAMP).toBe(GATE_MAPPING[3].iso.join(", ") + " · " + GATE_MAPPING[3].nist);
    expect(GATE4_STAMP).toBe("A.8.29 · PW.8.1");
    expect(GATE4_STAMP).not.toBe(findingRows()[0].mapping);
  });

  it("poseOf matches PRD chapter 10 at 0/25/50/75/100%", () => {
    for (const [p, expected] of TABLE_A) expect(withoutProgress(p)).toEqual(expected);
  });

  it("odometer steps 100 → 96 → 92 → 91 as findings are caught", () => {
    expect(poseOf(0.39).odometer).toBe(100);
    expect(poseOf(0.42).odometer).toBe(96);
    expect(poseOf(0.47).odometer).toBe(92);
    expect(poseOf(0.5).odometer).toBe(91);
    expect(poseOf(0.42).caught).toBe(1);
  });

  it("poseOf is a pure function of progress and clamps", () => {
    const first = poseOf(0.47);
    poseOf(1);
    poseOf(0);
    expect(poseOf(0.47)).toEqual(first);
    expect(withoutProgress(-1)).toEqual(withoutProgress(0));
    expect(withoutProgress(2)).toEqual(withoutProgress(1));
  });

  it("poster pose is the 50% pose with the stamp shown", () => {
    expect(POSTER_POSE).toEqual({ ...poseOf(0.5), stamp: true });
  });
});
