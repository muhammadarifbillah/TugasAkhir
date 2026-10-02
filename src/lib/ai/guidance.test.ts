import { test } from "vitest";
import assert from "node:assert/strict";

import { stageGuidance, withGuidance } from "./guidance";

test("stageGuidance is localised", () => {
  assert.match(stageGuidance("id"), /ikon mata/);
  assert.match(stageGuidance("en"), /eye icon/);
  assert.match(stageGuidance("id-ID"), /sub-step/);
});

test("withGuidance inserts before a raw JSON block and is idempotent", () => {
  const out = withGuidance('Prose here.\n\n{"summary":"x"}', "GUIDE");
  assert.equal(out, 'Prose here.\n\nGUIDE\n{"summary":"x"}');
  assert.equal(withGuidance(out, "GUIDE"), out);
});

test("withGuidance inserts before a fenced JSON block", () => {
  const out = withGuidance('Hello\n\n```json\n{"a":1}\n```', "GUIDE");
  assert.match(out, /Hello\n\nGUIDE\n```json/);
});

test("withGuidance appends when there is no JSON", () => {
  assert.equal(withGuidance("Just prose", "GUIDE"), "Just prose\n\nGUIDE");
});
