import { test } from "vitest";
import assert from "node:assert/strict";

import { completionGaps, getStageDefinition } from "./stages";

test("analysis is incomplete until every sub-step is present", () => {
  assert.deepEqual(completionGaps("analysis", {}, {}), [
    "scope",
    "stack",
    "security",
    "data",
    "recommendations",
  ]);
});

test("analysis completes when all sub-steps are satisfied", () => {
  const spec = {
    analysis: {
      summary: "A login portal",
      recommendedStack: { languages: ["Next.js"] },
      securityRequirements: ["Hash passwords"],
      dataClassification: ["PII"],
    },
  };
  assert.deepEqual(completionGaps("analysis", spec, { recommendationCount: 3 }), []);
});

test("sequential lock: later steps stay locked while an earlier one is unmet", () => {
  const spec = {
    analysis: {
      recommendedStack: { languages: ["Next.js"] },
      securityRequirements: ["Hash passwords"],
      dataClassification: ["PII"],
    },
  };
  const gaps = completionGaps("analysis", spec, { recommendationCount: 3 });
  assert.equal(gaps[0], "scope");
});

test("testing score step accepts a scanner score", () => {
  const spec = {
    testing: {
      summary: "audit",
      findings: [{ severity: "low" }],
      fixedArtifacts: {},
      scanScore: 61,
    },
  };
  const gaps = completionGaps("testing", spec, { recommendationCount: 3 });
  assert.ok(!gaps.includes("score"));
});

test("getStageDefinition throws for an unknown stage", () => {
  assert.throws(() => getStageDefinition("nope"));
});
