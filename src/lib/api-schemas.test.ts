import { test } from "vitest";
import assert from "node:assert/strict";

import { chatPromptSchema, createKeySchema, createProjectSchema, parseJsonBody } from "./api-schemas";

const req = (body: string) => new Request("http://x/api", { method: "POST", body, headers: { "content-type": "application/json" } });

test("parseJsonBody rejects malformed JSON with 400", async () => {
  const r = await parseJsonBody(req("{bad"), chatPromptSchema);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.equal(r.response.status, 400);
    assert.deepEqual(await r.response.json(), { error: "Invalid JSON" });
  }
});

test("chatPromptSchema rejects blank and oversized prompts", async () => {
  assert.equal((await parseJsonBody(req(JSON.stringify({ projectStageId: "s", prompt: "   " })), chatPromptSchema)).ok, false);
  assert.equal((await parseJsonBody(req(JSON.stringify({ projectStageId: "s", prompt: "a".repeat(8001) })), chatPromptSchema)).ok, false);
  const ok = await parseJsonBody(req(JSON.stringify({ projectStageId: "s", prompt: " hi " })), chatPromptSchema);
  assert.ok(ok.ok && ok.data.prompt === " hi ");
});

test("createKeySchema and createProjectSchema enforce required fields", async () => {
  assert.equal((await parseJsonBody(req(JSON.stringify({ providerCode: "openai" })), createKeySchema)).ok, false);
  assert.equal((await parseJsonBody(req(JSON.stringify({ name: "   " })), createProjectSchema)).ok, false);
  assert.equal((await parseJsonBody(req(JSON.stringify({ name: "x".repeat(121) })), createProjectSchema)).ok, false);
  assert.equal((await parseJsonBody(req("[]"), createProjectSchema)).ok, false);
  const p = await parseJsonBody(req(JSON.stringify({ name: "  Toko  " })), createProjectSchema);
  assert.ok(p.ok && p.data.name === "Toko");
});
