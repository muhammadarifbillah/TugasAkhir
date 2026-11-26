import { test } from "vitest";
import assert from "node:assert/strict";

import {
  MAX_ROLES,
  MAX_SCREENS,
  MAX_SCREEN_HTML,
  createScreen,
  designScreensSchema,
  effectiveDesignPlan,
  hasVisibleContent,
  normalizePlan,
  normalizeScreens,
  mockupDevicesFor,
  parseDesignScreens,
  planPageKey,
  screenForHref,
  uniqueScreensById,
  type DesignPlan,
  type DesignScreen,
} from "./design";

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

test("designScreensSchema rejects html larger than the read-side cap", () => {
  const oversized = [
    { id: "a", name: "Huge", device: "desktop", html: "x".repeat(MAX_SCREEN_HTML + 1) },
  ];
  assert.equal(designScreensSchema.safeParse(oversized).success, false);
  // At the cap is still accepted (so a stored screen never vanishes on read).
  const atCap = [{ id: "a", name: "Ok", html: "x".repeat(MAX_SCREEN_HTML) }];
  assert.equal(designScreensSchema.safeParse(atCap).success, true);
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

test("createScreen keeps role / planKey / planVersion", () => {
  const s = createScreen({
    html: "<html>x</html>",
    name: "Login",
    role: "Guest",
    planKey: "guest.login",
    planVersion: 2,
  });
  assert.equal(s.role, "Guest");
  assert.equal(s.planKey, "guest.login");
  assert.equal(s.planVersion, 2);
});

test("normalizeScreens preserves role / planKey", () => {
  const out = normalizeScreens([
    { id: "a", name: "A", html: "<html>a</html>", role: "Student", planKey: "student.dashboard" },
  ]);
  assert.equal(out[0].role, "Student");
  assert.equal(out[0].planKey, "student.dashboard");
});

test("normalizePlan fills ids and caps roles", () => {
  const plan = normalizePlan({
    version: 3,
    roles: [{ name: "Student", pages: [{ name: "Dashboard" }, { name: "" }] }],
  });
  assert.equal(plan.version, 3);
  assert.equal(plan.roles.length, 1);
  assert.equal(plan.roles[0].name, "Student");
  assert.ok(plan.roles[0].id);
  assert.equal(plan.roles[0].pages.length, 2);
  assert.ok(plan.roles[0].pages[0].id);

  const many = { roles: Array.from({ length: MAX_ROLES + 5 }, (_, i) => ({ name: `R${i}` })) };
  assert.equal(normalizePlan(many).roles.length, MAX_ROLES);
});

test("normalizePlan returns empty roles for garbage", () => {
  assert.deepEqual(normalizePlan("nope").roles, []);
  assert.deepEqual(normalizePlan({ roles: [null, 5] }).roles, []);
});

test("planPageKey joins role and page ids", () => {
  assert.equal(planPageKey("student", "dashboard"), "student.dashboard");
});

test("uniqueScreensById drops duplicate ids, later wins", () => {
  const out = uniqueScreensById([
    { id: "a", name: "A1", device: "desktop", html: "<html>1</html>" },
    { id: "b", name: "B", device: "desktop", html: "<html>2</html>" },
    { id: "a", name: "A2", device: "mobile", html: "<html>3</html>" },
  ]);
  assert.equal(out.length, 2);
  assert.equal(out.find((s) => s.id === "a")?.name, "A2");
  assert.equal(out.find((s) => s.id === "b")?.name, "B");
});

test("effectiveDesignPlan merges analysis roles into the uiPlan", () => {
  const plan = effectiveDesignPlan({
    analysis: { roles: ["Guest", "Teacher"] },
    design: {
      uiPlan: { version: 2, roles: [{ name: "Teacher", pages: [{ name: "Dashboard" }] }] },
    },
  });
  assert.deepEqual(
    plan.roles.map((r) => r.name).sort(),
    ["Guest", "Teacher"],
  );
  assert.equal(plan.roles.find((r) => r.name === "Teacher")?.pages.length, 1);
  assert.equal(plan.roles.find((r) => r.name === "Guest")?.pages.length, 0);
  assert.equal(plan.version, 2);
});

test("effectiveDesignPlan returns the plan unchanged without analysis roles", () => {
  const plan = effectiveDesignPlan({ design: { uiPlan: { roles: [{ name: "A" }] } } });
  assert.equal(plan.roles.length, 1);
  assert.equal(plan.roles[0].name, "A");
});

test("mockupDevicesFor maps declared targets to unlocked viewports", () => {
  assert.deepEqual(mockupDevicesFor(["web", "mobile"]), ["desktop", "tablet", "mobile"]);
  assert.deepEqual(mockupDevicesFor(["web"]), ["desktop", "tablet"]);
  assert.deepEqual(mockupDevicesFor(["mobile"]), ["mobile"]);
  // Legacy projects (no targets) keep every viewport.
  assert.deepEqual(mockupDevicesFor([]), ["desktop", "tablet", "mobile"]);
});

test("screenForHref resolves plan routes and screen names", () => {
  const screens: DesignScreen[] = [
    { id: "scr_home", name: "Landing", device: "desktop", html: "<html>home</html>", planKey: "role1.pg1" },
    { id: "scr_login", name: "Login", device: "desktop", html: "<html>login</html>" },
  ];
  const plan: DesignPlan = {
    version: 1,
    roles: [
      {
        id: "role1",
        name: "Guest",
        pages: [{ id: "pg1", name: "Landing", route: "/" }],
      },
    ],
  };

  assert.equal(screenForHref("/", screens, plan)?.id, "scr_home");
  assert.equal(screenForHref("/login", screens, plan)?.id, "scr_login");
  assert.equal(screenForHref("https://example.test/login?x=1", screens, plan)?.id, "scr_login");
  assert.equal(screenForHref("/missing", screens, plan), null);
  assert.equal(screenForHref("#", screens, plan), null);
  assert.equal(screenForHref("mailto:a@b.test", screens, plan), null);
});

test("screenForHref maps the root route to a home-like screen", () => {
  const screens: DesignScreen[] = [
    { id: "scr_root", name: "Home", device: "desktop", html: "<html>home</html>" },
    { id: "scr_index", name: "Index", device: "desktop", html: "<html>home</html>" },
  ];
  const plan: DesignPlan = { version: 1, roles: [] };
  assert.equal(screenForHref("/", screens, plan)?.id, "scr_root");
  assert.equal(screenForHref("/index", screens, plan)?.id, "scr_index");
  assert.equal(screenForHref("#plans", screens, plan), null);
});
