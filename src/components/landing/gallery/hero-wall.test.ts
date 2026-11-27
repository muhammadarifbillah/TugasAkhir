import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { GalleryProvider } from "./gallery-provider";
import { wallPose } from "./gallery-logic";
import { HeroWall } from "./hero-wall";

type Json = Record<string, unknown>;
type ProviderProps = Parameters<typeof GalleryProvider>[0];

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const id = JSON.parse(read("src/dictionaries/id.json")) as { landing: Json; categories: Json; app: { name: string } };
const copy = id.landing.gallery as ProviderProps["copy"];
const labels = id.categories as unknown as ProviderProps["labels"];
const names = (id.categories.items as Record<string, { name: string }>);

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const html = () =>
  renderToStaticMarkup(
    createElement(GalleryProvider, { lang: "id", appName: id.app.name, labels, copy } as ProviderProps, createElement(HeroWall)),
  );

describe("hero wall", () => {
  it("HeroWall renders eight labelled category panels as buttons", () => {
    const out = html();
    expect(out.match(/data-gallery-panel/g)?.length).toBe(8);
    const panels = [...out.matchAll(/<button[^>]*data-gallery-panel[^>]*>/g)].map((m) => m[0]);
    expect(panels).toHaveLength(8);
    panels.forEach((tag, i) => {
      const name = names[SITE_CATEGORIES[i].id].name;
      expect(tag).toContain('type="button"');
      expect(tag).toContain(`aria-label="${escape(fmt(copy.openPanel, { category: name }))}"`);
      expect(out).toContain(`>${escape(name)}<`);
    });
    expect(out).toContain(`aria-label="${escape(copy.wallLabel)}"`);
    // The hint and gallery label moved to HeroSection (herosection.jpeg: they sit above the water floor, hero.test.ts).
    expect(out).not.toContain("backdrop");
  });

  // r22 round 2: x and z are in panel widths (--pw), so the projected wall keeps its gaps at every desktop width.
  it("each panel carries its wallPose as CSS variables", () => {
    const out = html();
    for (const i of [0, 7]) {
      const p = wallPose(i, 8);
      expect(out).toContain(`--ry:${p.rotateY}deg`);
      expect(out).toContain(`--x:${p.x}`);
      expect(out).toContain(`--z:${p.z}`);
    }
  });

  // r22 round 2: nearer (edge) panels paint in front, symmetric; the hover is a visible lift, brighter, with a white edge glow.
  it("edge panels stack in front and the hovered panel lifts 14px with a glow", () => {
    const out = html();
    const z = [...out.matchAll(/<li[^>]*style="[^"]*z-index:(\d+)/g)].map((m) => Number(m[1]));
    expect(z).toHaveLength(8);
    expect(z).toEqual([...z].reverse());
    for (const i of [0, 1, 2]) expect(z[i], `z-index ${i}`).toBeGreaterThan(z[i + 1]);
    const src = read("src/components/landing/gallery/hero-wall.tsx");
    expect(src).toContain("lg:pointer-fine:[transform-style:preserve-3d]");
    for (const s of ["motion-safe:hover:-translate-y-3.5", "motion-safe:focus-visible:-translate-y-3.5", "brightness-115", "group-hover:shadow-[", "group-focus-visible:shadow-["])
      expect(src, s).toContain(s);
  });

  // herosection.jpeg: each panel is one mood scene with a website skeleton, no longer three stacked SiteArt pages.
  it("HeroWall panels are portrait HeroScene frames with a mirrored reflection", () => {
    const out = html();
    expect(out.match(/data-gallery-panel/g)?.length).toBe(8);
    expect(out.match(/data-panel-art/g)?.length).toBe(8);
    expect(out).not.toContain("data-panel-page");
    expect(out.match(/data-panel-reflection/g)?.length).toBe(8);
    for (let i = 1; i <= 8; i++) expect(out.match(new RegExp(`data-mood="${i}"`, "g"))?.length, `mood ${i}`).toBe(2);
    for (const attr of ["data-panel-art", "data-panel-reflection"]) {
      const tags = [...out.matchAll(new RegExp(`<[a-z]+[^>]*${attr}[^>]*>`, "g"))].map((m) => m[0]);
      expect(tags).toHaveLength(8);
      for (const t of tags) expect(t, attr).toContain('aria-hidden="true"');
    }
    const panels = [...out.matchAll(/<button[^>]*data-gallery-panel[^>]*>/g)].map((m) => m[0]);
    panels.forEach((tag, i) => {
      const name = names[SITE_CATEGORIES[i].id].name;
      expect(tag).toContain(`aria-label="${escape(fmt(copy.openPanel, { category: name }))}"`);
    });
  });

  it("each panel carries its coverflow pose", () => {
    const out = html();
    for (const i of [0, 3, 7]) {
      const p = wallPose(i, 8);
      expect(out).toContain(`--ry:${p.rotateY}deg`);
      expect(out).toContain(`--z:${p.z}`);
      expect(out).toContain(`--s:${p.scale}`);
    }
  });

  // herosection.jpeg: portrait 2:3 panels everywhere, 62vw carousel cards, slimmer desktop columns.
  it("wall and carousel sizes follow the panorama spec", () => {
    const src = read("src/components/landing/gallery/hero-wall.tsx");
    for (const s of [
      "lg:pointer-fine:w-[clamp(9rem,13vw,15rem)]",
      "aspect-[2/3]",
      "w-[62vw]",
      "gallery-carousel-item",
      "scale(var(--s))",
      "[perspective:1200px]",
      "motion-safe:",
      "snap-x",
      "snap-mandatory",
      "LANDING_MOTION_QUERY",
      "pointerTilt",
    ])
      expect(src).toContain(s);
    for (const s of ["setInterval", "requestAnimationFrame", "backdrop"]) expect(src).not.toContain(s);
  });

  // herosection.jpeg replaces the sliding SiteArt column: HeroScene panels, hairline gaps, thin caps labels, rippled reflection.
  it("panels use HeroScene with a hairline gap, thin uppercase labels and a rippled mirrored reflection", () => {
    const src = read("src/components/landing/gallery/hero-wall.tsx");
    expect(src).toContain("<HeroScene");
    expect(src).not.toContain("SiteArt");
    const row = src.match(/<ul className="([^"]+)"/)![1].split(/\s+/);
    const gap = row.map((c) => c.match(/^lg:pointer-fine:gap-\[(\d+)px\]$/)).find(Boolean);
    expect(gap, "desktop gap-[Npx]").toBeTruthy();
    expect(Number(gap![1])).toBeLessThanOrEqual(8);
    for (const c of ["snap-x", "snap-mandatory", "overflow-x-auto"]) expect(row, c).toContain(c);
    // The concave curve is layout, not motion: it stays on desktop under reduced motion, so the row is centred and unclipped there.
    for (const c of ["lg:pointer-fine:overflow-visible", "lg:pointer-fine:justify-center"]) expect(row, c).toContain(c);
    // r22 round 2: translate first (in panel widths), then turn and scale in place; the old order pushed panels into each other.
    expect(src).toContain(
      "lg:pointer-fine:[transform:translateX(calc(var(--x)*var(--pw)))_translateZ(calc(var(--z)*var(--pw)))_rotateY(var(--ry))_scale(var(--s))]",
    );
    expect(src).toContain("[--pw:clamp(9rem,13vw,15rem)]");

    const label = src.match(/<span[^>]*className="([^"]*)"[^>]*>\s*\{name\}/);
    expect(label, "label span").not.toBeNull();
    for (const c of ["uppercase", "font-light"]) expect(label![1].split(/\s+/), c).toContain(c);
    expect(label![1]).toMatch(/(?<![\w:-])tracking-\[/);

    const at = src.indexOf("data-panel-reflection");
    const refl = src.slice(at, src.indexOf("</li>", at));
    expect(refl).toContain("url(#hero-ripple)");
    expect(refl).toMatch(/scaleY\(-1\)|-scale-y-100/);
    expect(refl).toContain("<HeroScene");
    expect(src).toContain("open(c.id, e.currentTarget)");
    expect(src).toContain("fmt(copy.openPanel");
  });

  it("the carousel centre grows with a scroll-driven animation only when motion is allowed", () => {
    const css = read("src/app/globals.css");
    for (const s of ["@keyframes gallery-focus", "animation-timeline: view(inline)", "@supports (animation-timeline: view())", "prefers-reduced-motion: no-preference"])
      expect(css).toContain(s);
    const at = css.indexOf("@keyframes gallery-focus");
    const block = css.slice(at, css.indexOf(".gallery-carousel-item", at) + 200);
    expect(block).toContain("gallery-focus linear both");
    expect(block).not.toContain("infinite");
  });

  it("HeroWall is a snap carousel on small screens and a 3D wall behind lg:pointer-fine", () => {
    const src = read("src/components/landing/gallery/hero-wall.tsx");
    for (const s of ["snap-x", "snap-mandatory", "lg:pointer-fine:", "motion-safe:", "motion-reduce:", "LANDING_MOTION_QUERY", "pointerTilt", "wallPose", "aria-hidden"])
      expect(src).toContain(s);
    for (const s of ["setInterval", "requestAnimationFrame", "backdrop"]) expect(src).not.toContain(s);
  });

  it("GalleryProvider re-enables interaction motion and throws outside", () => {
    const src = read("src/components/landing/gallery/gallery-provider.tsx");
    expect(src).toContain("skipAnimations={false}");
    expect(src).toContain("CategoryViewer");
    expect(() => renderToStaticMarkup(createElement(HeroWall))).toThrow();
  });

  // Owner decision 2026-11-27: the hero is HeroSection (which renders HeroWall) with one button, no shelf link.
  it("page.tsx renders the gallery hero and no longer the tape", () => {
    const page = read("src/app/[lang]/page.tsx");
    expect(page).not.toContain("HeroTape");
    for (const s of ["<GalleryProvider", "<HeroSection", "headline={l.gallery.headline}", "sub={l.gallery.sub}", "ctaHref={cta.href}", "ctaLabel={l[cta.label]}"])
      expect(page).toContain(s);
    expect(page).not.toContain('href="#rak"');
    expect(page.indexOf("<HeroSection")).toBeGreaterThan(page.indexOf("<GalleryProvider"));
    expect(page.indexOf("<HeroSection")).toBeLessThan(page.indexOf("</GalleryProvider>"));
    expect(page.match(/href=\{cta\.href\}/g) ?? []).toHaveLength(1);
  });
});
