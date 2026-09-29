import { test } from "vitest";
import assert from "node:assert/strict";

import { requirementIdFor } from "./requirement-id";

test("requirementIdFor produces stable zero-padded ids", () => {
  assert.equal(requirementIdFor(0), "REQ-SEC-001");
  assert.equal(requirementIdFor(9), "REQ-SEC-010");
  assert.equal(requirementIdFor(41), "REQ-SEC-042");
});
