import { test } from "vitest";
import assert from "node:assert/strict";

import { completionGaps, getStageDefinition, stepsTouchedByResult } from "./stages";

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

test("design ui sub-step is met by a structured plan or by mockups", () => {
  const withPlan = { design: { uiPlan: { roles: [{ name: "Guest" }] } } };
  assert.ok(!completionGaps("design", withPlan, {}).includes("ui"));

  const withMockups = { design: { designScreens: [{ id: "a", html: "<html>x</html>" }] } };
  assert.ok(!completionGaps("design", withMockups, {}).includes("ui"));

  assert.ok(completionGaps("design", {}, {}).includes("ui"));
});

test("stepsTouchedByResult flags design sub-steps present in the result", () => {
  const ids = stepsTouchedByResult("design", {
    uiDesign: ["hero"],
    architecture: ["layers"],
    mermaid: ["graph TD"],
    recommendations: [{ title: "r" }],
  });
  assert.ok(ids.includes("ui"));
  assert.ok(ids.includes("architecture"));
  assert.ok(ids.includes("diagram"));
  assert.ok(ids.includes("recommendations"));
  assert.ok(!ids.includes("stride"));
});

test("stepsTouchedByResult returns only valid step ids", () => {
  assert.deepEqual(stepsTouchedByResult("analysis", { bogus: true }), []);
  assert.deepEqual(stepsTouchedByResult("analysis", { recommendedStack: {} }), ["stack"]);
});

test("getStageDefinition throws for an unknown stage", () => {
  assert.throws(() => getStageDefinition("nope"));
});
