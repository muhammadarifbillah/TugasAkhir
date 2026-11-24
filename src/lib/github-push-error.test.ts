import { test } from "vitest";
import assert from "node:assert/strict";

import { githubPushError, githubRevisionWarning } from "./github-push-error";

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

test("githubRevisionWarning names the Pull requests permission on 403", () => {
  const err = Object.assign(new Error("Resource not accessible by personal access token"), { status: 403 });
  assert.match(githubRevisionWarning(err), /Pull requests: Read and write/);
  assert.match(githubRevisionWarning(new Error("boom")), /Check the linked token and repository/);
});

test("githubPushError names the Workflows permission when the project ships a CI file", () => {
  // GitHub answers 403 with an empty body and `contents=write` in the headers for
  // .github/workflows/* writes, so the token gap is invisible without this hint.
  const err = fail(403, "Resource not accessible by personal access token");
  assert.match(githubPushError(err, { hasWorkflows: true }), /Workflows: Read and write/);
  assert.doesNotMatch(githubPushError(err), /Workflows/);
  assert.match(githubPushError(fail(500, "Server Error"), { hasWorkflows: true }), /GitHub push failed/);
});
