import { test } from "vitest";
import assert from "node:assert/strict";
import { rovingIndex } from "./tab-key-nav";

test("rovingIndex wraps and handles empty or single lists", () => {
  assert.equal(rovingIndex("ArrowDown", 2, 3), 0);
  assert.equal(rovingIndex("ArrowUp", 0, 3), 2);
  assert.equal(rovingIndex("ArrowRight", 0, 3), 1);
  assert.equal(rovingIndex("Home", 2, 3), 0);
  assert.equal(rovingIndex("End", 0, 3), 2);
  assert.equal(rovingIndex("ArrowDown", 0, 1), 0);
  assert.equal(rovingIndex("ArrowDown", 0, 0), -1);
  assert.equal(rovingIndex("Enter", 0, 3), -1);
});
