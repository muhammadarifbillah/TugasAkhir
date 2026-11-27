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

  it("shelf source lays shelves side by side and paints planks opaquely", () => {
    const src = read("src/components/landing/gallery/template-shelf.tsx");
    for (const s of ["lg:grid-cols-2", "aspect-[2/3]", "filterByShelf", "data-shelf-plank", "bg-card", "motion-reduce:"]) expect(src).toContain(s);
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

  it("shelf covers use the larger sm:w-[12.5rem] width", () => {
    const html = renderShelf();
    const books = [...html.matchAll(/<span[^>]*data-book=""[^>]*>/g)].map((m) => classOf(m[0]));
    expect(books).toHaveLength(8);
    for (const c of books) {
      expect(c).toContain("w-[8.5rem]");
      expect(c).toContain("sm:w-[12.5rem]");
      expect(c).toContain("aspect-[2/3]");
    }
    expect(read("src/components/landing/gallery/template-shelf.tsx")).not.toContain("sm:w-[8.5rem]");
  });

  it("book list and plank share a w-fit max-w-full wrapper so the plank is as wide as its covers", () => {
    const html = renderShelf();
    const sections = [...html.matchAll(/<section[^>]*data-shelf[^>]*>([\s\S]*?)<\/section>/g)].map((m) => m[1]);
    expect(sections).toHaveLength(4);
    for (const body of sections) {
      const m = /<div class="([^"]*)"><ul[^>]*>[\s\S]*?<\/ul>(<div[^>]*data-shelf-plank[^>]*>)<\/div><\/div>$/.exec(body);
      expect(m, "wrapper around ul + plank").not.toBeNull();
      const wrap = m![1].split(/\s+/);
      for (const k of ["w-fit", "max-w-full"]) expect(wrap).toContain(k);
      expect(classOf(m![2])).toContain("w-full");
    }
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
