import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { translateAlong } from "@/components/iso/iso-kit";
import { contrastRatio } from "@/lib/contrast";
import { HeroTape } from "../hero-tape";
import { GATE4_STAMP, HERO_FINDINGS, POSTER_POSE, poseOf, type Pose } from "../model";
import { HeroTapeFigure } from "./art";
import { frameAttributes, frameOf, tapeLines } from "./frame";
import { PAINT_ORDER, PARTS } from "./parts";
import { P } from "./view";

const ROOT = process.cwd();
const DIR = join(ROOT, "src/components/landing/hero-tape/figure");

const range = (prefix: string, n: number) => Array.from({ length: n }, (_, i) => `${prefix}-${i + 1}`);
const GROUPS: Record<string, string[]> = {
  base: ["table", ...range("foot", 4), ...range("screw", 4), "label-plate", "ruler"],
  structure: ["post-1", "post-2", "axle-1", "axle-2", "bridge", ...range("bracket", 5), "dust-cover"],
  mechanism: [
    "reel-supply",
    "reel-takeup",
    ...range("guide", 4),
    "capstan",
    "pinch-roller",
    ...range("head", 5),
    ...range("lens", 5),
    "brake",
    "brake-spring",
    ...range("drum", 3),
  ],
  controls: ["tension-knob", "direction-switch", "stamper", ...range("lamp", 5)],
  subject: ["tape", ...range("marker", 3), "stamp-mark"],
};

const render = (pose: Pose) => renderToStaticMarkup(createElement(HeroTapeFigure, { pose }));

/** The opening tag of the element carrying data-part="<id>". */
function tagOf(html: string, id: string): string {
  const at = html.indexOf(`data-part="${id}"`);
  expect(at, id).toBeGreaterThan(-1);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
}

/** The markup inside the element carrying data-part="<id>" (up to the next part). */
function bodyOf(html: string, id: string): string {
  const at = html.indexOf(`data-part="${id}"`);
  const next = html.indexOf("data-part=", at + 10);
  return html.slice(at, next < 0 ? undefined : next);
}

describe("hero tape figure", () => {
  it("PARTS lists the 58 PRD parts by group", () => {
    expect(PARTS.length).toBe(58);
    const ids = PARTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(58);
    expect([...ids].sort()).toEqual(Object.values(GROUPS).flat().sort());
    const counts: Record<string, number> = {};
    for (const p of PARTS) counts[p.group] = (counts[p.group] ?? 0) + 1;
    expect(counts).toEqual({ base: 11, structure: 11, mechanism: 23, controls: 8, subject: 5 });
    for (const [group, list] of Object.entries(GROUPS))
      for (const id of list) expect(PARTS.find((p) => p.id === id)?.group, id).toBe(group);
  });

  it("PAINT_ORDER is a permutation of the part ids", () => {
    expect([...PAINT_ORDER].sort()).toEqual(PARTS.map((p) => p.id).sort());
  });

  it("tape lines come from the model findings", () => {
    const expected = HERO_FINDINGS.map((f) => `${String(f.filePath).slice(String(f.filePath).lastIndexOf("/") + 1)}:${f.line} ${f.ruleId}`);
    expect(tapeLines()).toEqual(expected);
    expect(expected).toEqual(["route.ts:14 sql-injection", "comment.tsx:9 unescaped-html", "package.json:12 outdated-package"]);
    for (const line of tapeLines()) expect(line.length).toBeLessThanOrEqual(34);
  });

  it("frameOf follows the pose at 0, 0.42, poster and 1", () => {
    const start = frameOf(poseOf(0));
    expect(start.lamps).toEqual([false, false, false, false, false]);
    expect(start.brake).toBe("open");
    expect(start.caught).toEqual([false, false, false]);
    expect(start.odometer).toBe("100");
    expect(start.stamp).toBe(false);
    expect(frameOf(poseOf(0.42)).odometer).toBe("096");
    const poster = frameOf(POSTER_POSE);
    expect(poster.lamps).toEqual([true, true, true, true, false]);
    expect(poster.brake).toBe("clamp");
    expect(poster.caught).toEqual([true, true, true]);
    expect(poster.fixed).toBe(false);
    expect(poster.odometer).toBe("091");
    expect(poster.stamp).toBe(true);
    const end = frameOf(poseOf(1));
    expect(end.lamps).toEqual([true, true, true, true, true]);
    expect(end.brake).toBe("open");
    expect(end.fixed).toBe(true);
    expect(end.odometer).toBe("091");
  });

  it("tape transform is the projected tapeX", () => {
    // The tape runs along -y (screen left to right at azimuth 35).
    for (const p of [0, 0.25, 0.5, 1]) expect(frameOf(poseOf(p)).tape).toBe(translateAlong(P, [0, -poseOf(p).tapeX, 0]));
    expect(frameOf(poseOf(0)).tape).not.toBe(frameOf(poseOf(1)).tape);
  });

  it("poster renders 58 parts, aria-hidden, within 40 kB", () => {
    const html = render(POSTER_POSE);
    expect(html.match(/data-part="/g)?.length).toBe(58);
    expect(Buffer.byteLength(html)).toBeLessThanOrEqual(40000);
    const svg = html.slice(html.indexOf("<svg"), html.indexOf(">", html.indexOf("<svg")) + 1);
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).not.toContain('role="img"');
  });

  it("poster shows the tape lines, the stamp and score 91", () => {
    const html = render(POSTER_POSE);
    for (const line of tapeLines()) expect(html).toContain(line);
    expect(html).toContain(GATE4_STAMP);
    expect(html).toContain('data-odometer="091"');
    ["0", "9", "1"].forEach((digit, i) => {
      expect(tagOf(html, `drum-${i + 1}`)).toContain(`data-digit="${digit}"`);
      expect(bodyOf(html, `drum-${i + 1}`)).toContain(`>${digit}</text>`);
    });
  });

  it("poster attributes come from frameAttributes", () => {
    const html = render(POSTER_POSE);
    for (const [id, attrs] of Object.entries(frameAttributes(frameOf(POSTER_POSE)))) {
      const tag = tagOf(html, id);
      for (const [name, value] of Object.entries(attrs)) {
        if (value === undefined) expect(tag, `${id} ${name}`).not.toContain(` ${name}=`);
        else expect(tag, `${id} ${name}`).toContain(` ${name}="${value}"`);
      }
    }
    for (const n of [1, 2, 3, 4]) expect(tagOf(html, `lamp-${n}`)).toContain('data-lit=""');
    expect(tagOf(html, "lamp-5")).not.toContain("data-lit");
    expect(tagOf(html, "brake")).toContain('data-state="clamp"');
    expect(tagOf(html, "stamp-mark")).toContain('opacity="1"');
  });

  it("figure changes with the pose", () => {
    const html = render(poseOf(0.25));
    expect(tagOf(html, "stamp-mark")).toContain('opacity="0"');
    for (const n of [1, 2, 3]) expect(tagOf(html, `lamp-${n}`)).toContain('data-lit=""');
    for (const n of [4, 5]) expect(tagOf(html, `lamp-${n}`)).not.toContain("data-lit");
    expect(tagOf(html, "brake")).toContain('data-state="open"');
    expect(html).not.toBe(render(POSTER_POSE));
  });

  it("render is deterministic and has no backdrop filter", () => {
    const html = render(POSTER_POSE);
    expect(render(POSTER_POSE)).toBe(html);
    expect(html).not.toContain("backdrop");
  });

  it("hero slot carries the figure and stays aria-hidden", () => {
    const id = JSON.parse(readFileSync(join(ROOT, "src/dictionaries/id.json"), "utf8")) as {
      landing: { heroTape: Parameters<typeof HeroTape>[0]["copy"] };
    };
    const html = renderToStaticMarkup(createElement(HeroTape, { copy: id.landing.heroTape }));
    const at = html.indexOf("data-hero-stage");
    expect(at).toBeGreaterThan(-1);
    const open = html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
    expect(open).toContain('aria-hidden="true"');
    expect(html.indexOf('data-part="tape"')).toBeGreaterThan(at);
  });

  it("figure stays server-only and GSAP-free", () => {
    const files = readdirSync(DIR).filter((f) => /\.tsx?$/.test(f) && !f.endsWith(".test.ts"));
    for (const file of files) {
      const text = readFileSync(join(DIR, file), "utf8");
      for (const s of ['"use client"', "IsoFigure", "<Plate", "Stage", "gsap", "lenis"]) expect(text, `${file}: ${s}`).not.toContain(s);
    }
  });

  it("kit edge tone stays visible on both clay themes", () => {
    const css = readFileSync(join(ROOT, "src/components/landing/hero-tape/hero-tape.css"), "utf8");
    const hiIn = (marker: string) => {
      const at = css.indexOf(marker);
      expect(at, marker).toBeGreaterThan(-1);
      const block = css.slice(at, css.indexOf("}", at));
      const match = block.match(/--anatomy-hi:\s*(#[0-9a-fA-F]{6});/);
      expect(match, marker).not.toBeNull();
      return match![1];
    };
    expect(contrastRatio(hiIn(".iso.hero-tape-figure {"), "#0b0d1a")).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(hiIn("html:not(.dark) .iso.hero-tape-figure {"), "#eef0fb")).toBeGreaterThanOrEqual(3);
  });
});
