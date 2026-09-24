import { test } from "vitest";
import assert from "node:assert/strict";

import { runnerDisabled } from "./mode";

test("runnerDisabled reflects RUNNER_MODE", () => {
  const previous = process.env.RUNNER_MODE;

  process.env.RUNNER_MODE = "disabled";
  assert.equal(runnerDisabled(), true);

  process.env.RUNNER_MODE = "local-docker";
  assert.equal(runnerDisabled(), false);

  delete process.env.RUNNER_MODE;
  assert.equal(runnerDisabled(), false);

  if (previous !== undefined) process.env.RUNNER_MODE = previous;
});
