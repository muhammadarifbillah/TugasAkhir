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

test("caps the injected html length and marks the truncation", () => {
  const ref = approvedDesignReference({
    design: { designScreens: [{ id: "s1", name: "Big", html: "x".repeat(50000) }] },
  });
  assert.ok(ref);
  assert.ok(ref.length <= MAX_DESIGN_REFERENCE_CHARS + 200);
  assert.match(ref, /truncated: remaining design omitted/);
});

test("includes every kept screen, not just the first", () => {
  const ref = approvedDesignReference({
    design: {
      designScreens: [
        { id: "s1", name: "Login", html: "<html><body>Login page</body></html>" },
        { id: "s2", name: "Dashboard", html: "<html><body>Dashboard page</body></html>" },
      ],
    },
  });
  assert.ok(ref);
  assert.match(ref, /Login/);
  assert.match(ref, /Login page/);
  assert.match(ref, /Dashboard/);
  assert.match(ref, /Dashboard page/);
});
