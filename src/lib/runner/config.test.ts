import { test, afterEach } from "vitest";
import assert from "node:assert/strict";

import { runnerBindHost } from "./config";

afterEach(() => {
  delete process.env.RUNNER_BIND_HOST;
});

test("defaults to loopback", () => {
  delete process.env.RUNNER_BIND_HOST;
  assert.equal(runnerBindHost(), "127.0.0.1");
});

test("honours RUNNER_BIND_HOST and ignores blank values", () => {
  process.env.RUNNER_BIND_HOST = "0.0.0.0";
  assert.equal(runnerBindHost(), "0.0.0.0");
  process.env.RUNNER_BIND_HOST = "   ";
  assert.equal(runnerBindHost(), "127.0.0.1");
});
