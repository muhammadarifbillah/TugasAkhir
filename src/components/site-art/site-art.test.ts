import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { fmt } from "@/lib/format";
import { PALETTE } from "@/lib/palette";
import { SITE_CATEGORIES, type SiteCategory } from "@/lib/site-categories";
import { CategoryIcon } from "./category-icon";
import { SiteArt } from "./site-art";

type Labels = Parameters<typeof SiteArt>[0]["labels"];
type Item = { name: string; pages: Record<string, string> };
const LANGS = { en: en.categories, id: id.categories } as unknown as Record<string, Labels>;
const PAGES = [0, 1, 2] as const;

const escape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const unescape = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");

const item = (labels: Labels, c: SiteCategory) => (labels.items as unknown as Record<string, Item>)[c.id];
const render = (c: SiteCategory, i: 0 | 1 | 2, labels: Labels) =>
  renderToStaticMarkup(createElement(SiteArt, { category: c, pageIndex: i, labels }));

describe("SiteArt", () => {
  it("SiteArt renders all 24 pages in en and id with role img and the formatted label", () => {
    for (const labels of Object.values(LANGS))
      for (const c of SITE_CATEGORIES)
        for (const i of PAGES) {
          const html = render(c, i, labels);
          const names = item(labels, c);
          const label = fmt(labels.artLabel, { page: names.pages[c.pages[i].id], category: names.name });
          expect(html).toContain('role="img"');
          expect(html).toContain(`aria-label="${escape(label)}"`);
        }
  });

  it("SiteArt text nodes are non-empty and only the category or page name", () => {
    for (const labels of Object.values(LANGS))
      for (const c of SITE_CATEGORIES)
        for (const i of PAGES) {
          const html = render(c, i, labels);
          const names = item(labels, c);
          const allowed = [names.name, names.pages[c.pages[i].id]];
          const texts = [...html.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => unescape(m[1].trim()));
          expect(texts.length, `${c.id}/${i}`).toBeGreaterThanOrEqual(1);
          expect((html.match(/<text/g) ?? []).length).toBe(texts.length);
          for (const t of texts) {
            expect(t).not.toBe("");
            expect(allowed, `${c.id}/${i}`).toContain(t);
          }
        }
  });

  it("SiteArt paints all 24 pages with palette colours only", () => {
    const allowed = new Set([...Object.values(PALETTE).map((h) => h.toLowerCase()), "none"]);
    for (const c of SITE_CATEGORIES)
      for (const i of PAGES) {
        const html = render(c, i, LANGS.en);
        for (const [, attr, value] of html.matchAll(/\s(fill|stroke|stop-color)="([^"]*)"/g))
          expect(allowed.has(value.toLowerCase()) || /^url\(#[^)]+\)$/.test(value), `${c.id}/${i} ${attr}="${value}"`).toBe(true);
        expect(html).not.toContain("hsl(");
        expect(html).toContain(PALETTE[c.tone.accent]);
        const stops = [...html.matchAll(/stop-color="([^"]*)"/g)].map((m) => m[1]);
        expect(stops, `${c.id}/${i}`).toEqual([PALETTE[c.tone.hero[0]], PALETTE[c.tone.hero[1]]]);
        expect(html.slice(0, html.indexOf(">"))).toContain(`data-category="${c.id}"`);
        expect(html).toContain('viewBox="0 0 320 200"');
        expect(html).not.toContain("backdrop");
        expect(html).not.toContain("blur");
        expect(html).not.toContain("<image");
      }
  });

  it("SiteArt output differs between the three pages of a category", () => {
    for (const c of SITE_CATEGORIES) {
      const out = PAGES.map((i) => render(c, i, LANGS.en));
      expect(new Set(out).size, c.id).toBe(3);
    }
  });

  it("CategoryIcon renders an aria-hidden svg for all eight categories", () => {
    for (const c of SITE_CATEGORIES) {
      const html = renderToStaticMarkup(createElement(CategoryIcon, { id: c.id }));
      expect(html.startsWith("<svg"), c.id).toBe(true);
      expect(html).toContain('aria-hidden="true"');
    }
  });
});
