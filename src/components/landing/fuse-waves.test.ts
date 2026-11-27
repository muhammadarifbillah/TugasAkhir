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

describe("FuseWaves", () => {
  it("FuseWaves is an aria-hidden layered palette SVG", () => {
    const html = renderToStaticMarkup(createElement(FuseWaves, { className: "x-test" }));
    expect(html.startsWith("<svg")).toBe(true);
    const root = tagAt(html, 0);
    expect(root).toContain('aria-hidden="true"');
    expect(root).toContain('focusable="false"');
    expect(root).toMatch(/preserveAspectRatio="[^"]* slice"/);
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
