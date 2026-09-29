import { test } from "vitest";
import assert from "node:assert/strict";

import { MAX_SCREENS, createScreen, hasVisibleContent, normalizeScreens, parseDesignScreens } from "./design";

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

test("hasVisibleContent rejects empty shells and script/style-only documents", () => {
  assert.equal(hasVisibleContent("<html><head><style>body{color:red}</style></head><body></body></html>"), false);
  assert.equal(hasVisibleContent("<html><body><script>document.write('x')</script></body></html>"), false);
  assert.equal(hasVisibleContent("<html><body>   </body></html>"), false);
});

test("hasVisibleContent accepts text and media", () => {
  assert.equal(hasVisibleContent("<html><body><h1>Hello</h1></body></html>"), true);
  assert.equal(hasVisibleContent('<html><body><img src="data:image/png;base64,AAA"></body></html>'), true);
});

test("parseDesignScreens reads a JSON array of screens", () => {
  const out = parseDesignScreens(
    JSON.stringify([
      { name: "Login", html: "<html><body>Login</body></html>" },
      { name: "Dashboard", html: "<html><body>Dashboard</body></html>" },
    ]),
  );
  assert.equal(out.length, 2);
  assert.equal(out[0].name, "Login");
  assert.match(out[1].html, /Dashboard/);
});

test("parseDesignScreens reads {screens:[...]} inside a fenced block", () => {
  const text = 'Here you go:\n```json\n{"screens":[{"name":"Home","html":"<html><body>Home</body></html>"}]}\n```';
  const out = parseDesignScreens(text);
  assert.equal(out.length, 1);
  assert.equal(out[0].name, "Home");
});

test("parseDesignScreens falls back to raw HTML document blocks", () => {
  const text = 'Screen one:\n<!doctype html><html><body>A</body></html>\nScreen two:\n<html><body>B</body></html>';
  const out = parseDesignScreens(text);
  assert.equal(out.length, 2);
  assert.match(out[0].html, /<body>A<\/body>/);
  assert.match(out[1].html, /<body>B<\/body>/);
});

test("parseDesignScreens returns [] for garbage", () => {
  assert.deepEqual(parseDesignScreens("no screens here"), []);
});
