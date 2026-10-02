import { test } from "vitest";
import assert from "node:assert/strict";

import { detectStack, parseManifest, resolvePlan } from "./registry";

test("detects node from package.json", () => {
  assert.equal(detectStack({ "package.json": "{}" })?.id, "node");
});

test("detects python / php / go / static from markers", () => {
  assert.equal(detectStack({ "requirements.txt": "flask" })?.id, "python");
  assert.equal(detectStack({ "composer.json": "{}" })?.id, "php");
  assert.equal(detectStack({ "go.mod": "module x" })?.id, "go");
  assert.equal(detectStack({ "index.html": "<html>" })?.id, "static");
});

test("manifest stack wins and carries port/services", () => {
  const files = {
    "requirements.txt": "flask",
    ".securesdlc/run.json": JSON.stringify({ stack: "node", port: 4000, services: ["postgres"] }),
  };
  const plan = resolvePlan(files);
  assert.equal(plan?.stackId, "node");
  assert.equal(plan?.port, 4000);
  assert.deepEqual(plan?.services, ["postgres"]);
});

test("falls back to adapter defaults", () => {
  const plan = resolvePlan({ "package.json": "{}" });
  assert.equal(plan?.stackId, "node");
  assert.ok((plan?.install.length ?? 0) > 0);
  assert.ok((plan?.start.length ?? 0) > 0);
  assert.equal(plan?.port, 3000);
});

test("returns null for an unknown stack", () => {
  assert.equal(resolvePlan({ "readme.txt": "x" }), null);
});

test("manifest carries an optional health path", () => {
  const plan = resolvePlan({
    "package.json": "{}",
    ".securesdlc/run.json": JSON.stringify({ healthPath: "/api/health" }),
  });
  assert.equal(plan?.healthPath, "/api/health");
  assert.equal(resolvePlan({ "package.json": "{}" })?.healthPath, undefined);
});

test("parseManifest tolerates missing or invalid json", () => {
  assert.equal(parseManifest({}), null);
  assert.equal(parseManifest({ ".securesdlc/run.json": "{bad" }), null);
});
