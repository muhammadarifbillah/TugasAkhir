import { describe, expect, it } from "vitest";
import { VIEWER_INITIAL, keyToAction, pointerTilt, viewerReducer, wallPose, type ViewerState } from "./gallery-logic";

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

  it("wallPose curves eight panels symmetrically", () => {
    const n = 8;
    const poses = Array.from({ length: n }, (_, i) => wallPose(i, n));
    poses.forEach((p, i) => {
      const mirror = poses[n - 1 - i];
      expect(p.rotateY).toBe(-mirror.rotateY);
      expect(p.z).toBe(mirror.z);
      expect(Math.abs(p.rotateY)).toBeLessThanOrEqual(21);
      expect(p.z).toBeGreaterThanOrEqual(0);
      expect(Object.is(p.rotateY, -0)).toBe(false);
      expect(Object.is(p.z, -0)).toBe(false);
      if (i > 0) expect(p.rotateY).toBeLessThan(poses[i - 1].rotateY);
    });
    expect(poses[0].z).toBeGreaterThan(poses[3].z);
    expect(Object.is(wallPose(1, 3).rotateY, -0)).toBe(false);
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
