import { test } from "vitest";
import assert from "node:assert/strict";

import { getRemainingRequests, rateLimited, rateLimitedAny } from "./rate-limit";

test("rateLimited blocks after the limit within the window", () => {
  const key = `test:${Math.random()}`;
  assert.equal(rateLimited(key, 2, 60_000), false);
  assert.equal(rateLimited(key, 2, 60_000), false);
  assert.equal(rateLimited(key, 2, 60_000), true);
});

test("getRemainingRequests decreases after a hit", () => {
  const key = `remain:${Math.random()}`;
  assert.equal(getRemainingRequests(key, 3, 60_000), 3);
  rateLimited(key, 3, 60_000);
  assert.equal(getRemainingRequests(key, 3, 60_000), 2);
});

test("rateLimitedAny reports when any bucket is exceeded", () => {
  const key = `any:${Math.random()}`;
  assert.equal(rateLimitedAny([{ key, limit: 1, windowMs: 60_000 }]), false);
  assert.equal(rateLimitedAny([{ key, limit: 1, windowMs: 60_000 }]), true);
});
