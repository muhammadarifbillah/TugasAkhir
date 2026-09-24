import { test } from "vitest";
import assert from "node:assert/strict";

import { cn } from "./utils";

test("cn merges conditional classes and resolves Tailwind conflicts", () => {
  assert.equal(cn("p-2", false, undefined, "p-4"), "p-4");
  assert.equal(cn("text-sm", ["font-bold"]), "text-sm font-bold");
  assert.equal(cn(), "");
});
