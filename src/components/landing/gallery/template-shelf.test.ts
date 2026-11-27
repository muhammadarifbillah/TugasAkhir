import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { GalleryProvider } from "./gallery-provider";
import { SHELF_ORDER, groupByShelf, searchCategories } from "./gallery-logic";
import { TemplateShelf } from "./template-shelf";

type Json = Record<string, unknown>;
type ProviderProps = Parameters<typeof GalleryProvider>[0];
type ShelfCopy = Parameters<typeof TemplateShelf>[0]["copy"];
type Item = { name: string; pages: Record<string, string> };

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const DICTS = {
  id: JSON.parse(read("src/dictionaries/id.json")) as { landing: Json; categories: Json; app: { name: string } },
  en: JSON.parse(read("src/dictionaries/en.json")) as { landing: Json; categories: Json; app: { name: string } },
};
const labelsOf = (lang: "id" | "en") => DICTS[lang].categories as unknown as ProviderProps["labels"];
const itemOf = (lang: "id" | "en", id: string) => (DICTS[lang].categories.items as Record<string, Item>)[id];
const ids = (cats: readonly { id: string }[]) => cats.map((c) => c.id);

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Json).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

const strings = (value: unknown): string[] =>
  typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value as Json).flatMap(strings) : [];

const FORBIDDEN = [
  "certified",
  "compliant",
  "certification",
  "bersertifikat",
  "sertifikasi resmi",
  "patuh",
  "aman 100%",
  "100% aman",
  "100% secure",
  "guaranteed",
  "terjamin",
  "dijamin",
];

describe("template shelf", () => {
  it("groupByShelf follows SHELF_ORDER and drops empty shelves", () => {
    const groups = groupByShelf(SITE_CATEGORIES);
    expect(groups.map((g) => [g.shelf, ids(g.items)])).toEqual([
      ["sell", ["marketplace", "ecommerce"]],
      ["learn", ["lms", "news"]],
      ["business", ["saas", "clinic", "company"]],
      ["tech", ["api"]],
    ]);
    const noApi = groupByShelf(SITE_CATEGORIES.filter((c) => c.id !== "api"));
    expect(noApi.map((g) => g.shelf)).toEqual(["sell", "learn", "business"]);
  });

  it("searchCategories filters by name, pages and features in each language", () => {
    const before = ids(SITE_CATEGORIES);
    for (const lang of ["id", "en"] as const) {
      const labels = labelsOf(lang);
      for (const q of ["", "   "]) {
        const all = searchCategories(SITE_CATEGORIES, q, labels);
        expect(ids(all)).toEqual(before);
        expect(all).not.toBe(SITE_CATEGORIES);
      }
      for (const c of SITE_CATEGORIES) {
        const q = `  ${itemOf(lang, c.id).name.toUpperCase()} `;
        expect(ids(searchCategories(SITE_CATEGORIES, q, labels)), `${lang}/${c.id}`).toContain(c.id);
      }
      const lms = itemOf(lang, "lms");
      const lmsCat = SITE_CATEGORIES.find((c) => c.id === "lms")!;
      expect(ids(searchCategories(SITE_CATEGORIES, `${lms.name} ${lms.pages[lmsCat.pages[0].id]}`, labels))).toContain("lms");
      expect(searchCategories(SITE_CATEGORIES, "zzz-tidak-ada", labels)).toEqual([]);
    }
    const clinic = itemOf("id", "clinic").name.replace("i", "í");
    expect(clinic).toContain("í");
    expect(ids(searchCategories(SITE_CATEGORIES, clinic, labelsOf("id")))).toContain("clinic");
    expect(ids(SITE_CATEGORIES)).toEqual(before);
  });

  it("TemplateShelf renders four shelves of covers that open the viewer", () => {
    const d = DICTS.id;
    const gallery = d.landing.gallery as ProviderProps["copy"];
    const copy = d.landing.shelf as ShelfCopy;
    const labels = labelsOf("id");
    const html = renderToStaticMarkup(
      createElement(
        GalleryProvider,
        { lang: "id", appName: d.app.name, labels, copy: gallery } as ProviderProps,
        createElement(TemplateShelf, { copy }),
      ),
    );
    expect(html.match(/<h3/g)?.length).toBe(4);
    for (const name of Object.values(labels.shelves)) expect(html).toMatch(new RegExp(`<h3[^>]*>${escape(name)}</h3>`));
    const covers = [...html.matchAll(/<button[^>]*data-shelf-cover[^>]*>/g)].map((m) => m[0]);
    expect(covers).toHaveLength(8);
    const labelsSeen = covers.map((tag) => /aria-label="([^"]*)"/.exec(tag)?.[1]);
    const expected = SITE_CATEGORIES.map((c) => escape(fmt(gallery.openPanel, { category: itemOf("id", c.id).name })));
    expect([...labelsSeen].sort()).toEqual([...expected].sort());
    for (const tag of covers) expect(tag).toContain('type="button"');
    const input = /<input[^>]*type="search"[^>]*>/.exec(html)?.[0];
    expect(input).toBeDefined();
    const inputId = /id="([^"]+)"/.exec(input!)?.[1];
    expect(inputId).toBeDefined();
    expect(html).toContain(`<label for="${inputId}"`);
    expect(html).toMatch(new RegExp(`<button[^>]*aria-pressed="true"[^>]*>${escape(copy.tabShelves)}</button>`));
    expect(html).toMatch(new RegExp(`<button[^>]*aria-pressed="false"[^>]*>${escape(copy.tabAll)}</button>`));
    expect(html).toContain(escape(fmt(copy.count, { n: 8 })));
  });

  it("TemplateShelf shows upright books on embossed planks with a see-all link per shelf", () => {
    const d = DICTS.id;
    const gallery = d.landing.gallery as ProviderProps["copy"];
    const copy = d.landing.shelf as ShelfCopy & Record<"seeAll" | "seeAllShelf", string>;
    const labels = labelsOf("id");
    const html = renderToStaticMarkup(
      createElement(
        GalleryProvider,
        { lang: "id", appName: d.app.name, labels, copy: gallery } as ProviderProps,
        createElement(TemplateShelf, { copy }),
      ),
    );
    expect(html.match(/<h3/g)?.length).toBe(4);
    expect(html.match(/<button[^>]*data-shelf-cover/g)?.length).toBe(8);
    for (const attr of ["data-book=", "data-book-spine", "data-book-title"]) expect(html.split(attr).length - 1, attr).toBe(8);
    expect(html.match(/data-shelf-plank/g)?.length).toBe(4);
    const seeAll = [...html.matchAll(/<button[^>]*data-see-all[^>]*>([\s\S]*?)<\/button>/g)];
    expect(seeAll).toHaveLength(4);
    const want = SHELF_ORDER.map((s) => labels.shelves[s]).map((shelf) => `aria-label="${escape(fmt(copy.seeAllShelf, { shelf }))}"`);
    seeAll.forEach((m, i) => {
      expect(m[0]).toContain(want[i]);
      expect(m[1]).toContain(escape(copy.seeAll));
    });
  });

  // R10: lg:grid-cols-2 and bg-card dropped — the reference puts one shelf per row and the plank now uses explicit palette colours (see "plank is painted with opaque palette colours").
  it("shelf source lays shelves side by side and paints planks opaquely", () => {
    const src = read("src/components/landing/gallery/template-shelf.tsx");
    for (const s of ["aspect-[2/3]", "visibleCategories", "data-shelf-plank", "data-shelf-panel", "data-shelf-toolbar", "motion-reduce:"]) expect(src).toContain(s);
    for (const s of ["bg-[var(--fuse-card-bg)]", "backdrop", "setInterval"]) expect(src).not.toContain(s);
  });

  it("new shelf keys exist in id and en with placeholders", () => {
    const id = DICTS.id.landing.shelf as Record<string, string>;
    const en = DICTS.en.landing.shelf as Record<string, string>;
    for (const s of [id, en]) {
      for (const k of ["seeAll", "seeAllShelf", "shelfOnly", "allShelves"]) expect(typeof s[k], k).toBe("string");
      expect(s.seeAllShelf).toContain("{shelf}");
      expect(s.shelfOnly).toContain("{shelf}");
    }
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort());
    const text = [id, en].flatMap((s) => ["seeAll", "seeAllShelf", "shelfOnly", "allShelves"].map((k) => s[k] ?? "")).join("\n").toLowerCase();
    for (const p of FORBIDDEN) expect(text).not.toContain(p);
  });

  it("shelf source is client-filtered, motion-safe and blur-free", () => {
    const src = read("src/components/landing/gallery/template-shelf.tsx");
    for (const s of ["searchCategories", "groupByShelf", "motion-reduce:", "snap-x"]) expect(src).toContain(s);
    for (const s of ["backdrop", "setInterval", "fetch("]) expect(src).not.toContain(s);
  });

  const renderShelf = () => {
    const d = DICTS.id;
    return renderToStaticMarkup(
      createElement(
        GalleryProvider,
        { lang: "id", appName: d.app.name, labels: labelsOf("id"), copy: d.landing.gallery as ProviderProps["copy"] } as ProviderProps,
        createElement(TemplateShelf, { copy: d.landing.shelf as ShelfCopy }),
      ),
    );
  };
  const classOf = (tag: string) => (/class="([^"]*)"/.exec(tag)?.[1] ?? "").split(/\s+/);

  it("shelf header fits a 390px column: section min-w-0, title may wrap, see-all shrink-0", () => {
    const html = renderShelf();
    const sections = [...html.matchAll(/<section[^>]*data-shelf[^>]*>/g)].map((m) => classOf(m[0]));
    expect(sections).toHaveLength(4);
    for (const c of sections) expect(c).toContain("min-w-0");
    const titles = [...html.matchAll(/<h3[^>]*>/g)].map((m) => classOf(m[0]));
    expect(titles).toHaveLength(4);
    for (const c of titles) {
      expect(c).toContain("min-w-0");
      expect(c).not.toContain("truncate");
      expect(c).not.toContain("whitespace-nowrap");
    }
    const seeAll = [...html.matchAll(/<button[^>]*data-see-all[^>]*>/g)].map((m) => classOf(m[0]));
    expect(seeAll).toHaveLength(4);
    for (const c of seeAll) for (const k of ["shrink-0", "whitespace-nowrap"]) expect(c).toContain(k);
  });

  const SRC = () => read("src/components/landing/gallery/template-shelf.tsx");
  const sectionBodies = (html: string) => [...html.matchAll(/<section[^>]*data-shelf[^>]*>([\s\S]*?)<\/section>/g)].map((m) => m[1]);
  /** Length of the first balanced <span>…</span> at the start of `s`. */
  const firstSpanLength = (s: string) => {
    let depth = 0;
    for (const m of s.matchAll(/<span[\s>]|<\/span>/g)) {
      depth += m[0] === "</span>" ? -1 : 1;
      if (depth === 0) return m.index + m[0].length;
    }
    return -1;
  };

  // R10: was "shelf covers use the larger sm:w-[12.5rem] width". The reference shows small books (~64×96 relative to the panel);
  // decision §1.3 = 96×144, mobile 88×132.
  // R10 putaran 2: w-[5.5rem] sm:w-24 -> w-24 sm:w-28 so the SiteArt page on the cover stays legible (spec §11.2); ratio stays 2:3.
  it("shelf covers are small upright books w-24 sm:w-28", () => {
    const html = renderShelf();
    const books = [...html.matchAll(/<span[^>]*data-book=""[^>]*>/g)].map((m) => classOf(m[0]));
    expect(books).toHaveLength(8);
    for (const c of books) for (const k of ["w-24", "sm:w-28", "aspect-[2/3]"]) expect(c).toContain(k);
    expect(SRC()).not.toContain("sm:w-[12.5rem]");
  });

  // R10: replaces the R7 tests "book list and plank share a w-fit max-w-full wrapper..." and "plank follows the single book row
  // inside a w-fit...". R7 made the plank as wide as the covers on purpose; the reference spans the plank across the FULL panel
  // even with 1-3 books. min-w-full fills the panel on desktop, w-max lets the plank follow the scrolled row on mobile.
  it("plank spans the full panel width and scrolls with the row on mobile", () => {
    const html = renderShelf();
    const bodies = sectionBodies(html);
    expect(bodies).toHaveLength(4);
    for (const body of bodies) {
      const m = /(<div[^>]*data-shelf-scroll[^>]*>)<div class="([^"]*)"><ul[^>]*>[\s\S]*?<\/ul>(<div[^>]*data-shelf-plank[^>]*>)<\/div><\/div><\/div>$/.exec(body);
      expect(m, "scroll > wrapper > ul + plank").not.toBeNull();
      for (const k of ["overflow-x-auto", "snap-x"]) expect(classOf(m![1])).toContain(k);
      for (const k of ["w-max", "min-w-full"]) expect(m![2].split(/\s+/)).toContain(k);
      expect(classOf(m![3])).toContain("w-full");
    }
    expect(bodies.join("")).not.toContain("w-fit");
  });

  // R10: overflow-x-auto + snap-x moved from the ul to data-shelf-scroll so the plank scrolls with the books; 96px books need not
  // shrink, so lg:min-w-0 lg:shrink is no longer required.
  // R10 putaran 2: renamed from "shelf row never wraps on desktop and book items may shrink at lg" to match what it checks.
  it("shelf row scrolls in data-shelf-scroll, never wraps, and book items stay shrink-0", () => {
    const html = renderShelf();
    const rows = [...html.matchAll(/<section[^>]*data-shelf[^>]*>[\s\S]*?(<div[^>]*data-shelf-scroll[^>]*>)[\s\S]*?(<ul[^>]*>)([\s\S]*?)<\/ul>/g)];
    expect(rows).toHaveLength(4);
    for (const [, scroll, ul, body] of rows) {
      for (const k of ["overflow-x-auto", "snap-x"]) expect(classOf(scroll)).toContain(k);
      const c = classOf(ul);
      expect(c).not.toContain("lg:flex-wrap");
      expect(c).not.toContain("flex-wrap");
      const lis = [...body.matchAll(/<li[\s>][^>]*>/g)].map((m) => classOf(m[0]));
      expect(lis.length).toBeGreaterThan(0);
      for (const li of lis) for (const k of ["shrink-0", "snap-start"]) expect(li).toContain(k);
    }
    expect(SRC()).not.toContain("lg:flex-wrap");
  });

  it("shelves sit inside one rounded panel", () => {
    const html = renderShelf();
    const panels = [...html.matchAll(/<div[^>]*data-shelf-panel[^>]*>/g)];
    expect(panels).toHaveLength(1);
    for (const k of ["rounded-[2rem]", "bg-[#F6FAFD]", "border-[#B3CFE5]", "dark:bg-[#1A3D63]"]) expect(classOf(panels[0][0])).toContain(k);
    const sections = [...html.matchAll(/<section[^>]*data-shelf/g)];
    expect(sections).toHaveLength(4);
    // the panel is the root element, so every section is inside it
    expect(panels[0].index).toBe(0);
    expect(html.endsWith("</div>")).toBe(true);
  });

  it("tabs and search share one pill toolbar", () => {
    const html = renderShelf();
    const bars = [...html.matchAll(/<div[^>]*data-shelf-toolbar[^>]*>/g)];
    expect(bars).toHaveLength(1);
    expect(classOf(bars[0][0])).toContain("rounded-full");
    const inside = html.slice(bars[0].index, html.indexOf('aria-live="polite"'));
    expect(inside).toContain('role="group"');
    const input = /<input[^>]*type="search"[^>]*>/.exec(inside)?.[0];
    expect(input, "search input inside the pill").toBeDefined();
    for (const k of ["rounded-full", "border-border"]) expect(classOf(input!)).not.toContain(k);
  });

  it("one shelf per row", () => {
    expect(SRC()).not.toContain("lg:grid-cols-2");
    const wrap = /<div class="([^"]*)"><section[^>]*data-shelf/.exec(renderShelf());
    expect(wrap).not.toBeNull();
    for (const k of wrap![1].split(/\s+/)) expect(k).not.toMatch(/(^|:)grid-cols-2$/);
  });

  // R10 putaran 2: the cover again carries the category's first SiteArt page (spec 11.2: the shelf shows website templates),
  // so the "no <svg role=img>" ban is lifted; the art is aria-hidden inside the labelled button. Sizes follow w-24 sm:w-28.
  it("covers are small upright books with icon and name on the cover", () => {
    const html = renderShelf();
    const copy = DICTS.id.landing.shelf as ShelfCopy;
    const bodies = [...html.matchAll(/<button[^>]*data-shelf-cover[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1]);
    expect(bodies).toHaveLength(8);
    const titles: string[] = [];
    for (const body of bodies) {
      expect(body.startsWith("<span data-book=")).toBe(true);
      expect(firstSpanLength(body), "title sits inside the book").toBe(body.length);
      const t = /<span[^>]*data-book-title[^>]*>([^<]*)<\/span>/.exec(body)?.[1];
      expect(t).toBeDefined();
      titles.push(t!);
    }
    expect(titles.sort()).toEqual(SITE_CATEGORIES.map((c) => escape(itemOf("id", c.id).name)).sort());
    const books = [...html.matchAll(/<span[^>]*data-book=""[^>]*>/g)].map((m) => classOf(m[0]));
    for (const c of books) for (const k of ["w-24", "sm:w-28", "aspect-[2/3]"]) expect(c).toContain(k);
    expect(html).not.toContain(escape(copy.pagesCount));
  });

  it("each cover shows the category's SiteArt, hidden from assistive tech", () => {
    const covers = [...renderShelf().matchAll(/<button[^>]*data-shelf-cover[^>]*>([\s\S]*?)<\/button>/g)].map((m) => m[1]);
    expect(covers).toHaveLength(8);
    const seen = covers.map((body) => {
      const art = /<span[^>]*aria-hidden="true"[^>]*><svg[^>]*data-category="([^"]+)"/.exec(body);
      expect(art, "SiteArt inside an aria-hidden wrapper").not.toBeNull();
      return art![1];
    });
    expect(seen.sort()).toEqual(ids(SITE_CATEGORIES).sort());
  });

  it("deep covers stay visible on the dark deep panel", () => {
    const books = [...renderShelf().matchAll(/<span data-book=""[^>]*data-cover-tone="deep"[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(books.length).toBeGreaterThan(0);
    for (const b of books) for (const k of ["dark:ring-1", "dark:ring-[#B3CFE5]"]) expect(b).toContain(k);
  });

  it("search input keeps a usable width at 390px", () => {
    const input = /<input[^>]*type="search"[^>]*>/.exec(renderShelf())?.[0];
    const c = classOf(input!);
    expect(c).toContain("min-w-[10rem]");
    expect(c).not.toContain("min-w-0");
    expect(c).toContain("min-h-11");
  });

  const toolbarRow = () => {
    const m = /<div class="([^"]*)">(<div[^>]*data-shelf-toolbar[^>]*>)/.exec(renderShelf());
    expect(m, "row > toolbar").not.toBeNull();
    return { row: m![1].split(/\s+/), pill: classOf(m![2]) };
  };

  it("tab+search pill takes basis-full below sm (sm:basis-auto) so the input stays inside it at 390px", () => {
    const { pill } = toolbarRow();
    for (const k of ["basis-full", "sm:basis-auto", "min-w-0", "rounded-full"]) expect(pill).toContain(k);
  });

  it("input is never wider than the pill and the aria-live count wraps instead of overlapping", () => {
    const html = renderShelf();
    const { row, pill } = toolbarRow();
    expect(row).toContain("flex-wrap");
    const input = classOf(/<input[^>]*type="search"[^>]*>/.exec(html)![0]);
    // a non-shrinking input (min-w-[10rem]) only fits when the pill owns the whole row below sm
    if (!input.includes("min-w-0")) expect(pill).toContain("basis-full");
    const live = classOf(/<p[^>]*aria-live="polite"[^>]*>/.exec(html)![0]);
    for (const k of live) expect(k).not.toMatch(/^(absolute|-?m[lr]?-|-?mt-)/);
  });

  it("cover tones rotate through palette pairs", () => {
    const html = renderShelf();
    const tones = [...html.matchAll(/<span[^>]*data-book=""[^>]*>/g)].map((m) => /data-cover-tone="([^"]*)"/.exec(m[0])?.[1]);
    expect(tones).toHaveLength(8);
    for (const t of tones) expect(["ink", "deep", "mist", "snow"]).toContain(t);
    expect(new Set(tones).size).toBeGreaterThanOrEqual(3);
    for (const s of ["hsl(", "#F3EBD8"]) expect(SRC()).not.toContain(s);
  });

  it("plank is painted with opaque palette colours", () => {
    const planks = [...renderShelf().matchAll(/<div[^>]*data-shelf-plank[^>]*>/g)].map((m) => classOf(m[0]));
    expect(planks).toHaveLength(4);
    for (const c of planks) {
      for (const k of ["bg-[#B3CFE5]", "dark:bg-[#F6FAFD]"]) expect(c).toContain(k);
      for (const k of c) if (/(^|:)bg-/.test(k)) expect(k, "opaque plank").not.toContain("/");
    }
  });

  it("grid and aria-live count share visibleCategories so the number matches the shelf filter", () => {
    const src = read("src/components/landing/gallery/template-shelf.tsx");
    expect(src).toMatch(/const visible = visibleCategories\(results, view, shelf\)/);
    expect(src).toContain("{ n: visible.length }");
    expect(src).not.toContain("{ n: results.length }");
    expect(src).toContain("visible.map((c) => book(c, true))");
  });

  it("landing.shelf keys match in id and en", () => {
    const id = DICTS.id.landing.shelf as Record<string, string> | undefined;
    const en = DICTS.en.landing.shelf as Record<string, string> | undefined;
    expect(id).toBeDefined();
    expect(keys(id).sort()).toEqual(keys(en).sort());
    for (const s of [id!, en!]) {
      expect(s.count).toContain("{n}");
      expect(s.empty).toContain("{q}");
    }
    const text = [...strings(id), ...strings(en)].join("\n").toLowerCase();
    for (const p of FORBIDDEN) expect(text).not.toContain(p);
  });
});
