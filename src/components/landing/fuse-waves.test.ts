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

  // Owner decision 2026-11-27 ("persis herosection.jpeg"): the hero ends in black grass over a water floor, not waves.
  it("the hero is HeroSection and carries no FuseWaves", () => {
    const src = pageSrc();
    expect(src).toContain("<HeroSection");
    const hero = src.slice(src.indexOf("<GalleryProvider"), src.indexOf("</GalleryProvider>"));
    expect(hero).toContain("<HeroSection");
    expect(hero).not.toContain("<FuseWaves");
    const section = readFileSync(join(process.cwd(), "src/components/landing/hero/hero-section.tsx"), "utf8");
    expect(section).not.toContain("FuseWaves");
    expect(section).toContain("<HeroGrass");
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

  it("page.tsx places FuseWaves in the closing CTA behind the content", () => {
    const src = readFileSync(join(process.cwd(), "src/app/[lang]/page.tsx"), "utf8");
    expect(src).toMatch(/import \{[^}]*\bFuseWaves\b[^}]*\} from "@\/components\/landing\/fuse-waves";/);
    // The hero no longer has waves (herosection.jpeg, 2026-11-27): exactly one FuseWaves on the page, in the CTA.
    expect(count(src, "<FuseWaves")).toBe(1);

    const part = sectionFrom(src, 'id="mulai"');
    expect(count(part, "<FuseWaves")).toBe(1);
    const tag = tagAt(part, part.indexOf("<FuseWaves"));
    for (const cls of ["pointer-events-none", "absolute", "bottom-0"]) expect(tag, cls).toContain(cls);

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
