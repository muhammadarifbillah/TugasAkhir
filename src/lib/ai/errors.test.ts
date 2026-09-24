import { test } from "vitest";
import assert from "node:assert/strict";

import { classifyProviderError, EmptyModelOutputError, NoModelConfiguredError } from "./errors";

test("classifies missing model config and empty output", () => {
  assert.equal(classifyProviderError(new NoModelConfiguredError("x"))?.code, "NO_MODEL_CONFIGURED");
  assert.equal(classifyProviderError(new EmptyModelOutputError())?.code, "EMPTY_OUTPUT");
});

test("classifies a provider 503 overload, even wrapped in an AI_RetryError", () => {
  const inner = Object.assign(new Error("Service Unavailable"), {
    name: "AI_APICallError",
    statusCode: 503,
    responseBody:
      '{"error":{"code":503,"message":"This model is currently experiencing high demand."}}',
  });
  const wrapped = Object.assign(new Error("Failed after 3 attempts"), {
    name: "AI_RetryError",
    lastError: inner,
    errors: [inner],
  });

  const info = classifyProviderError(wrapped);
  assert.equal(info?.status, 503);
  assert.equal(info?.code, "AI_OVERLOADED");
});

test("classifies timeouts and rate limits", () => {
  const timeout = Object.assign(new Error("aborted"), { name: "TimeoutError" });
  assert.equal(classifyProviderError(timeout)?.code, "AI_TIMEOUT");

  const rate = Object.assign(new Error("rate limit exceeded"), {
    name: "AI_APICallError",
    statusCode: 429,
  });
  assert.equal(classifyProviderError(rate)?.code, "AI_RATE_LIMITED");
});

test("returns null for unclassified errors", () => {
  assert.equal(classifyProviderError(new Error("boom")), null);
});
