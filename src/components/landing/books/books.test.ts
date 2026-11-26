import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { BOOK_INITIAL, EXCLUDED_CANDIDATES, RESULT_BOOKS, bookReducer, booksOnShelf, type BookState } from "./book-list";
import { BookShelf, BookSpread } from "./book-shelf";

type Json = Record<string, unknown>;
type Copy = Parameters<typeof BookShelf>[0]["copy"];
type Item = { title: string; contents: string; format: string; when: string };
type Dict = { landing: Json; stages: Record<string, { name: string }> };

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const DICTS = {
  id: JSON.parse(read("src/dictionaries/id.json")) as Dict,
  en: JSON.parse(read("src/dictionaries/en.json")) as Dict,
};
const LANGS = ["id", "en"] as const;
const FORBIDDEN = ["certified", "compliant", "certification", "bersertifikat", "sertifikasi resmi", "patuh", "aman 100%", "100% aman", "100% secure", "guaranteed", "terjamin", "dijamin"];
const STAGES = ["analysis", "design", "development", "testing", "handover"] as const;

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const copyOf = (lang: "id" | "en") => (DICTS[lang].landing.books ?? {}) as unknown as Copy;
const itemsOf = (lang: "id" | "en") => ((DICTS[lang].landing.books as Json | undefined)?.items ?? {}) as Record<string, Item>;
const stageNames = (lang: "id" | "en") =>
  Object.fromEntries(STAGES.map((c) => [c, DICTS[lang].stages[c].name])) as Record<(typeof STAGES)[number], string>;

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Json).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.values(value as Json).flatMap(strings);
}

const EXPECTED_STAGE: Record<string, string> = {
  sourceZip: "development",
  github: "development",
  manual: "handover",
  iso: "handover",
  traceability: "analysis",
  badge: "handover",
  scanReport: "testing",
  mockup: "design",
  threatModel: "design",
  runPreview: "development",
  database: "handover",
  snapshots: "development",
};

describe("result books data", () => {
  it("RESULT_BOOKS holds the six take-home and six studio results", () => {
    expect(RESULT_BOOKS).toHaveLength(12);
    expect(booksOnShelf("home").map((b) => b.id)).toEqual(["sourceZip", "github", "manual", "iso", "traceability", "badge"]);
    expect(booksOnShelf("studio").map((b) => b.id)).toEqual(["scanReport", "mockup", "threatModel", "runPreview", "database", "snapshots"]);
    for (const b of RESULT_BOOKS) expect({ id: b.id, stage: b.stage }).toEqual({ id: b.id, stage: EXPECTED_STAGE[b.id] });
    expect(new Set(RESULT_BOOKS.map((b) => b.id)).size).toBe(12);
  });

  it("every book source file exists and still contains its proof", () => {
    for (const b of RESULT_BOOKS) {
      expect(b.sources.length, b.id).toBeGreaterThan(0);
      for (const s of b.sources) {
        expect(existsSync(join(ROOT, s.file)), `${b.id}: ${s.file}`).toBe(true);
        expect(read(s.file).includes(s.proof), `${b.id}: ${s.file} ⊃ ${s.proof}`).toBe(true);
      }
    }
  });

  it("the artifacts export stays excluded and its source still proves why", () => {
    expect(EXCLUDED_CANDIDATES.map((c) => c.id)).toEqual(["artifactsZip"]);
    const [c] = EXCLUDED_CANDIDATES;
    expect(existsSync(join(ROOT, c.file))).toBe(true);
    expect(c.proof).toBe("codeArtifacts");
    expect(read(c.file)).toContain("codeArtifacts");
    expect(RESULT_BOOKS.map((b) => b.id as string)).not.toContain("artifactsZip");
    expect(RESULT_BOOKS.flatMap((b) => b.sources.map((s) => s.file))).not.toContain(c.file);
  });

  it("bookReducer opens, turns and closes", () => {
    const open = bookReducer(BOOK_INITIAL, { type: "open", id: "manual" });
    expect(open).toEqual({ open: "manual", turned: false });
    expect(bookReducer(open, { type: "open", id: "manual" })).toBe(open);
    const turned = bookReducer(open, { type: "turn" });
    expect(turned).toEqual({ open: "manual", turned: true });
    expect(bookReducer(BOOK_INITIAL, { type: "turn" })).toBe(BOOK_INITIAL);
    expect(bookReducer(turned, { type: "turn" })).toBe(turned);
    expect(bookReducer(turned, { type: "close" })).toBe(BOOK_INITIAL);
    const other: BookState = bookReducer(turned, { type: "open", id: "badge" });
    expect(other).toEqual({ open: "badge", turned: false });
  });
});

describe("book shelf", () => {
  it("BookShelf renders two shelves of labelled books with spine and ribbon", () => {
    const copy = copyOf("id");
    const items = itemsOf("id");
    const html = renderToStaticMarkup(createElement(BookShelf, { copy, stageNames: stageNames("id") }));
    const home = html.indexOf('data-book-shelf="home"');
    const studio = html.indexOf('data-book-shelf="studio"');
    expect(home).toBeGreaterThan(-1);
    expect(studio).toBeGreaterThan(home);
    expect(html).toContain(escape(copy.shelfHome));
    expect(html).toContain(escape(copy.shelfStudio));
    const tags = [...html.matchAll(/<button[^>]*data-book="[^"]+"[^>]*>/g)].map((m) => m[0]);
    expect(tags).toHaveLength(12);
    expect(html.match(/data-book="/g)).toHaveLength(12);
    tags.forEach((tag, i) => {
      const b = RESULT_BOOKS[i];
      expect(tag).toContain('type="button"');
      expect(tag).toContain(`data-book="${b.id}"`);
      expect(tag).toContain(`aria-label="${escape(fmt(copy.open, { title: items[b.id].title }))}"`);
    });
    expect(html.match(/data-shelf="home"/g)).toHaveLength(6);
    expect(html.match(/data-shelf="studio"/g)).toHaveLength(6);
    expect(html.match(/data-book-spine/g)).toHaveLength(12);
    expect(html.match(/data-book-ribbon/g)).toHaveLength(12);
    expect(html.split(escape(copy.studioBadge)).length - 1).toBeGreaterThanOrEqual(6);
    for (const s of ["alsoInStudio", "backdrop", "blur", "<image"]) expect(html, s).not.toContain(s);
  });

  it("BookSpread shows contents, format, when and the source stage", () => {
    for (const lang of LANGS) {
      const copy = copyOf(lang);
      const items = itemsOf(lang);
      for (const book of RESULT_BOOKS) {
        const stageName = DICTS[lang].stages[book.stage].name;
        const html = renderToStaticMarkup(createElement(BookSpread, { book, copy, stageName }));
        const item = items[book.id];
        for (const k of ["title", "contents", "format", "when"] as const) expect(html, `${lang}/${book.id}/${k}`).toContain(escape(item[k]));
        expect(html).toContain(escape(stageName));
        if (book.shelf === "studio") expect(html, `${lang}/${book.id}`).toContain(escape(copy.studioBadge));
        else expect(html, `${lang}/${book.id}`).not.toContain(escape(copy.studioBadge));
      }
    }
  });

  it("book dialog uses Radix, returns focus, blocks Lenis and swaps rotation for a crossfade", () => {
    const src = read("src/components/landing/books/book-shelf.tsx");
    for (const s of ["@radix-ui/react-dialog", "onCloseAutoFocus", "data-lenis-prevent", "rotateY", "useReducedMotion", "bookReducer", "booksOnShelf", "skipAnimations={false}", "motion-reduce:"])
      expect(src, s).toContain(s);
    for (const s of ["backdrop", "<motion.", "useAnimate", "setInterval"]) expect(src, s).not.toContain(s);
  });

  it("landing.books covers every verified book in both languages without forbidden words", () => {
    const id = DICTS.id.landing.books as Json | undefined;
    const en = DICTS.en.landing.books as Json | undefined;
    expect(id).toBeDefined();
    expect(keys(id).sort()).toEqual(keys(en).sort());
    for (const lang of LANGS) {
      const books = DICTS[lang].landing.books as Json;
      expect(books.alsoInStudio).toBeUndefined();
      const items = itemsOf(lang);
      expect(Object.keys(items).sort()).toEqual(RESULT_BOOKS.map((b) => b.id).sort());
      for (const [bid, item] of Object.entries(items))
        for (const k of ["title", "contents", "format", "when"] as const) {
          expect(typeof item[k], `${lang}/${bid}/${k}`).toBe("string");
          expect(item[k].trim().length, `${lang}/${bid}/${k}`).toBeGreaterThan(0);
        }
      expect(books.open).toContain("{title}");
      for (const bid of ["scanReport", "runPreview", "database"]) expect(items[bid].when, `${lang}/${bid}`).toContain("Docker");
      expect(items.database.when).toContain("final");
      const hits = strings(books)
        .map((s) => s.toLowerCase())
        .flatMap((s) => FORBIDDEN.filter((p) => s.includes(p)).map((p) => `${lang} ${p}: ${s}`));
      expect(hits).toEqual([]);
    }
    expect(itemsOf("id").iso.contents).toContain("Bukan sertifikat");
    expect(itemsOf("en").iso.contents).toContain("Not a certificate");
  });
});
