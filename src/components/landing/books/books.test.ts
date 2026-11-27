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

/** The marquee paints each shelf three times; assertions about "the books" only look at the live rail. */
const live = (html: string) =>
  html
    .split(/<div[^>]*data-book-track=/)
    .slice(1)
    .filter((part) => part.startsWith('"live"'))
    .join("");
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
    const page = renderToStaticMarkup(createElement(BookShelf, { copy, stageNames: stageNames("id") }));
    const html = live(page);
    const home = page.indexOf('data-book-shelf="home"');
    const studio = page.indexOf('data-book-shelf="studio"');
    expect(home).toBeGreaterThan(-1);
    expect(studio).toBeGreaterThan(home);
    expect(page).toContain(escape(copy.shelfHome));
    expect(page).toContain(escape(copy.shelfStudio));
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
    for (const s of ["alsoInStudio", "backdrop", "blur", "<image"]) expect(page, s).not.toContain(s);
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

  it("book dialog uses Radix, returns focus, scrolls natively and always swings the cover", () => {
    const src = read("src/components/landing/books/book-shelf.tsx");
    expect(src).not.toContain("data-lenis-prevent");
    expect(src).toContain("overflow-y-auto");
    for (const s of ["@radix-ui/react-dialog", "onCloseAutoFocus", "rotateY", "useReducedMotion", "bookReducer", "booksOnShelf", "skipAnimations={false}", "motion-reduce:"])
      expect(src, s).toContain(s);
    for (const s of ["backdrop", "<motion.", "useAnimate", "setInterval"]) expect(src, s).not.toContain(s);
    // User-triggered motion: the cover swing plays for everyone, reduce motion only shortens it.
    expect(src).toContain("{!state.turned && (");
    expect(src).toContain("reduced ? 0.4 : 0.95");
  });

  it("shelf boards and the book dialog paint the gradient card surface as a background, not a colour", () => {
    const src = read("src/components/landing/books/book-shelf.tsx");
    for (const s of ["bg-[var(--fuse-card-bg)]", "var(--fuse-card-bg)_", 'stroke="var(--fuse-card-bg)"']) expect(src, s).not.toContain(s);
    expect(src).toContain("[background:var(--fuse-card-bg)]");
  });

  it("each shelf sits in a warm paper case, and the books stand inside it", () => {
    const html = renderToStaticMarkup(createElement(BookShelf, { copy: copyOf("id"), stageNames: stageNames("id") }));
    expect(html).not.toContain("fuse-card-bg");
    const cases = [...html.matchAll(/<div[^>]*data-book-case=""[^>]*>/g)].map((m) => m[0]);
    expect(cases).toHaveLength(2);
    for (const c of cases) {
      expect(c).toContain("bg-[#FAF3E9]");
      expect(c).toContain("rounded-[1.5rem]");
      expect(c).toContain("--foreground:#2A2118");
    }
    // Each rail lives inside a case, and the case's heading comes first.
    for (const shelf of ["home", "studio"]) {
      const at = html.indexOf(`data-book-shelf="${shelf}"`);
      expect(html.indexOf("data-book-case", at)).toBeGreaterThan(at);
      expect(html.indexOf("data-book-track", at)).toBeGreaterThan(html.indexOf("data-book-case", at));
    }
  });

  it("each shelf paints three identical rails; clones are untabbable but still open their book", () => {
    for (const lang of LANGS) {
      const html = renderToStaticMarkup(createElement(BookShelf, { copy: copyOf(lang), stageNames: stageNames(lang) }));
      const rails = html.split(/<div[^>]*data-book-track=/).slice(1);
      expect(rails).toHaveLength(6);
      for (let shelf = 0; shelf < 2; shelf++) {
        const group = rails.slice(shelf * 3, shelf * 3 + 3);
        expect(group.map((r) => r.match(/^"([^"]+)"/)?.[1])).toEqual(["live", "clone", "clone"]);
        const ids = group.map((r) => [...r.matchAll(/data-book="([^"]+)"/g)].map((m) => m[1]));
        expect(ids[1]).toEqual(ids[0]);
        expect(ids[2]).toEqual(ids[0]);
        // Two of the three visible books are clones: inert would swallow the click, so they stay clickable and only leave the tab order.
        for (const clone of group.slice(1)) {
          expect(clone).toContain('aria-hidden="true"');
          expect(clone).not.toContain("inert");
          const buttons = [...clone.matchAll(/<button\b[^>]*>/g)].map((m) => m[0]);
          expect(buttons).toHaveLength(ids[0].length);
          for (const b of buttons) expect(b).toContain('tabindex="-1"');
        }
        expect(group[0]).not.toContain("inert");
      }
    }
  });

  it("the shelf loops for everyone: the row always animates and the dialog never skips the swing", () => {
    const src = read("src/components/landing/books/book-shelf.tsx");
    expect(src).toContain("animate-[book-scroll_30s_linear_infinite]");
    expect(src).not.toContain("motion-reduce:animate-none");
    // motion/react drops transform animations when the OS asks for less motion; the swing is user-triggered, so opt out.
    expect(src).toContain('reducedMotion="never"');
  });

  it("each book shows paper page thickness on the right and at the bottom", () => {
    const html = live(renderToStaticMarkup(createElement(BookShelf, { copy: copyOf("id"), stageNames: stageNames("id") })));
    for (const side of ["right", "bottom"]) {
      const tags = [...html.matchAll(new RegExp(`<div[^>]*data-book-pages="${side}"[^>]*>`, "g"))].map((m) => m[0]);
      expect(tags, side).toHaveLength(12);
      for (const t of tags) expect(t.match(/style="([^"]*)"/)?.[1], side).toContain("#FFFCF6");
    }
    const src = read("src/components/landing/books/book-shelf.tsx");
    // Warm paper and bookmark accents, from the bookstore reference.
    for (const s of ["#FAF3E9", "#FFFCF6", "#E4D6C4", "RIBBONS"]) expect(src, s).toContain(s);
  });

  it("a caption under each book gives its title and its source stage", () => {
    for (const lang of LANGS) {
      const names = stageNames(lang);
      const items = itemsOf(lang);
      const html = live(renderToStaticMarkup(createElement(BookShelf, { copy: copyOf(lang), stageNames: names })));
      const caps = [
        ...html.matchAll(/<span[^>]*data-book-caption[^>]*><span class="([^"]*)">([^<]*)<\/span><span class="([^"]*)">([^<]*)<\/span><\/span>/g),
      ];
      expect(caps, lang).toHaveLength(12);
      caps.forEach((m, i) => {
        const b = RESULT_BOOKS[i];
        expect(m[1].split(" "), `${lang}/${b.id}`).toContain("font-semibold");
        expect(m[2], `${lang}/${b.id}`).toBe(escape(items[b.id].title));
        expect(m[3].split(" "), `${lang}/${b.id}`).toContain("text-muted-foreground");
        expect(m[4], `${lang}/${b.id}`).toBe(escape(names[b.stage]));
      });
    }
  });

  const TONE_BG: Record<string, string> = { ink: "#0A1931", deep: "#1A3D63", mist: "#B3CFE5", snow: "#F6FAFD" };
  const TONE_FG: Record<string, string> = { ink: "#F6FAFD", deep: "#F6FAFD", mist: "#0A1931", snow: "#0A1931" };
  const bookChunks = (html: string) => html.split(/(?=<button[^>]*data-book=")/).slice(1).map((c) => c.slice(0, c.indexOf("</button>")));

  it("covers rotate through palette tones with contrasting text and ribbon", () => {
    const html = live(renderToStaticMarkup(createElement(BookShelf, { copy: copyOf("id"), stageNames: stageNames("id") })));
    const chunks = bookChunks(html);
    expect(chunks).toHaveLength(12);
    const tones = chunks.map((c) => c.match(/data-cover-tone="([^"]*)"/)?.[1] ?? "");
    for (const t of tones) expect(Object.keys(TONE_BG)).toContain(t);
    expect(new Set(tones.slice(0, 6)).size).toBeGreaterThanOrEqual(3);
    expect(new Set(tones.slice(6)).size).toBeGreaterThanOrEqual(3);
    chunks.forEach((c, i) => {
      const t = tones[i];
      expect(c.match(/<rect[^>]*fill="([^"]*)"/)?.[1], `${i} bg`).toBe(TONE_BG[t]);
      expect(c.match(/<text[^>]*fill="([^"]*)"/)?.[1], `${i} fg`).toBe(TONE_FG[t]);
      const ribbon = c.match(/<div[^>]*data-book-ribbon[^>]*style="([^"]*)"/)?.[1] ?? c.match(/<div[^>]*style="([^"]*)"[^>]*data-book-ribbon/)?.[1];
      expect(ribbon, `${i} ribbon`).toBeDefined();
      expect(ribbon!.toLowerCase(), `${i} ribbon`).not.toContain(TONE_BG[t].toLowerCase());
    });
  });

  it("cover art draws with the tone text colour", () => {
    const html = live(renderToStaticMarkup(createElement(BookShelf, { copy: copyOf("id"), stageNames: stageNames("id") })));
    bookChunks(html).forEach((c, i) => {
      const t = c.match(/data-cover-tone="([^"]*)"/)?.[1] ?? "";
      expect(c.match(/<g[^>]*stroke="([^"]*)"/)?.[1], `${i}`).toBe(TONE_FG[t]);
    });
  });

  it("the open spread is snow with a mist crease", () => {
    const html = renderToStaticMarkup(createElement(BookSpread, { book: RESULT_BOOKS[0], copy: copyOf("en"), stageName: "x" }));
    const root = html.match(/^<div class="([^"]*)"/)?.[1] ?? "";
    expect(root.includes("bg-[#F6FAFD]") || root.includes("bg-[var(--fuse-snow)]")).toBe(true);
    expect(html).toContain("md:border-[#B3CFE5]");
    expect(html).not.toContain("#F6F1E6");
  });

  const pagesTags = (side: string) => {
    const html = live(renderToStaticMarkup(createElement(BookShelf, { copy: copyOf("id"), stageNames: stageNames("id") })));
    return [...html.matchAll(new RegExp(`<div[^>]*data-book-pages="${side}"[^>]*>`, "g"))].map((m) => m[0]);
  };

  it("the bottom page strip lies flat under the cover so it stays visible", () => {
    const tags = pagesTags("bottom");
    expect(tags).toHaveLength(12);
    for (const t of tags) {
      const cls = (t.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
      expect(t).not.toContain("rotateX");
      expect(cls).toContain("top-full");
      const h = cls.map((c) => c.match(/^h-\[(\d+)px\]$/)?.[1]).find(Boolean);
      expect(Number(h)).toBeGreaterThanOrEqual(4);
    }
  });

  it("the right page strip stays visible under reduced motion", () => {
    const tags = pagesTags("right");
    expect(tags).toHaveLength(12);
    for (const t of tags) {
      const cls = (t.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
      expect(cls).toContain("motion-reduce:[transform:none]");
      expect(cls.some((c) => /^motion-reduce:w-\[\d+px\]$/.test(c))).toBe(true);
    }
  });

  it("snow covers keep a soft mist edge", () => {
    const html = live(renderToStaticMarkup(createElement(BookShelf, { copy: copyOf("id"), stageNames: stageNames("id") })));
    const snow = bookChunks(html).filter((c) => c.includes('data-cover-tone="snow"'));
    expect(snow.length).toBeGreaterThan(0);
    for (const c of snow) expect(c.match(/<rect[^>]*fill="none"[^>]*stroke="([^"]*)"/)?.[1]).toBe("#B3CFE5");
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
