import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PALETTE } from "@/lib/palette";
import { FuseWaves } from "./fuse-waves";

const count = (s: string, sub: string) => s.split(sub).length - 1;
/** Opening tag that starts at `at`. */
const tagAt = (s: string, at: number) => s.slice(at, s.indexOf(">", at) + 1);
/** Source from the element carrying `marker` to the next `</section>`. */
const sectionFrom = (src: string, marker: string) => {
  const at = src.indexOf(marker);
  expect(at, marker).toBeGreaterThan(-1);
  return src.slice(at, src.indexOf("</section>", at));
};

const pageSrc = () => readFileSync(join(process.cwd(), "src/app/[lang]/page.tsx"), "utf8");
/** Tailwind `h-N` step on the FuseWaves tag inside the section carrying `marker`. */
const wavesHeight = (marker: string) => {
  const part = sectionFrom(pageSrc(), marker);
  const tag = tagAt(part, part.indexOf("<FuseWaves"));
  expect(tag, `${marker} h-[...]`).not.toMatch(/(?<![\w:-])h-\[/);
  const h = tag.match(/(?<![\w:-])h-(\d+)\b/);
  expect(h, `${marker} h-*`).not.toBeNull();
  return { tag, h: Number(h![1]) };
};

describe("FuseWaves", () => {
  it('FuseWaves uses preserveAspectRatio="none" so the waves stretch instead of being cropped', () => {
    const root = tagAt(renderToStaticMarkup(createElement(FuseWaves)), 0);
    expect(root).toContain('preserveAspectRatio="none"');
  });

  it("hero waves are h-28 or lower and shorter than the hero bottom padding", () => {
    const src = pageSrc();
    const { tag, h } = wavesHeight('id="mulai-hero"');
    expect(tag).not.toContain("h-[40%]");
    expect(h).toBeLessThanOrEqual(28);
    const heroAt = src.indexOf('id="mulai-hero"');
    const heroTag = src.slice(src.lastIndexOf("<section", heroAt), src.indexOf(">", heroAt) + 1);
    const pb = Number(heroTag.match(/(?<![\w:-])pb-(\d+)\b/)![1]);
    expect(h).toBeLessThan(pb);
  });

  it("CTA waves stay bottom-0 inside an overflow-hidden card and are at most h-24", () => {
    const { tag, h } = wavesHeight('id="mulai"');
    expect(tag).toContain("bottom-0");
    expect(h).toBeLessThanOrEqual(24);
    const cta = sectionFrom(pageSrc(), 'id="mulai"');
    const card = tagAt(cta, cta.lastIndexOf("<div", cta.indexOf("<FuseWaves")));
    expect(card).toContain("overflow-hidden");
    expect(card).toMatch(/(?<![\w:-])rounded-/);
  });

  it("FuseWaves is an aria-hidden layered palette SVG", () => {
    const html = renderToStaticMarkup(createElement(FuseWaves, { className: "x-test" }));
    expect(html.startsWith("<svg")).toBe(true);
    const root = tagAt(html, 0);
    expect(root).toContain('aria-hidden="true"');
    expect(root).toContain('focusable="false"');
    expect(root).not.toContain("slice");
    expect(root).toContain('class="x-test"');
    expect(count(html, "<path")).toBeGreaterThanOrEqual(4);
    const allowed = new Set([...Object.values(PALETTE).map((h) => h.toLowerCase()), "none"]);
    for (const [, attr, value] of html.matchAll(/\s(fill|stroke|stop-color)="([^"]*)"/g))
      expect(allowed.has(value.toLowerCase()) || /^url\(#[^)]+\)$/.test(value), `${attr}="${value}"`).toBe(true);
    for (const s of ["<animate", "<image", "filter", "blur", "<text"]) expect(html, s).not.toContain(s);
  });

  it("page.tsx places FuseWaves in the hero and the closing CTA behind the content", () => {
    const src = readFileSync(join(process.cwd(), "src/app/[lang]/page.tsx"), "utf8");
    expect(src).toMatch(/import \{[^}]*\bFuseWaves\b[^}]*\} from "@\/components\/landing\/fuse-waves";/);

    for (const marker of ['id="mulai-hero"', 'id="mulai"']) {
      const part = sectionFrom(src, marker);
      expect(count(part, "<FuseWaves"), marker).toBe(1);
      const tag = tagAt(part, part.indexOf("<FuseWaves"));
      for (const cls of ["pointer-events-none", "absolute", "bottom-0"]) expect(tag, `${marker} ${cls}`).toContain(cls);
    }

    const heroAt = src.indexOf('id="mulai-hero"');
    const heroTag = src.slice(src.lastIndexOf("<section", heroAt), src.indexOf(">", heroAt) + 1);
    expect(heroTag).toContain("isolate");
    // the hint and gallery label under HeroWall must sit above the waves, not on the deep layer
    const pb = heroTag.match(/(?<![\w:-])pb-(\d+)\b/);
    expect(pb, "hero pb-*").not.toBeNull();
    expect(Number(pb![1]), "hero pb-*").toBeGreaterThanOrEqual(28);
    const hero = sectionFrom(src, 'id="mulai-hero"');
    expect(hero.indexOf("<FuseWaves")).toBeGreaterThan(hero.indexOf("<h1"));
    expect(hero.indexOf("<h1")).toBeGreaterThan(-1);
    expect(tagAt(hero, hero.indexOf("<FuseWaves"))).toContain("-z-10");

    const cta = sectionFrom(src, 'id="mulai"');
    const wavesAt = cta.indexOf("<FuseWaves");
    const h2At = cta.indexOf("<h2");
    expect(wavesAt).toBeLessThan(h2At);
    const wrapAt = cta.indexOf('<div className="relative">');
    expect(wrapAt, "relative wrapper").toBeGreaterThan(wavesAt);
    // pill, h2, p and the buttons all sit inside that one wrapper div
    let depth = 0;
    let end = -1;
    for (const m of cta.slice(wrapAt).matchAll(/<div\b|<\/div>/g)) {
      depth += m[0] === "</div>" ? -1 : 1;
      if (depth === 0) {
        end = wrapAt + m.index + m[0].length;
        break;
      }
    }
    expect(end, "wrapper closes").toBeGreaterThan(wrapAt);
    const wrapped = cta.slice(wrapAt, end);
    for (const s of ['className="clay-pill"', "<h2", "<p ", 'className="clay-btn"', 'className="clay-btn-ghost"']) expect(wrapped, s).toContain(s);
  });
});
