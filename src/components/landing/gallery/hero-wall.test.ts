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
    expect(out).toContain(escape(labels.galleryLabel));
    expect(out).toContain(escape(copy.hint));
    expect(out).not.toContain("backdrop");
  });

  it("each panel carries its wallPose as CSS variables", () => {
    const out = html();
    for (const i of [0, 7]) {
      const p = wallPose(i, 8);
      expect(out).toContain(`--ry:${p.rotateY}deg`);
      expect(out).toContain(`--tz:${p.z}px`);
    }
  });

  it("HeroWall panels are portrait frames with three stacked pages", () => {
    const out = html();
    expect(out.match(/data-gallery-panel/g)?.length).toBe(8);
    expect(out.match(/data-panel-art/g)?.length).toBe(8);
    expect(out.match(/data-panel-page/g)?.length).toBe(24);
    expect(out.match(/data-panel-reflection/g)?.length).toBe(8);
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
      expect(out).toContain(`--tz:${p.z}px`);
      expect(out).toContain(`--s:${p.scale}`);
    }
  });

  it("wall and carousel sizes follow the panorama spec", () => {
    const src = read("src/components/landing/gallery/hero-wall.tsx");
    for (const s of [
      "lg:pointer-fine:w-[clamp(8.5rem,14vw,15rem)]",
      "lg:pointer-fine:aspect-[2/3]",
      "aspect-[3/4]",
      "w-[80vw]",
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

  it("page.tsx renders the gallery hero and no longer the tape", () => {
    const page = read("src/app/[lang]/page.tsx");
    expect(page).not.toContain("HeroTape");
    for (const s of ["<GalleryProvider", "<HeroWall", "l.gallery.headline", "l.gallery.sub", 'href="#rak"']) expect(page).toContain(s);
    expect(page.match(/href=\{cta\.href\}/g) ?? []).toHaveLength(2);
  });
});
