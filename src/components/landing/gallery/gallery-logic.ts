import type { Dictionary } from "@/lib/i18n";
import type { CategoryId, ShelfId, SiteCategory } from "@/lib/site-categories";

export type PageIndex = 0 | 1 | 2;
export interface ViewerState {
  open: CategoryId | null;
  page: PageIndex;
  dir: 1 | -1;
}
export type ViewerAction =
  | { type: "open"; id: CategoryId; page?: PageIndex }
  | { type: "close" }
  | { type: "next" }
  | { type: "prev" }
  | { type: "goto"; page: PageIndex };

export const VIEWER_INITIAL: ViewerState = { open: null, page: 0, dir: 1 };

export function viewerReducer(s: ViewerState, a: ViewerAction): ViewerState {
  switch (a.type) {
    case "open":
      return { open: a.id, page: a.page ?? 0, dir: 1 };
    case "close":
      return VIEWER_INITIAL;
  }
  if (s.open === null) return s;
  switch (a.type) {
    case "next":
      return { ...s, page: ((s.page + 1) % 3) as PageIndex, dir: 1 };
    case "prev":
      return { ...s, page: ((s.page + 2) % 3) as PageIndex, dir: -1 };
    case "goto":
      return a.page === s.page ? s : { ...s, page: a.page, dir: a.page > s.page ? 1 : -1 };
  }
}

export function keyToAction(key: string): "next" | "prev" | null {
  return key === "ArrowRight" ? "next" : key === "ArrowLeft" ? "prev" : null;
}

/** `+ 0` turns -0 into 0 so inline styles never print "-0deg". */
const noNegZero = (n: number) => n + 0;

/** Perspective (1200px) and projected gap (6px) in desktop panel widths at 1440px (--pw = 10vw + 3.6rem = 201.6px). */
const WALL_DEPTH = 1200 / 201.6;
const WALL_GAP = 6 / 201.6;

/**
 * Right-half pose at offset `a` (>= 0) from the centre (`a0` is the centre-most offset), x not yet placed.
 * z starts at 0: a panel behind the preserve-3d ul plane (z < 0) loses its hover and click to the ul.
 * Scale grows with √d so the inner neighbours widen the wall to the screen edges while the edge panels stay ±1.5-1.8×
 * the centre (herosection.jpeg); z grows with d² so the edges come forward.
 */
const sidePose = (a: number, a0: number) => {
  const d = a - a0;
  return {
    rotateY: noNegZero(-Math.round(12 * a)),
    z: noNegZero(Math.round(0.07 * d * d * 1000) / 1000),
    scale: Math.round((0.64 + 0.16 * Math.sqrt(d)) * 100) / 100,
  };
};

/**
 * Concave wall (viewer inside the cylinder): towards the edges panels come closer, grow and turn to face the centre.
 * x and z are in panel widths for `translateX(x·pw) translateZ(z·pw) rotateY(ry) scale(s)`; x lays the panels out from
 * the centre so their projected edges sit WALL_GAP apart.
 */
export function wallPose(i: number, n: number): { x: number; rotateY: number; z: number; scale: number } {
  const o = i - (n - 1) / 2;
  const a = Math.abs(o);
  const D = WALL_DEPTH;
  const a0 = n % 2 ? 0 : 0.5;
  const centre = sidePose(0, a0);
  // Outer projected edge of the previous panel; an odd wall starts from the centre panel's right edge.
  let edge = n % 2 ? (0.5 * centre.scale * D) / (D - centre.z) : -WALL_GAP / 2;
  let x = 0;
  for (let k = n % 2 ? 1 : 0.5; k <= a; k++) {
    const p = sidePose(k, a0);
    const r = (p.rotateY * Math.PI) / 180;
    const half = 0.5 * p.scale;
    // Inner edge (u = -half) projects to edge + gap: solve X·D/(D-Z) for x.
    x = ((edge + WALL_GAP) * (D - (p.z + half * Math.sin(r)))) / D + half * Math.cos(r);
    x = Math.round(x * 1000) / 1000;
    edge = ((x + half * Math.cos(r)) * D) / (D - (p.z - half * Math.sin(r)));
  }
  const pose = sidePose(a, a0);
  return { x: noNegZero(Math.sign(o) * x), rotateY: noNegZero(Math.sign(o) * pose.rotateY), z: pose.z, scale: pose.scale };
}

/** Pointer position across `width` mapped to -1..1 (3 decimals). */
export function pointerTilt(clientX: number, left: number, width: number): number {
  if (width <= 0) return 0;
  const t = Math.min(1, Math.max(-1, ((clientX - left) / width) * 2 - 1));
  return noNegZero(Math.round(t * 1000) / 1000);
}

export const SHELF_ORDER: readonly ShelfId[] = ["sell", "learn", "business", "tech"];

/** Categories grouped by shelf in SHELF_ORDER; empty shelves are dropped, input order kept. */
export function groupByShelf(cats: readonly SiteCategory[]): { shelf: ShelfId; items: SiteCategory[] }[] {
  return SHELF_ORDER.map((shelf) => ({ shelf, items: cats.filter((c) => c.shelf === shelf) })).filter((g) => g.items.length > 0);
}

/** One shelf's categories (input order), or a copy of all when `shelf` is null. */
export function filterByShelf(cats: readonly SiteCategory[], shelf: ShelfId | null): SiteCategory[] {
  return shelf === null ? [...cats] : cats.filter((c) => c.shelf === shelf);
}

/** What the shelf actually shows: the shelf filter applies only in the "all" grid. */
export function visibleCategories(results: readonly SiteCategory[], view: "shelves" | "all", shelf: ShelfId | null): readonly SiteCategory[] {
  return view === "all" ? filterByShelf(results, shelf) : results;
}

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
type SearchItem = { name: string; desc: string; pages: Record<string, string>; features: Record<string, string> };

/** Every query token must appear in the category's name, description, page names or feature names. */
export function searchCategories(cats: readonly SiteCategory[], query: string, labels: Dictionary["categories"]): SiteCategory[] {
  const tokens = fold(query.trim()).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...cats];
  return cats.filter((c) => {
    const item = labels.items[c.id] as unknown as SearchItem;
    const text = fold(
      [item.name, item.desc, ...c.pages.map((p) => item.pages[p.id]), ...c.features.map((f) => item.features[f])].join(" "),
    );
    return tokens.every((t) => text.includes(t));
  });
}
