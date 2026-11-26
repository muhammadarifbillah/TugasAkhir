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

/** Coverflow panorama: panels turn to face the centre more steeply towards the edges and recede; the centre pair is enlarged. */
export function wallPose(i: number, n: number): { rotateY: number; z: number; scale: number } {
  const o = i - (n - 1) / 2;
  return {
    rotateY: noNegZero(-Math.sign(o) * Math.round(6 * Math.abs(o) + 1.5 * o * o)),
    z: noNegZero(-Math.round(18 * (o * o - 0.25))),
    scale: Math.abs(o) < 1 ? 1.06 : 1,
  };
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
