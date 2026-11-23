import { test } from "vitest";
import assert from "node:assert/strict";

import { levelBadgeClass, levelTextClass, severityRank, severityVariant } from "./severity";

test("maps severity / classification levels to theme tokens", () => {
  assert.match(levelBadgeClass("critical"), /text-danger/);
  assert.match(levelBadgeClass("HIGH"), /text-danger/);
  assert.match(levelBadgeClass("Restricted"), /text-danger/);
  assert.match(levelBadgeClass("medium"), /text-warning/);
  assert.match(levelBadgeClass("Sensitive"), /text-warning/);
  assert.match(levelBadgeClass("low"), /text-info/);
  assert.match(levelBadgeClass("Public"), /text-info/);
  assert.match(levelBadgeClass("unknown"), /text-muted-foreground/);
});

test("low severity is never rendered as success", () => {
  assert.equal(severityVariant("low"), "info");
  assert.doesNotMatch(levelBadgeClass("low"), /success/);
});

test("levelTextClass returns just the text token", () => {
  assert.equal(levelTextClass("high"), "text-danger");
  assert.equal(levelTextClass("medium"), "text-warning");
  assert.equal(levelTextClass("low"), "text-info");
  assert.equal(levelTextClass("n/a"), "text-muted-foreground");
});

test("severityRank orders critical first and unknown last", () => {
  const sorted = ["low", "weird", "critical", "medium", "high"].sort((a, b) => severityRank(a) - severityRank(b));
  assert.deepEqual(sorted, ["critical", "high", "medium", "low", "weird"]);
});
