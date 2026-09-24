import { test } from "vitest";
import assert from "node:assert/strict";

import { levelBadgeClass, levelTextClass } from "./severity";

test("maps severity / classification levels to theme tokens", () => {
  assert.match(levelBadgeClass("critical"), /text-danger/);
  assert.match(levelBadgeClass("HIGH"), /text-danger/);
  assert.match(levelBadgeClass("Restricted"), /text-danger/);
  assert.match(levelBadgeClass("medium"), /text-warning/);
  assert.match(levelBadgeClass("Sensitive"), /text-warning/);
  assert.match(levelBadgeClass("low"), /text-success/);
  assert.match(levelBadgeClass("Public"), /text-success/);
  assert.match(levelBadgeClass("unknown"), /text-muted-foreground/);
});

test("levelTextClass returns just the text token", () => {
  assert.equal(levelTextClass("high"), "text-danger");
  assert.equal(levelTextClass("medium"), "text-warning");
  assert.equal(levelTextClass("low"), "text-success");
  assert.equal(levelTextClass("n/a"), "text-muted-foreground");
});
