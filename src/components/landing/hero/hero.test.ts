import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GalleryProvider } from "../gallery/gallery-provider";
import { LANDING_MOTION_QUERY } from "../motion";
import { HeroBackdrop } from "./hero-backdrop";
import { HeroFloor } from "./hero-floor";
import { HeroGrass } from "./hero-grass";
import { HeroSection } from "./hero-section";

type Json = Record<string, unknown>;
type ProviderProps = Parameters<typeof GalleryProvider>[0];

const ROOT = process.cwd();
const DIR = "src/components/landing/hero";
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const id = JSON.parse(read("src/dictionaries/id.json")) as { landing: Json & { ctaPrimary: string }; categories: Json; app: { name: string } };
const copy = id.landing.gallery as ProviderProps["copy"] & { headline: string; sub: string };

// r25: React hoists a <link rel="preload"> for each fetchPriority="high" panel image (it lands in <head> in the app).
const section = () =>
  renderToStaticMarkup(
    createElement(
      GalleryProvider,
      { lang: "id", appName: id.app.name, labels: id.categories, copy } as unknown as ProviderProps,
      createElement(HeroSection, { headline: copy.headline, sub: copy.sub, ctaHref: "/id/register", ctaLabel: id.landing.ctaPrimary }),
    ),
  ).replace(/^(?:<link rel="preload"[^>]*\/?>)+/, "");

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

  // r22 round 2: the reference frames the moon with dense foliage on both sides, not one small clump.
  it("HeroBackdrop has at least two leaf clusters", () => {
    const html = renderToStaticMarkup(createElement(HeroBackdrop));
    expect(html.match(/data-hero-leaves/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

/** Class list of the first tag carrying `attr`. */
const classesOf = (html: string, attr: string) => {
  const at = html.indexOf(attr);
  const tag = html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
};
const zOf = (classes: string[]) => {
  const z = classes.map((c) => c.match(/^(-?)z-(?:\[(-?\d+)\]|(\d+))$/)).find(Boolean);
  expect(z, classes.join(" ")).toBeTruthy();
  return Number(z![1] + (z![2] ?? z![3]));
};

describe("hero composition (r22 round 2)", () => {
  it("the hero fills the first screen on desktop with a sane minimum", () => {
    const tag = section().slice(0, section().indexOf(">") + 1);
    expect(tag).toContain("lg:h-[calc(100svh-3.5rem)]");
    expect(tag).toMatch(/lg:min-h-\[\d+px\]/);
  });

  it("the water floor sits behind the wall so its burst and orbs never cover a panel", () => {
    const html = section();
    const wall = html.lastIndexOf("<div", html.indexOf('role="group"'));
    const wrapper = html.lastIndexOf("<div", wall - 1);
    const wrapperClasses = (html.slice(wrapper, html.indexOf(">", wrapper)).match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    expect(zOf(classesOf(html, "data-hero-floor"))).toBeLessThan(zOf(wrapperClasses));
  });

  // r28: title 0-30 %, the row of wide cards below it (card art ends by 76 %), floor 70-100 %.
  // A layout model of the classes that set it (jsdom has no layout); the orchestrator checks the browser.
  it("the first screen splits into title, card row and floor at 1440x900 and 1024x768", () => {
    const html = section();
    const num = (cls: string[], re: RegExp) => {
      const m = cls.map((c) => c.match(re)).find(Boolean);
      expect(m, `${re} in ${cls.join(" ")}`).toBeTruthy();
      return m!.slice(1).map(Number);
    };
    const titleAt = html.lastIndexOf("<div", html.indexOf("<h1"));
    const titleBox = (html.slice(titleAt, html.indexOf(">", titleAt)).match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    const [ptMin, ptVw, ptMax] = num(titleBox, /^lg:pt-\[clamp\(([\d.]+)rem,([\d.]+)vw,([\d.]+)rem\)\]$/);
    // One-line title stack: h1 40 (lg:text-4xl, fits max-w-4xl), mt-2 8, sub 26 (one line in 60ch), mt-3 12, button 44.
    expect(titleBox).toContain("max-w-4xl");
    expect(classesOf(html, "<p ")).toContain("max-w-[60ch]");
    expect(classesOf(html, 'href="/id/register"')).toContain("mt-3");
    const STACK = 40 + 8 + 26 + 12 + 44;
    const wall = html.lastIndexOf("<div", html.indexOf('role="group"'));
    const wrapper = html.lastIndexOf("<div", wall - 1);
    const wrapperClasses = (html.slice(wrapper, html.indexOf(">", wrapper)).match(/class="([^"]*)"/)?.[1] ?? "").split(/\s+/);
    for (const c of ["lg:absolute", "lg:inset-x-0", "lg:-translate-y-1/2"]) expect(wrapperClasses, c).toContain(c);
    const [top] = num(wrapperClasses, /^lg:top-\[([\d.]+)%\]$/);
    expect(classesOf(html, "data-hero-floor")).toContain("h-[30%]");

    const wallSrc = read("src/components/landing/gallery/hero-wall.tsx");
    const cw = wallSrc.match(/w-\[clamp\(([\d.]+)rem,([\d.]+)vw,([\d.]+)rem\)\]/);
    expect(cw, "card width clamp").not.toBeNull();
    const [cMin, cVw, cMax] = cw!.slice(1).map(Number);

    for (const { vw, vh } of [{ vw: 1440, vh: 900 }, { vw: 1024, vh: 768 }]) {
      const hh = Math.max(640, vh - 56);
      // HeroBackdrop: moon bottom at y=110 of a 1440x520 viewBox, xMidYMin slice over vw x clamp(13rem,36vw,32.5rem).
      const moon = 110 * Math.max(vw / 1440, Math.min(520, Math.max(208, 0.36 * vw)) / 520);
      const pt = Math.min(ptMax * 16, Math.max(ptMin * 16, (ptVw * vw) / 100));
      expect(pt, `${vw}px title below the moon`).toBeGreaterThanOrEqual(moon);
      const titleBottom = pt + STACK;
      expect(titleBottom / hh, `${vw}px title bottom`).toBeLessThanOrEqual(0.3);

      // Wrapper centred at top%: caption row (44px pause pill + pb-3), 16/10 card, 6px gap + 16/4 reflection.
      const w = Math.min(cMax * 16, Math.max(cMin * 16, (cVw * vw) / 100));
      const header = 44 + 12;
      const wrapperH = header + w / 1.6 + 6 + w / 4;
      const wrapperTop = (top / 100) * hh - wrapperH / 2;
      expect(wrapperTop, `${vw}px caption clears the button`).toBeGreaterThanOrEqual(titleBottom + 8);
      const cardTop = wrapperTop + header;
      expect(cardTop / hh, `${vw}px card top`).toBeGreaterThanOrEqual(0.26);
      expect((cardTop + w / 1.6) / hh, `${vw}px card bottom`).toBeLessThanOrEqual(0.76);
    }
  });

  it("the hero shows the hint and the gallery label", () => {
    const html = section();
    expect(html).toContain(copy.hint);
    expect(html).toContain((id.categories as { galleryLabel: string }).galleryLabel);
  });
});

describe("hero floor and grass (r22 round 3)", () => {
  it("orbs stay in the outer 30 % on each side so they never cover the centred caption", () => {
    const html = renderToStaticMarkup(createElement(HeroFloor));
    const W = Number(html.match(/viewBox="0 0 (\d+) /)![1]);
    const orbs = [...html.matchAll(/<g class="hero-orb"><circle cx="([\d.]+)" cy="[\d.]+" r="([\d.]+)"/g)].map((m) => [Number(m[1]), Number(m[2])]);
    expect(orbs.length).toBeGreaterThanOrEqual(3);
    for (const [cx, r] of orbs) expect(cx + r <= 0.3 * W || cx - r >= 0.7 * W, `orb at ${cx}`).toBe(true);
  });

  it("the water behind the grass glows teal and the blade tips catch it", () => {
    expect(renderToStaticMarkup(createElement(HeroFloor))).toContain("#0e2a3a");
    const grass = renderToStaticMarkup(createElement(HeroGrass));
    expect(grass).toContain("#16283a");
    expect(grass).toContain('fill="#000"');
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

    // "<p " and "<a " with a space: SVG "<path" must not count as a paragraph.
    const order = ["data-hero-backdrop", "<h1", "<p ", "<a ", 'role="group"', "data-hero-floor", "data-hero-grass"];
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
    const uses = [...css.matchAll(/(?<![\w-])animation(?:-name)?\s*:(?!\s*none)/g)].map((m) => m.index);
    expect(uses.length).toBeGreaterThan(0);
    for (const u of uses) expect(u > start && u < end, `animation at ${u}`).toBe(true);
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("@keyframes");
  });

  it("no hero source uses backdrop-blur or raster images", () => {
    const files = readdirSync(join(ROOT, DIR)).filter((f) => /\.(tsx?|css)$/.test(f) && !f.includes(".test."));
    // r25: hero-scene.tsx and moods.ts were removed (the wall shows template screenshots), leaving five sources.
    expect(files.length).toBeGreaterThanOrEqual(5);
    for (const f of files) {
      const text = read(`${DIR}/${f}`);
      for (const s of ["backdrop-blur", "backdrop-filter", "<image", "<img", ".png", ".jpg", "Math.random"]) expect(text, `${f} ${s}`).not.toContain(s);
    }
    expect(read(`${DIR}/hero-section.tsx`)).toContain('import "./hero.css"');
  });
});
