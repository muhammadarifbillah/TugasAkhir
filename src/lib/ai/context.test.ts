import { test } from "vitest";
import assert from "node:assert/strict";

import { projectContext } from "./context";

test("drops codeArtifacts and designScreens but keeps other fields", () => {
  const spec = {
    scope: "shop",
    codeArtifacts: { "src/app/page.tsx": "x".repeat(1000) },
    design: { uiDesign: ["hero"], designScreens: [{ id: "a", html: "<html>big</html>" }] },
    threatModel: ["spoofing"],
  };
  const out = projectContext(spec) as Record<string, unknown>;
  assert.equal(out.codeArtifacts, undefined);
  assert.equal((out.design as Record<string, unknown>).designScreens, undefined);
  assert.deepEqual((out.design as Record<string, unknown>).uiDesign, ["hero"]);
  assert.equal(out.scope, "shop");
  assert.deepEqual(out.threatModel, ["spoofing"]);
});

test("does not mutate the input spec", () => {
  const spec = { codeArtifacts: { a: "b" }, design: { designScreens: [] } };
  projectContext(spec);
  assert.deepEqual(spec.codeArtifacts, { a: "b" });
  assert.deepEqual(spec.design, { designScreens: [] });
});

test("passes through null and non-object values", () => {
  assert.equal(projectContext(null), null);
  assert.equal(projectContext(undefined), null);
  assert.equal(projectContext("x"), "x");
});
