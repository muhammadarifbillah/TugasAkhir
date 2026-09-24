import { test } from "vitest";
import assert from "node:assert/strict";

import { sanitizePrompt } from "./sanitize";

test("redacts common secret patterns before they reach the model", () => {
  assert.match(sanitizePrompt("key sk-proj-abcdefghijklmnopqrstuvwxyz"), /\[REDACTED\]/);
  assert.match(sanitizePrompt("ghp_0123456789012345678901234567890123"), /\[REDACTED\]/);
  assert.match(sanitizePrompt("Authorization: Bearer abcdefghijklmnopqrstuvwxyz"), /\[REDACTED\]/);
  assert.match(sanitizePrompt("aws AKIAIOSFODNN7EXAMPLE done"), /\[REDACTED\]/);
});

test("leaves ordinary text untouched", () => {
  assert.equal(sanitizePrompt("build a secure login page"), "build a secure login page");
});
