import { test } from "vitest";
import assert from "node:assert/strict";

import { githubPushError } from "./github-push-error";

const fail = (status: number, message: string) => Object.assign(new Error(message), { status });

test("githubPushError maps Octokit failures by status, not only by message text", () => {
  // Fine-grained PATs without Administration: write get this 403, whose message has no "403".
  assert.match(githubPushError(fail(403, "Resource not accessible by personal access token")), /denied write access/);
  assert.match(githubPushError(fail(401, "Requires authentication")), /authentication failed/);
  assert.match(
    githubPushError(fail(422, 'Repository creation failed.: {"message":"name already exists on this account"}')),
    /already exists/,
  );
  assert.match(githubPushError(new Error("Bad credentials")), /authentication failed/);
  assert.match(githubPushError(fail(500, "Server Error")), /GitHub push failed/);
  assert.match(githubPushError("boom"), /GitHub push failed/);
});
