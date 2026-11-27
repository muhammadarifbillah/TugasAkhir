import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import * as logic from "./gallery-logic";
import { VIEWER_INITIAL, filterByShelf, keyToAction, viewerReducer, visibleCategories, type ViewerState } from "./gallery-logic";

const opened = (page = 0, template = 0): ViewerState => ({ open: "marketplace", template, page, dir: 1 });
const count = (template: number) => SITE_TEMPLATES.marketplace[template].pages.length;

describe("gallery logic", () => {
  it("viewerReducer opens a category on page 1 and close resets", () => {
    expect(viewerReducer(VIEWER_INITIAL, { type: "open", id: "marketplace" })).toEqual({ open: "marketplace", template: 0, page: 0, dir: 1 });
    expect(viewerReducer(VIEWER_INITIAL, { type: "open", id: "lms", page: 2 }).page).toBe(2);
    expect(viewerReducer(opened(1, 2), { type: "close" })).toEqual(VIEWER_INITIAL);
    // Opening another category starts again at its first template.
    expect(viewerReducer(opened(3, 2), { type: "open", id: "lms" })).toEqual({ open: "lms", template: 0, page: 0, dir: 1 });
  });

  it("template picks one of the three templates and sends the page back to 0", () => {
    expect(viewerReducer(opened(4, 0), { type: "template", index: 2 })).toEqual({ open: "marketplace", template: 2, page: 0, dir: 1 });
    expect(viewerReducer(opened(3, 2), { type: "template", index: 1 })).toEqual({ open: "marketplace", template: 1, page: 0, dir: -1 });
    const s = opened(3, 1);
    expect(viewerReducer(s, { type: "template", index: 1 })).toBe(s);
    const closed = { ...VIEWER_INITIAL };
    expect(viewerReducer(closed, { type: "template", index: 1 })).toBe(closed);
  });

  it("next and prev wrap around the active template's real page count with a direction", () => {
    for (const template of [0, 2]) {
      const n = count(template);
      let s = opened(0, template);
      for (let i = 1; i <= n; i++) {
        s = viewerReducer(s, { type: "next" });
        expect(s.page, `t${template} next ${i}`).toBe(i % n);
        expect(s.dir).toBe(1);
      }
      s = viewerReducer(opened(0, template), { type: "prev" });
      expect(s).toMatchObject({ page: n - 1, dir: -1, template });
      s = viewerReducer(s, { type: "prev" });
      expect(s.page).toBe(n - 2);
    }
  });

  it("home and end jump to the first and last page of the active template", () => {
    expect(viewerReducer(opened(2, 1), { type: "end" })).toMatchObject({ page: count(1) - 1, dir: 1, template: 1 });
    expect(viewerReducer(opened(4, 1), { type: "home" })).toMatchObject({ page: 0, dir: -1, template: 1 });
    const first = opened(0, 0);
    expect(viewerReducer(first, { type: "home" })).toBe(first);
    const last = opened(count(0) - 1, 0);
    expect(viewerReducer(last, { type: "end" })).toBe(last);
  });

  it("goto sets the direction and is a no-op for the same page or a closed viewer", () => {
    expect(viewerReducer(opened(0), { type: "goto", page: 2 })).toMatchObject({ page: 2, dir: 1 });
    expect(viewerReducer(opened(2), { type: "goto", page: 0 })).toMatchObject({ page: 0, dir: -1 });
    const s = opened(1);
    expect(viewerReducer(s, { type: "goto", page: 1 })).toBe(s);
    const closed = { ...VIEWER_INITIAL };
    expect(viewerReducer(closed, { type: "next" })).toBe(closed);
    expect(viewerReducer(closed, { type: "prev" })).toBe(closed);
    expect(viewerReducer(closed, { type: "goto", page: 2 })).toBe(closed);
  });

  it("keyToAction maps the arrow keys, Home and End only", () => {
    expect(keyToAction("ArrowRight")).toBe("next");
    expect(keyToAction("ArrowLeft")).toBe("prev");
    expect(keyToAction("Home")).toBe("home");
    expect(keyToAction("End")).toBe("end");
    for (const k of ["Enter", "a", "ArrowUp"]) expect(keyToAction(k)).toBeNull();
  });

  it("filterByShelf keeps one shelf or everything", () => {
    const before = SITE_CATEGORIES.map((c) => c.id);
    const all = filterByShelf(SITE_CATEGORIES, null);
    expect(all.map((c) => c.id)).toEqual(before);
    expect(all).toHaveLength(8);
    expect(all).not.toBe(SITE_CATEGORIES);
    expect(filterByShelf(SITE_CATEGORIES, "learn").map((c) => c.id)).toEqual(["lms", "news"]);
    expect(filterByShelf(SITE_CATEGORIES, "tech").map((c) => c.id)).toEqual(["api"]);
    expect(SITE_CATEGORIES.map((c) => c.id)).toEqual(before);
  });

  it("visibleCategories filters by shelf only in the all view", () => {
    expect(visibleCategories(SITE_CATEGORIES, "all", "learn").map((c) => c.id)).toEqual(["lms", "news"]);
    expect(visibleCategories(SITE_CATEGORIES, "all", null)).toHaveLength(8);
    expect(visibleCategories(SITE_CATEGORIES, "shelves", "learn")).toHaveLength(8);
    expect(visibleCategories(SITE_CATEGORIES, "shelves", null)).toHaveLength(8);
  });

  // r28: the hero became a running row of wide cards (download.jpeg); the concave-wall pose and pointer parallax had no
  // caller left, so they and their projection tests were removed.
  it("the 3D wall helpers wallPose and pointerTilt are gone", () => {
    expect("wallPose" in logic).toBe(false);
    expect("pointerTilt" in logic).toBe(false);
    expect(readFileSync(join(process.cwd(), "src/components/landing/gallery/gallery-logic.ts"), "utf8")).not.toMatch(/WALL_DEPTH|sidePose/);
  });
});
