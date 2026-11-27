import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { HeroScene } from "./hero-scene";
import { HERO_MOODS } from "./moods";

const scene = (i: number) => renderToStaticMarkup(createElement(HeroScene, { category: SITE_CATEGORIES[i], mood: i + 1 }));

describe("hero scene", () => {
  it("HERO_MOODS lists the eight reference moods left to right", () => {
    expect(HERO_MOODS.map((m) => m.id)).toEqual([
      "whiteWaterfall",
      "blueOcean",
      "greenMeadows",
      "redSavanna",
      "blueDeep",
      "orangeSunset",
      "violetDawn",
      "whiteWinter",
    ]);
  });

  it("HeroScene renders an aria-hidden vector landscape with a website skeleton for each category", () => {
    const seen = new Set<string>();
    SITE_CATEGORIES.forEach((c, i) => {
      const html = scene(i);
      const root = html.slice(0, html.indexOf(">") + 1);
      expect(root.startsWith("<svg"), c.id).toBe(true);
      expect(root, c.id).toContain('aria-hidden="true"');
      expect(root, c.id).toContain(`data-mood="${i + 1}"`);
      expect(root, c.id).toContain('preserveAspectRatio="xMidYMid slice"');
      for (const s of ["data-scene-nav", "data-scene-cta"]) expect(html, `${c.id} ${s}`).toContain(s);
      for (const s of ["<text", "<image", "<foreignObject"]) expect(html, `${c.id} ${s}`).not.toContain(s);
      seen.add(html);
    });
    expect(seen.size).toBe(8);
  });

  it("the skeleton follows the first page's blocks, so categories with different blocks differ", () => {
    const strip = (h: string) => h.replace(/data-mood="\d"/, "").replace(/id="[^"]*"|url\(#[^)]*\)/g, "");
    // Same mood, different categories: only the skeleton can tell them apart.
    const a = renderToStaticMarkup(createElement(HeroScene, { category: SITE_CATEGORIES[0], mood: 1 }));
    const b = renderToStaticMarkup(createElement(HeroScene, { category: SITE_CATEGORIES[1], mood: 1 }));
    expect(SITE_CATEGORIES[0].pages[0].blocks).not.toEqual(SITE_CATEGORIES[1].pages[0].blocks);
    expect(strip(a)).not.toBe(strip(b));
  });
});
