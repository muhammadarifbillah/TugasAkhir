import { test } from "vitest";
import assert from "node:assert/strict";

import { MAX_SCREENS, createScreen, normalizeScreens } from "./design";

test("createScreen builds a valid screen", () => {
  const screen = createScreen({ html: "<html><body>Hi</body></html>", prompt: "login page" });
  assert.ok(screen.id.startsWith("scr_"));
  assert.equal(screen.device, "desktop");
  assert.ok(screen.html.includes("<html>"));
});

test("normalizeScreens keeps valid screens and drops empty/oversized", () => {
  const screens = normalizeScreens([
    { id: "a", name: "Home", device: "mobile", html: "<html>a</html>" },
    { id: "b", name: "Empty", html: "   " },
    { id: "c", name: "Huge", html: "x".repeat(300 * 1024) },
  ]);
  assert.equal(screens.length, 1);
  assert.equal(screens[0].id, "a");
  assert.equal(screens[0].device, "mobile");
});

test("normalizeScreens caps the number of screens", () => {
  const many = Array.from({ length: MAX_SCREENS + 5 }, (_, i) => ({
    id: `s${i}`,
    name: `S${i}`,
    html: "<html>x</html>",
  }));
  assert.equal(normalizeScreens(many).length, MAX_SCREENS);
});

test("normalizeScreens returns [] for garbage", () => {
  assert.deepEqual(normalizeScreens("nope"), []);
  assert.deepEqual(normalizeScreens([null, 5]), []);
});
