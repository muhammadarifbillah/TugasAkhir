import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES, type SiteCategory } from "@/lib/site-categories";
import { STAGE_DEFINITIONS } from "@/lib/stages";
import { FuseLockup } from "@/components/brand/fuse-lockup";
import { ViewerBody } from "./category-viewer";

type Json = Record<string, unknown>;
type Props = Parameters<typeof ViewerBody>[0];
type Item = { name: string; desc: string; pages: Record<string, string>; features: Record<string, string>; checks: Record<string, string> };

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const DICTS = {
  id: JSON.parse(read("src/dictionaries/id.json")) as { landing: Json; categories: Json; app: { name: string } },
  en: JSON.parse(read("src/dictionaries/en.json")) as { landing: Json; categories: Json; app: { name: string } },
};
const LANGS = ["id", "en"] as const;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const noop = () => {};

const copyOf = (lang: "id" | "en") => (DICTS[lang].landing.gallery ?? {}) as Props["copy"];
const labelsOf = (lang: "id" | "en") => DICTS[lang].categories as unknown as Props["labels"];
const itemOf = (lang: "id" | "en", c: SiteCategory) => (DICTS[lang].categories.items as Record<string, Item>)[c.id];

const render = (lang: "id" | "en", c: SiteCategory, page: 0 | 1 | 2 = 0) =>
  renderToStaticMarkup(
    createElement(ViewerBody, {
      category: c,
      page,
      dir: 1,
      lang,
      appName: DICTS[lang].app.name,
      labels: labelsOf(lang),
      copy: copyOf(lang),
      onPage: noop,
      onNext: noop,
      onPrev: noop,
    }),
  );

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Json).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.values(value as Json).flatMap(strings);
}

const NEW_KEYS = [
  "barTitle",
  "previewHint",
  "byline",
  "intro",
  "specChecks",
  "checksCount",
  "specStandards",
  "standardsValue",
  "specScanner",
  "scannerValue",
  "reviewedBy",
  "seeAllTemplates",
] as const;

/** Opening tag of the first element carrying `attr`. */
const tagOf = (html: string, attr: string) => {
  const at = html.indexOf(attr);
  expect(at, attr).toBeGreaterThanOrEqual(0);
  const start = html.lastIndexOf("<", at);
  return html.slice(start, html.indexOf(">", at) + 1);
};

/** The element carrying `attr`, up to its matching closing tag. */
const section = (html: string, attr: string) => {
  const open = tagOf(html, attr);
  const start = html.indexOf(open);
  const name = /^<([a-z0-9]+)/.exec(open)![1];
  const re = new RegExp(`<${name}[\\s>]|</${name}>`, "g");
  re.lastIndex = start + open.length;
  let depth = 1;
  for (let m = re.exec(html); m; m = re.exec(html)) {
    depth += m[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return html.slice(start);
};

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

describe("category viewer", () => {
  it("ViewerBody shows the category, its three pages and the current page", () => {
    for (const lang of LANGS) {
      const copy = copyOf(lang);
      const labels = labelsOf(lang);
      for (const c of SITE_CATEGORIES)
        for (const page of [0, 1] as const) {
          const html = render(lang, c, page);
          const item = itemOf(lang, c);
          expect(html).toContain(escape(item.name));
          expect(html).toContain(escape(item.desc));
          expect(html.match(/data-viewer-thumb/g)?.length, `${lang}/${c.id}`).toBe(3);
          expect(html.match(/aria-current="true"/g)?.length).toBe(1);
          const art = fmt(labels.artLabel, { page: item.pages[c.pages[page].id], category: item.name });
          expect(html).toContain(`aria-label="${escape(art)}"`);
          expect(html).toContain(escape(fmt(copy.pageOf, { n: page + 1, total: 3 })));
          expect(html).toContain(escape(labels.galleryLabel));
        }
    }
  });

  it("ViewerBody lists three checks whose NIST and ISO codes exist in stages.ts", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        const item = itemOf(lang, c);
        expect(html.match(/data-viewer-check(?!s)/g)?.length, `${lang}/${c.id}`).toBe(3);
        for (const check of c.checks) {
          expect(html).toContain(escape(item.checks[check.id]));
          expect(html).toContain(check.nist);
          expect(html).toContain(check.iso);
          const stage = STAGE_DEFINITIONS.find((s) => s.code === check.stage);
          expect(stage?.nistTasks, `${c.id}/${check.id}`).toContain(check.nist);
          expect(stage?.isoControls, `${c.id}/${check.id}`).toContain(check.iso);
        }
        const lower = html.toLowerCase();
        expect(html).toContain("Semgrep");
        expect(html).toContain("Trivy");
        expect(lower).toContain(lang === "id" ? "dipetakan ke" : "mapped to");
      }
  });

  it("ViewerBody has the spec table and the template CTA", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        const item = itemOf(lang, c);
        expect(html).toContain("<table");
        for (const p of c.pages) expect(html).toContain(escape(item.pages[p.id]));
        for (const f of c.features) expect(html).toContain(escape(item.features[f]));
        for (const s of c.stack) expect(html).toContain(escape(s));
        expect(html).toContain(`href="/${lang}/projects/new"`);
        expect(html).toContain(escape(copyOf(lang).start));
      }
  });

  it("gallery copy and rendered viewer avoid certification claims", () => {
    const texts = LANGS.flatMap((lang) => [
      ...strings(DICTS[lang].landing.gallery),
      ...strings(DICTS[lang].categories),
      ...SITE_CATEGORIES.flatMap((c) => [render(lang, c, 0), render(lang, c, 1)]),
    ]);
    expect(strings(DICTS.id.landing.gallery).length).toBeGreaterThan(0);
    const hits = texts
      .map((s) => s.toLowerCase())
      .flatMap((s) => FORBIDDEN.filter((p) => s.includes(p)).map((p) => `${p}: ${s.slice(0, 80)}`));
    expect(hits).toEqual([]);
  });

  it("CategoryViewer uses the Radix dialog, returns focus, handles arrows and scrolls natively", () => {
    const src = read("src/components/landing/gallery/category-viewer.tsx");
    expect(src).not.toContain("data-lenis-prevent");
    expect(src).toContain("overflow-y-auto");
    for (const s of ["@radix-ui/react-dialog", "onCloseAutoFocus", "onOpenChange", "keyToAction", "AnimatePresence"])
      expect(src).toContain(s);
    for (const s of ["backdrop", "<motion.", "setInterval"]) expect(src).not.toContain(s);
  });

  it("the viewer surface is opaque and the overlay is dark", () => {
    const src = read("src/components/landing/gallery/category-viewer.tsx");
    const classOf = (tag: string) => {
      // Content's props hold arrow functions ("=>"), so take the first className after the tag instead of stopping at ">".
      const at = src.indexOf(`<${tag}`);
      expect(at, tag).toBeGreaterThanOrEqual(0);
      const m = /className="([^"]*)"/.exec(src.slice(at));
      expect(m, tag).not.toBeNull();
      return m![1];
    };
    const content = classOf("DialogPrimitive.Content");
    expect(content).toContain("bg-[#F6FAFD]");
    expect(content).toContain("text-[#0A1931]");
    for (const s of ["bg-[var(", "bg-transparent", "opacity-"]) expect(content).not.toContain(s);
    const bgTokens = content.split(/\s+/).filter((t) => /(^|:)bg-/.test(t));
    for (const t of bgTokens) expect(t, t).not.toMatch(/\/(0?\.\d+|\d{1,2})\b/);
    expect(classOf("DialogPrimitive.Overlay")).toContain("bg-[#0A1931]/85");
  });

  it("no component paints a gradient token as a background colour", () => {
    const walk = (dir: string): string[] =>
      readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith(".tsx") ? [`${dir}/${e.name}`] : [],
      );
    const files = walk("src");
    expect(files.length).toBeGreaterThan(0);
    const hits = files.filter((f) => {
      const s = read(f);
      return s.includes("bg-[var(--fuse-card-bg)]") || s.includes("bg-[var(--fuse-bg)]");
    });
    expect(hits).toEqual([]);
  });

  it("landing.gallery keys match in id and en and keep placeholders", () => {
    const id = DICTS.id.landing.gallery as Record<string, string> | undefined;
    const en = DICTS.en.landing.gallery as Record<string, string> | undefined;
    expect(id).toBeDefined();
    expect(keys(id).sort()).toEqual(keys(en).sort());
    for (const g of [id!, en!]) {
      expect(g.openPanel).toContain("{category}");
      expect(g.pageOf).toContain("{n}");
      expect(g.pageOf).toContain("{total}");
      expect(g.checksTitle).toContain("{name}");
      expect(g.checkCodes).toContain("{nist}");
      expect(g.checkCodes).toContain("{iso}");
    }
    for (const g of [id!, en!]) {
      for (const k of NEW_KEYS) expect(g[k], k).toBeTruthy();
      expect(g.byline).toContain("{name}");
      expect(g.byline).toContain("{n}");
      expect(g.checksCount).toContain("{n}");
      expect(g.reviewedBy).toContain("{name}");
    }
  });

  it("ViewerBody has a top bar with the FUSE lockup, the gallery title and a template CTA", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        expect(html.match(/data-viewer-bar/g)?.length, `${lang}/${c.id}`).toBe(1);
        const bar = section(html, "data-viewer-bar");
        expect(bar).toContain(`<svg role="img" aria-label="${escape(DICTS[lang].app.name)}"`);
        expect(bar).toContain(escape(copyOf(lang).barTitle));
        expect(bar).toMatch(new RegExp(`<a[^>]*data-viewer-cta="bar"[^>]*href="/${lang}/projects/new"|<a[^>]*href="/${lang}/projects/new"[^>]*data-viewer-cta="bar"`));
        expect(html.split(`href="/${lang}/projects/new"`).length - 1).toBe(2);
      }
  });

  it("preview sits on a mist circle with a small caps hint", () => {
    for (const lang of LANGS) {
      const html = render(lang, SITE_CATEGORIES[0]);
      const circle = tagOf(html, "data-viewer-circle");
      expect(circle).toContain("rounded-full");
      expect(circle).toContain("bg-[#B3CFE5]");
      const hint = tagOf(html, "data-viewer-preview-hint");
      expect(hint).toContain("uppercase");
      expect(section(html, "data-viewer-preview-hint")).toContain(escape(copyOf(lang).previewHint));
      expect(html).toContain(`aria-label="${escape(copyOf(lang).nextPage)}"`);
    }
  });

  it("title block shows byline, italic lede and intro paragraph", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        const copy = copyOf(lang);
        expect(section(html, "data-viewer-byline")).toContain(escape(fmt(copy.byline, { name: DICTS[lang].app.name, n: 3 })));
        const desc = escape(itemOf(lang, c).desc);
        const before = html.slice(0, html.indexOf(desc));
        const open = before.slice(before.lastIndexOf("<"));
        expect(open, `${lang}/${c.id}`).toMatch(/class="[^"]*\bitalic\b/);
        expect(html).toContain(escape(copy.intro));
      }
  });

  it("spec table has three rows of two label/value pairs", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        const copy = copyOf(lang);
        const at = html.indexOf("<table");
        expect(at).toBeGreaterThanOrEqual(0);
        const table = html.slice(at, html.indexOf("</table>", at));
        expect(table.slice(0, table.indexOf(">"))).toContain("data-viewer-specs");
        const rows = table.split("<tr").slice(1);
        expect(rows).toHaveLength(3);
        for (const r of rows) {
          expect(r.split('<th scope="row"').length - 1).toBe(2);
          expect(r.split("<td").length - 1).toBe(2);
        }
        for (const k of ["specPages", "specFeatures", "specStack", "specChecks", "specStandards", "specScanner"] as const)
          expect(table, k).toContain(escape(copy[k]));
        const item = itemOf(lang, c);
        for (const p of c.pages) expect(table).toContain(escape(item.pages[p.id]));
        for (const f of c.features) expect(table).toContain(escape(item.features[f]));
        for (const s of c.stack) expect(table).toContain(escape(s));
        expect(table).toContain(c.pages.map((p) => escape(item.pages[p.id])).join(" · "));
        expect(table).toContain(c.features.map((f) => escape(item.features[f])).join(" · "));
        expect(table).toContain(c.stack.map((s) => escape(s)).join(" · "));
        expect(table).toContain(escape(fmt(copy.checksCount, { n: 3 })));
        expect(table).toContain(escape(copy.standardsValue));
        expect(table).toContain(escape(copy.scannerValue));
      }
  });

  it("reviewed-by block replaces a testimonial: FUSE mark avatar, name line, scanner line, three mapped checks", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        const copy = copyOf(lang);
        const at = html.indexOf("data-viewer-review");
        expect(at).toBeGreaterThanOrEqual(0);
        const review = section(html, "data-viewer-review");
        expect(section(review, "data-viewer-avatar")).toContain("<svg");
        expect(review).toContain(escape(fmt(copy.reviewedBy, { name: DICTS[lang].app.name })));
        expect(review).toContain(escape(copy.scannerValue));
        expect(html.slice(at).match(/data-viewer-check(?!s)/g)?.length).toBe(3);
      }
  });

  it("thumbnail rail marks the active page with mist and a 3px steel left bar", () => {
    for (const page of [0, 2] as const) {
      const html = render("id", SITE_CATEGORIES[0], page);
      const thumbs = html.match(/<button[^>]*data-viewer-thumb[^>]*>/g) ?? [];
      expect(thumbs).toHaveLength(3);
      for (const t of thumbs)
        for (const k of ["aria-[current=true]:bg-[#B3CFE5]", "aria-[current=true]:border-l-[3px]", "aria-[current=true]:border-l-[#4A7FA7]"])
          expect(t, k).toContain(k);
      expect(html.match(/aria-current="true"/g)?.length).toBe(1);
    }
  });

  it("vertical see-all label is a button that leads to the shelf", () => {
    for (const lang of LANGS) {
      const html = render(lang, SITE_CATEGORIES[0]);
      const tag = tagOf(html, "data-viewer-see-all");
      expect(tag.startsWith('<button type="button"')).toBe(true);
      expect(tag).toContain("lg:[writing-mode:vertical-rl]");
      expect(section(html, "data-viewer-see-all")).toContain(escape(copyOf(lang).seeAllTemplates));
    }
    const src = read("src/components/landing/gallery/category-viewer.tsx");
    expect(src).toContain("onSeeAll");
    expect(src).toContain('"rak-title"');
  });

  it("viewer body uses palette literals, never theme tokens that vanish on the snow panel", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const html = render(lang, c);
        for (const t of ["text-foreground", "text-muted-foreground", "border-border", "bg-card", "var(--fuse-accent-text)", "clay-btn", "hover:bg-muted"])
          expect(html, `${lang}/${c.id}: ${t}`).not.toContain(t);
      }
  });

  it("FuseLockup markOnly renders the two mark paths without the USE word", () => {
    const mark = renderToStaticMarkup(createElement(FuseLockup, { label: "FUSE", markOnly: true } as Parameters<typeof FuseLockup>[0]));
    expect(mark.match(/class="fuse-mark"/g)?.length).toBe(2);
    expect(mark).not.toContain("fuse-word");
    const full = renderToStaticMarkup(createElement(FuseLockup, { label: "FUSE" }));
    expect(full.match(/fuse-word/g)?.length).toBe(1);
  });

  it("every viewer grid column has min-w-0 and the preview is w-full max-w-full, so 390 px never overflows", () => {
    const html = render("id", SITE_CATEGORIES[0]);
    const grid = tagOf(html, "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)_8.5rem]");
    const at = html.indexOf(grid) + grid.length;
    for (const order of ["order-1", "order-2", "order-3"]) {
      const tag = tagOf(html.slice(at), `class="${order}`);
      expect(tag, order).toMatch(/class="[^"]*\bmin-w-0\b/);
    }
    const preview = tagOf(html, "data-viewer-preview=");
    for (const k of ["w-full", "max-w-full"]) expect(preview, k).toMatch(new RegExp(`class="[^"]*\\b${k}(?=[\\s"])`));
  });

  it("preview hint is painted above the mist circle (relative z-10)", () => {
    for (const lang of LANGS) {
      const hint = tagOf(render(lang, SITE_CATEGORIES[0]), "data-viewer-preview-hint");
      for (const k of ["relative", "z-10"]) expect(hint, k).toMatch(new RegExp(`class="[^"]*\\b${k}(?=[\\s"])`));
    }
  });

  it("spec table stacks label/value pairs full width below sm and stays a fixed table from sm", () => {
    const html = render("id", SITE_CATEGORIES[0]);
    const table = section(html, "data-viewer-specs");
    const open = table.slice(0, table.indexOf(">"));
    for (const k of ["max-sm:block", "sm:table", "table-fixed"]) expect(open, k).toContain(k);
    const cells = [...table.matchAll(/<(tbody|tr|th|td)[\s>][^>]*>/g)].map((m) => m[0]);
    expect(cells.length).toBe(1 + 3 + 6 + 6);
    for (const c of cells) expect(c, c).toContain("max-sm:block");
  });

  it("spec table keeps explicit ARIA table roles so WebKit does not drop semantics when stacked", () => {
    for (const lang of LANGS)
      for (const c of SITE_CATEGORIES) {
        const table = section(render(lang, c), "data-viewer-specs");
        const tag = (name: string) => [...table.matchAll(new RegExp(`<${name}[\\s>][^>]*>`, "g"))].map((m) => m[0]);
        expect(tag("table")[0]).toContain('role="table"');
        expect(tag("tbody")[0]).toContain('role="rowgroup"');
        const rows = table.split("<tr").slice(1);
        expect(rows).toHaveLength(3);
        for (const r of rows) {
          expect(r.slice(0, r.indexOf(">"))).toContain('role="row"');
          expect(r.match(/<th[^>]*role="rowheader"/g)?.length, r).toBe(2);
          expect(r.match(/<td[^>]*role="cell"/g)?.length, r).toBe(2);
        }
      }
  });

  it("each spec td points via headers to exactly its own th in the same row, and ids are unique", () => {
    const html = render("id", SITE_CATEGORIES[0]);
    const table = section(html, "data-viewer-specs");
    const allIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(allIds).size).toBe(allIds.length);
    const rows = table.split("<tr").slice(1);
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      const cells = [...r.matchAll(/<(th|td)[\s>][^>]*>/g)].map((m) => m[0]);
      const ths = cells.filter((t) => t.startsWith("<th")).map((t) => /\sid="([^"]+)"/.exec(t)?.[1]);
      expect(ths.every(Boolean), r).toBe(true);
      cells.forEach((t, i) => {
        if (!t.startsWith("<td")) return;
        const headers = /\sheaders="([^"]+)"/.exec(t)?.[1];
        expect(headers, t).toBeDefined();
        expect(ths.filter((id) => id === headers)).toHaveLength(1);
        expect(/\sid="([^"]+)"/.exec(cells[i - 1])?.[1], "pairs with preceding th").toBe(headers);
      });
    }
  });

  it(".gitignore keeps the referensi/ design reference folder out of git", () => {
    const lines = read(".gitignore").split(/\r?\n/).map((l) => l.trim());
    expect(lines.some((l) => l === "/referensi/" || l === "referensi/")).toBe(true);
  });

  it("page caption sits after the mist circle on an opaque snow panel above it", () => {
    for (const lang of LANGS) {
      const html = render(lang, SITE_CATEGORIES[0]);
      const text = escape(fmt(copyOf(lang).pageOf, { n: 1, total: 3 }));
      const at = html.indexOf(`>${text}<`);
      expect(at, text).toBeGreaterThan(html.indexOf("data-viewer-circle"));
      const tag = html.slice(html.lastIndexOf("<", at), at + 1);
      for (const k of ["bg-[#F6FAFD]", "relative", "z-10"]) expect(tag, k).toContain(k);
    }
  });
});
