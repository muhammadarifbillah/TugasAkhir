import { test } from "vitest";
import assert from "node:assert/strict";

import { MAX_DESIGN_REFERENCE_CHARS, approvedDesignReference } from "./design-reference";

test("returns null when there are no kept screens", () => {
  assert.equal(approvedDesignReference(null), null);
  assert.equal(approvedDesignReference({}), null);
  assert.equal(approvedDesignReference({ design: { designScreens: [] } }), null);
});

test("includes the first kept screen's html", () => {
  const ref = approvedDesignReference({
    design: {
      designScreens: [{ id: "s1", name: "Home", html: "<html><body>Hi</body></html>" }],
    },
  });
  assert.ok(ref);
  assert.match(ref, /Home/);
  assert.match(ref, /<html><body>Hi<\/body><\/html>/);
});

test("caps the injected html length", () => {
  const ref = approvedDesignReference({
    design: { designScreens: [{ id: "s1", name: "Big", html: "x".repeat(50000) }] },
  });
  assert.ok(ref);
  assert.ok(ref.length <= MAX_DESIGN_REFERENCE_CHARS + 200);
});
