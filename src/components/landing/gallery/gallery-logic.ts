import type { Dictionary } from "@/lib/i18n";
import type { CategoryId, ShelfId, SiteCategory } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";

export interface ViewerState {
  open: CategoryId | null;
  /** Index into SITE_TEMPLATES[open] (0-2). */
  template: number;
  /** Index into the active template's pages. */
  page: number;
  dir: 1 | -1;
}
export type ViewerAction =
  | { type: "open"; id: CategoryId; page?: number }
  | { type: "close" }
  | { type: "template"; index: number }
  | { type: "next" }
  | { type: "prev" }
  | { type: "home" }
  | { type: "end" }
  | { type: "goto"; page: number };

export const VIEWER_INITIAL: ViewerState = { open: null, template: 0, page: 0, dir: 1 };

const goto = (s: ViewerState, page: number): ViewerState => (page === s.page ? s : { ...s, page, dir: page > s.page ? 1 : -1 });

export function viewerReducer(s: ViewerState, a: ViewerAction): ViewerState {
  switch (a.type) {
    case "open":
      return { open: a.id, template: 0, page: a.page ?? 0, dir: 1 };
    case "close":
      return VIEWER_INITIAL;
  }
  if (s.open === null) return s;
  const n = SITE_TEMPLATES[s.open][s.template].pages.length;
  switch (a.type) {
    case "template":
      return a.index === s.template ? s : { ...s, template: a.index, page: 0, dir: a.index > s.template ? 1 : -1 };
    case "next":
      return { ...s, page: (s.page + 1) % n, dir: 1 };
    case "prev":
      return { ...s, page: (s.page + n - 1) % n, dir: -1 };
    case "home":
      return goto(s, 0);
    case "end":
      return goto(s, n - 1);
    case "goto":
      return goto(s, a.page);
  }
}

export function keyToAction(key: string): "next" | "prev" | "home" | "end" | null {
  return key === "ArrowRight" ? "next" : key === "ArrowLeft" ? "prev" : key === "Home" ? "home" : key === "End" ? "end" : null;
}

/** Tab index after a key press inside the template tablist (arrows wrap), or null for other keys. */
export function tabKey(key: string, current: number, count: number): number | null {
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current + count - 1) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}

// r28: wallPose/pointerTilt (concave 3D hero wall + parallax) were removed; the hero is a running row of wide cards.

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
