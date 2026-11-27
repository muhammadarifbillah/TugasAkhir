import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GalleryProvider } from "../gallery/gallery-provider";
import { LANDING_MOTION_QUERY } from "../motion";
import { HeroBackdrop } from "./hero-backdrop";
import { HeroSection } from "./hero-section";

type Json = Record<string, unknown>;
type ProviderProps = Parameters<typeof GalleryProvider>[0];

const ROOT = process.cwd();
const DIR = "src/components/landing/hero";
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const id = JSON.parse(read("src/dictionaries/id.json")) as { landing: Json & { ctaPrimary: string }; categories: Json; app: { name: string } };
const copy = id.landing.gallery as ProviderProps["copy"] & { headline: string; sub: string };

const section = () =>
  renderToStaticMarkup(
    createElement(
      GalleryProvider,
      { lang: "id", appName: id.app.name, labels: id.categories, copy } as unknown as ProviderProps,
      createElement(HeroSection, { headline: copy.headline, sub: copy.sub, ctaHref: "/id/register", ctaLabel: id.landing.ctaPrimary }),
    ),
  );

describe("hero backdrop", () => {
  it("HeroBackdrop is an aria-hidden sky with a moon, at least 40 stars and leaf silhouettes, identical on every render", () => {
    const html = renderToStaticMarkup(createElement(HeroBackdrop));
    const root = html.slice(0, html.indexOf(">") + 1);
    expect(root).toContain('aria-hidden="true"');
    for (const s of ["data-hero-moon", "data-hero-leaves"]) expect(html, s).toContain(s);
    expect(html.match(/<circle/g)?.length ?? 0).toBeGreaterThanOrEqual(40);
    expect(renderToStaticMarkup(createElement(HeroBackdrop))).toBe(html);
    for (const s of ["<text", "<image"]) expect(html, s).not.toContain(s);
  });
});

describe("hero section", () => {
  it("HeroSection is always black and stacks backdrop, title, one CTA, wall, floor and grass in order", () => {
    const html = section();
    const tag = html.slice(0, html.indexOf(">") + 1);
    expect(tag.startsWith("<section")).toBe(true);
    expect(tag).toContain('id="mulai-hero"');
    expect(tag).toMatch(/(?<![\w:-])bg-(?:\[#000\]|black)(?![\w/-])/);
    // Fixed black in both themes: nothing on the section switches with dark:.
    expect(tag).not.toContain("dark:");
    for (const s of ["isolate", "overflow-hidden"]) expect(tag, s).toContain(s);

    const order = ["data-hero-backdrop", "<h1", "<p", "<a", 'role="group"', "data-hero-floor", "data-hero-grass"];
    const at = order.map((s) => html.indexOf(s));
    order.forEach((s, i) => expect(at[i], s).toBeGreaterThan(-1));
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html.match(/<h1/g)).toHaveLength(1);
    const title = html.slice(at[1], at[4]);
    expect(title.match(/<a\b/g)).toHaveLength(1);
    expect(title).toContain('href="/id/register"');
    expect(title).toContain(id.landing.ctaPrimary);
    expect(html).not.toContain('href="#rak"');
    for (const s of ["data-hero-floor", "data-hero-grass"]) {
      const t = html.slice(html.lastIndexOf("<", html.indexOf(s)), html.indexOf(">", html.indexOf(s)) + 1);
      expect(t, s).toContain('aria-hidden="true"');
    }
    expect(html).toContain('id="hero-ripple"');
    expect(html).toContain(copy.hint);
  });

  it("hero.css keeps all ambient animation inside the landing motion media query and turns it off on reduce", () => {
    const css = read(`${DIR}/hero.css`);
    const media = `@media ${LANDING_MOTION_QUERY}`;
    const start = css.indexOf(media);
    expect(start, media).toBeGreaterThan(-1);
    let depth = 0;
    let end = -1;
    for (let i = css.indexOf("{", start); i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) {
        end = i;
        break;
      }
    }
    expect(end).toBeGreaterThan(start);
    const uses = [...css.matchAll(/(?<![\w-])animation(?:-name)?\s*:\s*(?!none)/g)].map((m) => m.index);
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u > start && u < end, `animation at ${u}`).toBe(true);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("@keyframes");
  });

  it("no hero source uses backdrop-blur or raster images", () => {
    const files = readdirSync(join(ROOT, DIR)).filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes(".test."));
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) {
      const text = read(`${DIR}/${f}`);
      for (const s of ["backdrop-blur", "backdrop-filter", "<image", "<img", ".png", ".jpg", "Math.random"]) expect(text, `${f} ${s}`).not.toContain(s);
    }
    expect(read(`${DIR}/hero-section.tsx`)).toContain('import "./hero.css"');
  });
});
