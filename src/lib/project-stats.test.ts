import { test } from "vitest";
import assert from "node:assert/strict";

import {
  artifactsFingerprint,
  getActiveStageCode,
  getProjectScore,
  getProjectStack,
  getScoreInfo,
  getStageProgress,
  scoreBadgeVariant,
  scoreBand,
  scoreColorClass,
} from "./project-stats";

test("scoreBand uses the shared thresholds", () => {
  assert.equal(scoreBand(null), "none");
  assert.equal(scoreBand(85), "good");
  assert.equal(scoreBand(60), "fair");
  assert.equal(scoreBand(59), "poor");
  assert.equal(scoreBadgeVariant(90), "success");
  assert.equal(scoreBadgeVariant(undefined), "secondary");
});

test("artifactsFingerprint is order-independent and content-sensitive", () => {
  const a = artifactsFingerprint({ "a.ts": "1", "b.ts": "2" });
  assert.equal(a, artifactsFingerprint({ "b.ts": "2", "a.ts": "1" }));
  assert.notEqual(a, artifactsFingerprint({ "a.ts": "1", "b.ts": "3" }));
});

test("getScoreInfo labels the source and detects a stale scan", () => {
  const code = { "index.ts": "x" };
  const fp = artifactsFingerprint(code);
  const fresh = getScoreInfo({ codeArtifacts: code, testing: { scanScore: 80, scan: { codeFingerprint: fp } } });
  assert.deepEqual([fresh.source, fresh.stale], ["scanner", false]);
  const stale = getScoreInfo({ codeArtifacts: { "index.ts": "y" }, testing: { scanScore: 80, scan: { codeFingerprint: fp } } });
  assert.equal(stale.stale, true);
  assert.equal(getScoreInfo({ testing: { securityScore: 70 } }).source, "ai");
  assert.equal(getScoreInfo(null).source, null);
});

test("getActiveStageCode returns the first incomplete stage", () => {
  const stages = [
    { code: "design", orderIndex: 1, status: "active" },
    { code: "analysis", orderIndex: 0, status: "completed" },
  ];
  assert.equal(getActiveStageCode(stages), "design");
  assert.equal(getActiveStageCode([{ code: "analysis", orderIndex: 0, status: "completed" }]), "analysis");
  assert.equal(getActiveStageCode([]), null);
});

test("getProjectScore prefers the deterministic scanScore", () => {
  assert.equal(getProjectScore({ globalSpec: { testing: { scanScore: 61, securityScore: 90 } } }), 61);
});

test("getProjectScore falls back to the AI securityScore", () => {
  assert.equal(getProjectScore({ globalSpec: { testing: { securityScore: 72.6 } } }), 73);
});

test("getProjectScore returns null when unscored", () => {
  assert.equal(getProjectScore({ globalSpec: {} }), null);
  assert.equal(getProjectScore({ globalSpec: null }), null);
});

test("getStageProgress counts completed stages", () => {
  assert.deepEqual(
    getStageProgress({ projectStages: [{ status: "completed" }, { status: "active" }, { status: "completed" }] }),
    { completed: 2, total: 3 },
  );
});

test("getProjectStack uses the language plan, then analysis, then TBD", () => {
  assert.equal(
    getProjectStack({ globalSpec: null, languagePlan: { recommendedStack: { languages: ["Next.js", "Postgres"] } } }),
    "Next.js + Postgres",
  );
  assert.equal(getProjectStack({ globalSpec: { analysis: { languages: ["Flask"] } }, languagePlan: null }), "Flask");
  assert.equal(getProjectStack({ globalSpec: null, languagePlan: null }), "TBD");
});

test("scoreColorClass maps score bands", () => {
  assert.equal(scoreColorClass(null), "text-muted-foreground");
  assert.equal(scoreColorClass(90), "text-success");
  assert.equal(scoreColorClass(70), "text-warning");
  assert.equal(scoreColorClass(40), "text-danger");
});
