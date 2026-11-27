import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import { VIEWER_INITIAL, filterByShelf, keyToAction, pointerTilt, viewerReducer, visibleCategories, wallPose, type ViewerState } from "./gallery-logic";

const opened = (page = 0, template = 0): ViewerState => ({ open: "marketplace", template, page, dir: 1 });
const count = (template: number) => SITE_TEMPLATES.marketplace[template].pages.length;

/** Desktop wall: perspective 1200px, 8 panels, 10/19 art. hh = hero height (100svh - 3.5rem); pw = --pw at that width (hero-wall.test.ts). */
const P = 1200;
const N = 8;
const ASPECT = 1.9;
const VIEWS = [
  { vw: 1024, hh: 712, pw: 160 },
  { vw: 1440, hh: 844, pw: 201.6 },
  { vw: 1920, hh: 1024, pw: 249.6 },
];
/** Screen x (from the wall centre) of local point u on a panel, as the browser projects it. */
const project = (p: ReturnType<typeof wallPose>, u: number, pw: number) => {
  const r = (p.rotateY * Math.PI) / 180;
  const X = p.x * pw + p.scale * u * Math.cos(r);
  const Z = p.z * pw - p.scale * u * Math.sin(r);
  return (X * P) / (P - Z);
};
const projectedEdges = (pw: number) => Array.from({ length: N }, (_, i) => [project(wallPose(i, N), -pw / 2, pw), project(wallPose(i, N), pw / 2, pw)]);

const LABEL_NAMES = ["id", "en"].map((l) => {
  const items = JSON.parse(readFileSync(join(process.cwd(), `src/dictionaries/${l}.json`), "utf8")).categories.items as Record<string, { name: string }>;
  return SITE_CATEGORIES.map((c) => items[c.id].name.toUpperCase());
});
/** Inner padding (pr-2 / pl-2) of the first and last labels, which align towards the inside (hero-wall.tsx). */
const LABEL_PAD = 8;
/** Projected [left, right] of each label's text: wrapped like the browser, first right-aligned, last left-aligned, rest centred. */
const labelBoxes = (list: string[], vw: number, pw: number) => {
  return list.map((name, i) => {
    const outer = i === 0 || i === list.length - 1;
    // hero-wall.tsx label: text-[clamp(0.8rem,1vw,1rem)] (outer: 0.7rem floor, so "MARKETPLACE" fits the 116 px left on
    // screen at 1024), tracking 0.2em; ~0.62em per caps glyph in the light face.
    const fs = Math.min(16, Math.max(outer ? 11.2 : 12.8, vw / 100));
    const textWidth = (s: string) => s.length * fs * 0.82;
    // Outer labels also keep 30 % of the panel free on the off-screen side (pl/pr-[30%]), so they wrap inside what is visible.
    const room = outer ? pw * 0.7 - LABEL_PAD : pw;
    const lines: string[] = [];
    for (const word of name.split(" ")) {
      expect(textWidth(word), `${vw}px "${word}" fits the panel`).toBeLessThanOrEqual(room);
      const last = lines.at(-1);
      if (last !== undefined && textWidth(`${last} ${word}`) <= room) lines[lines.length - 1] = `${last} ${word}`;
      else lines.push(word);
    }
    expect(lines.length, `${vw}px "${name}" lines`).toBeLessThanOrEqual(2);
    const w = Math.min(room, Math.max(...lines.map(textWidth)));
    const [a, b] = i === 0 ? [pw / 2 - LABEL_PAD - w, pw / 2 - LABEL_PAD] : i === list.length - 1 ? [-pw / 2 + LABEL_PAD, -pw / 2 + LABEL_PAD + w] : [-w / 2, w / 2];
    return [project(wallPose(i, N), a, pw), project(wallPose(i, N), b, pw)];
  });
};

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
      expect(p.x).toBe(-mirror.x);
      expect(p.z).toBe(mirror.z);
      expect(p.scale).toBe(mirror.scale);
      for (const v of [p.rotateY, p.x, p.z, p.scale]) expect(Object.is(v, -0)).toBe(false);
    });
    const odd = wallPose(1, 3);
    expect(odd.rotateY).toBe(0);
    expect(odd.x).toBe(0);
    for (const v of [odd.rotateY, odd.x, odd.z, odd.scale]) expect(Object.is(v, -0)).toBe(false);
  });

  // r22 round 2: panels overlapped (translateZ before rotateY, z in px against a vw width). The li now applies
  // translateX(x·pw) translateZ(z·pw) rotateY(ry) scale(s) under perspective 1200px; project both edges like the browser.
  it("wallPose projects a wall with 2-10 px gaps at 1024, 1440 and 1920", () => {
    for (const { vw, pw } of VIEWS) {
      const edges = projectedEdges(pw);
      for (let i = 1; i < N; i++) {
        const gap = edges[i][0] - edges[i - 1][1];
        expect(gap, `${vw}px gap ${i - 1}|${i}`).toBeGreaterThanOrEqual(2);
        expect(gap, `${vw}px gap ${i - 1}|${i}`).toBeLessThanOrEqual(10);
      }
    }
  });

  // r23 (herosection.jpeg): the centre panel is ±28 % of the hero height and the edge panels ±47 %, with slim 10/19 panels.
  it("wallPose sizes the projected wall like the reference at 1024x768, 1440x900 and 1920x1080", () => {
    for (const { vw, hh, pw } of VIEWS) {
      const height = (i: number) => (ASPECT * pw * wallPose(i, N).scale * P) / (P - wallPose(i, N).z * pw) / hh;
      const centre = height(3);
      const edge = height(7);
      expect(height(4), `${vw}px centre symmetric`).toBeCloseTo(centre, 6);
      expect(centre, `${vw}px centre ${centre}`).toBeGreaterThanOrEqual(0.26);
      expect(centre, `${vw}px centre ${centre}`).toBeLessThanOrEqual(0.32);
      expect(edge, `${vw}px edge ${edge}`).toBeGreaterThanOrEqual(0.42);
      expect(edge, `${vw}px edge ${edge}`).toBeLessThanOrEqual(0.5);
      expect(edge / centre, `${vw}px edge/centre`).toBeGreaterThanOrEqual(1.5);
      expect(edge / centre, `${vw}px edge/centre`).toBeLessThanOrEqual(1.8);
    }
  });

  // r23: the wall fills the width like the reference; the outer panels may run off the screen edge but stay readable.
  it("wallPose reaches both viewport edges, cuts an edge panel by at most a third and keeps its label centre inside", () => {
    for (const { vw, pw } of VIEWS) {
      const edges = projectedEdges(pw);
      expect(edges[0][0], `${vw}px left black`).toBeLessThanOrEqual(-vw / 2 + 24);
      expect(edges[N - 1][1], `${vw}px right black`).toBeGreaterThanOrEqual(vw / 2 - 24);
      for (const [i, cut] of [[0, -vw / 2 - edges[0][0]], [N - 1, edges[N - 1][1] - vw / 2]] as const) {
        const width = edges[i][1] - edges[i][0];
        expect(Math.max(0, cut) / width, `${vw}px panel ${i} cut`).toBeLessThanOrEqual(1 / 3);
        // The label is centred over the panel, so its centre projects with the panel centre (u = 0).
        expect(Math.abs(project(wallPose(i, N), 0, pw)), `${vw}px label ${i} centre`).toBeLessThanOrEqual(vw / 2 - 16);
      }
    }
  });

  // r23 round 2: slimmer panels, so labels wrap (at most two lines) inside the panel width and never cover a neighbour's.
  it("projected panel labels of neighbours never overlap by more than 4 px", () => {
    for (const { vw, pw } of VIEWS)
      for (const list of LABEL_NAMES) {
        const boxes = labelBoxes(list, vw, pw);
        for (let i = 1; i < N; i++) expect(boxes[i - 1][1] - boxes[i][0], `${vw}px labels ${i - 1}|${i}`).toBeLessThanOrEqual(4);
      }
  });

  // r23 round 3: the cut edge panels pushed a centred label off screen ("RKETPLACE", "DOKUMENTA…"). The first label is
  // right-aligned and the last left-aligned (towards the inside, pr-2/pl-2), so the whole text box stays on screen.
  it("projected label text of every panel lies inside the viewport with at least 4 px to spare", () => {
    for (const { vw, pw } of VIEWS)
      for (const list of LABEL_NAMES)
        labelBoxes(list, vw, pw).forEach(([l, r], i) => {
          expect(l, `${vw}px label ${i} left`).toBeGreaterThanOrEqual(-vw / 2 + 4);
          expect(r, `${vw}px label ${i} right`).toBeLessThanOrEqual(vw / 2 - 4);
        });
  });

  // r22 round 3: a panel behind z=0 sat behind the preserve-3d ul plane, so the ul swallowed its hover and click.
  it("wallPose keeps every panel at z >= 0 with the centre exactly at 0", () => {
    for (const n of [3, 8]) {
      const z = Array.from({ length: n }, (_, i) => wallPose(i, n).z);
      for (const v of z) expect(v, `n=${n}`).toBeGreaterThanOrEqual(0);
      expect(Math.min(...z), `n=${n}`).toBe(0);
    }
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
