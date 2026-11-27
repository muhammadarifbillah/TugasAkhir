import { describe, expect, it } from "vitest";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { VIEWER_INITIAL, filterByShelf, keyToAction, pointerTilt, viewerReducer, visibleCategories, wallPose, type ViewerState } from "./gallery-logic";

const opened = (page: 0 | 1 | 2 = 0): ViewerState => ({ open: "marketplace", page, dir: 1 });

describe("gallery logic", () => {
  it("viewerReducer opens a category on page 1 and close resets", () => {
    expect(viewerReducer(VIEWER_INITIAL, { type: "open", id: "marketplace" })).toEqual({ open: "marketplace", page: 0, dir: 1 });
    expect(viewerReducer(VIEWER_INITIAL, { type: "open", id: "lms", page: 2 }).page).toBe(2);
    expect(viewerReducer(opened(1), { type: "close" })).toEqual(VIEWER_INITIAL);
  });

  it("next and prev wrap around the three pages with a direction", () => {
    let s = opened(0);
    for (const want of [1, 2, 0]) {
      s = viewerReducer(s, { type: "next" });
      expect(s.page).toBe(want);
      expect(s.dir).toBe(1);
    }
    s = opened(0);
    for (const want of [2, 1]) {
      s = viewerReducer(s, { type: "prev" });
      expect(s.page).toBe(want);
      expect(s.dir).toBe(-1);
    }
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

  it("keyToAction maps the arrow keys only", () => {
    expect(keyToAction("ArrowRight")).toBe("next");
    expect(keyToAction("ArrowLeft")).toBe("prev");
    for (const k of ["Enter", "a", "ArrowUp"]) expect(keyToAction(k)).toBeNull();
  });

  // Owner decision 2026-11-27 (herosection.jpeg): the wall is concave, the viewer stands inside the cylinder.
  it("wallPose builds a concave wall: edge panels larger and closer, all turned to face the centre", () => {
    const n = 8;
    const poses = Array.from({ length: n }, (_, i) => wallPose(i, n));
    for (const edge of [0, 7])
      for (const mid of [3, 4]) {
        expect(poses[edge].scale, `scale ${edge}>${mid}`).toBeGreaterThan(poses[mid].scale);
        expect(poses[edge].z, `z ${edge}>${mid}`).toBeGreaterThan(poses[mid].z);
      }
    // Monotonic towards the edges on the left half (the right half mirrors it).
    for (const i of [0, 1, 2]) {
      expect(poses[i].scale).toBeGreaterThan(poses[i + 1].scale);
      expect(poses[i].z).toBeGreaterThan(poses[i + 1].z);
      expect(poses[i].rotateY).toBeGreaterThan(poses[i + 1].rotateY);
    }
    poses.forEach((p, i) => {
      if (i < (n - 1) / 2) expect(p.rotateY, `rotateY ${i}`).toBeGreaterThan(0);
      else expect(p.rotateY, `rotateY ${i}`).toBeLessThan(0);
      const mirror = poses[n - 1 - i];
      expect(p.rotateY).toBe(-mirror.rotateY);
      expect(p.z).toBe(mirror.z);
      expect(p.scale).toBe(mirror.scale);
      for (const v of [p.rotateY, p.z, p.scale]) expect(Object.is(v, -0)).toBe(false);
    });
    const odd = wallPose(1, 3);
    expect(odd.rotateY).toBe(0);
    for (const v of [odd.rotateY, odd.z, odd.scale]) expect(Object.is(v, -0)).toBe(false);
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

  it("pointerTilt is clamped to -1..1 and safe for zero width", () => {
    expect(pointerTilt(150, 100, 100)).toBe(0);
    expect(Object.is(pointerTilt(150, 100, 100), -0)).toBe(false);
    expect(pointerTilt(100, 100, 100)).toBe(-1);
    expect(pointerTilt(200, 100, 100)).toBe(1);
    expect(pointerTilt(0, 100, 100)).toBe(-1);
    expect(pointerTilt(900, 100, 100)).toBe(1);
    expect(pointerTilt(133.3333, 100, 100)).toBe(-0.333);
    expect(pointerTilt(50, 0, 0)).toBe(0);
  });
});
