import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES, type SiteCategory } from "@/lib/site-categories";
import { STAGE_DEFINITIONS } from "@/lib/stages";
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

  it("CategoryViewer uses the Radix dialog, returns focus, handles arrows and blocks Lenis", () => {
    const src = read("src/components/landing/gallery/category-viewer.tsx");
    for (const s of ["@radix-ui/react-dialog", "onCloseAutoFocus", "onOpenChange", "keyToAction", "data-lenis-prevent", "AnimatePresence"])
      expect(src).toContain(s);
    for (const s of ["backdrop", "<motion.", "setInterval"]) expect(src).not.toContain(s);
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
  });
});
