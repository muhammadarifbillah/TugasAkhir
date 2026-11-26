import { test } from "vitest";
import assert from "node:assert/strict";

import { choicesSchema, stageResultSchema } from "./result";

const option = (label: string, extra: Record<string, unknown> = {}) => ({
  label,
  ...extra,
});

test("choicesSchema accepts 2-4 options with one recommendation", () => {
  const parsed = choicesSchema.parse({
    question: "Which auth method?",
    options: [
      option("Email + password", { recommended: true, value: "email" }),
      option("Magic link", { description: "No passwords to store" }),
    ],
  });
  assert.equal(parsed.options.length, 2);
  assert.equal(parsed.options[0].recommended, true);
});

test("choicesSchema rejects a single option and more than four", () => {
  const one = { question: "Q?", options: [option("only")] };
  const five = {
    question: "Q?",
    options: [option("a"), option("b"), option("c"), option("d"), option("e")],
  };
  assert.equal(choicesSchema.safeParse(one).success, false);
  assert.equal(choicesSchema.safeParse(five).success, false);
});

test("stageResultSchema keeps choices and unrelated fields", () => {
  const parsed = stageResultSchema.parse({
    summary: "ok",
    choices: { question: "Scope?", options: [option("Web"), option("Mobile")] },
    recommendedStack: { frontend: "Next.js" },
  });
  assert.equal(parsed.choices?.question, "Scope?");
  assert.equal(parsed.choices?.options.length, 2);
  assert.deepEqual(parsed.recommendedStack, { frontend: "Next.js" });
});
