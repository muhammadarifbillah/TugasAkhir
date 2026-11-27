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

  // r22 round 2: unrounded Math.cos output in the palm fronds can differ between server and client (hydration).
  it("computed path coordinates are rounded to at most 2 decimals", () => {
    SITE_CATEGORIES.forEach((c, i) => {
      for (const [, d] of scene(i).matchAll(/ d="([^"]*)"/g)) expect(d, c.id).not.toMatch(/\d\.\d{3,}/);
    });
  });

  // r23 round 2: desktop panels are 10/19, the touch carousel stays 2:3. One 200x380 scene: the 2:3 slice keeps the
  // middle 200x300 band, so the skeleton lives in that band (a translate(0 40) frame) and both shapes show it whole.
  it("HeroScene is a slim 200x380 portrait with the website skeleton inside the 2:3 middle band", () => {
    SITE_CATEGORIES.forEach((c, i) => {
      const html = scene(i);
      expect(html.slice(0, html.indexOf(">")), c.id).toContain('viewBox="0 0 200 380"');
      const at = html.indexOf('<g transform="translate(0 40)">');
      expect(at, c.id).toBeGreaterThan(-1);
      const frame = html.slice(at);
      expect(frame.indexOf("data-scene-nav"), c.id).toBeGreaterThan(-1);
      for (const [, y, h] of frame.slice(frame.indexOf("data-scene-nav")).matchAll(/<rect[^>]* y="([\d.-]+)"[^>]* height="([\d.]+)"/g)) {
        expect(Number(y), `${c.id} y`).toBeGreaterThanOrEqual(0);
        expect(Number(y) + Number(h), `${c.id} y+h`).toBeLessThanOrEqual(300);
      }
    });
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
