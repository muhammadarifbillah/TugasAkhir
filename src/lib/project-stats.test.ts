import { test } from "vitest";
import assert from "node:assert/strict";

import { getProjectScore, getProjectStack, getStageProgress, scoreColorClass } from "./project-stats";

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
