import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ClaySection } from "./clay-section";
import { entranceScene } from "./section-entrance";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const MOTION = "src/components/landing/landing-motion.tsx";

type Scene = (deps: unknown, root: { querySelectorAll(s: string): ArrayLike<unknown> }) => () => void;
const run = entranceScene as unknown as Scene;

function setup(count: number) {
  const els = Array.from({ length: count }, (_, i) => ({ name: `h2-${i}` }));
  const root = { querySelectorAll: vi.fn((s: string) => (s === "[data-entrance]" ? els : [])) };
  const tweens: { kill: ReturnType<typeof vi.fn> }[] = [];
  const gsap = {
    from: vi.fn(() => {
      const t = { kill: vi.fn() };
      tweens.push(t);
      return t;
    }),
    set: vi.fn(),
  };
  return { els, root, gsap, tweens, ScrollTrigger: {} };
}

function sources(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name) && !/\.test\.tsx?$/.test(e.name))
    .map((e) => relative(ROOT, join(e.parentPath, e.name)).replace(/\\/g, "/"))
    .filter((f) => !f.startsWith("src/generated/"));
}

describe("section heading entrance", () => {
  it("entrance animates each section heading once on scroll", () => {
    const { els, root, gsap, ScrollTrigger } = setup(3);
    run({ gsap, ScrollTrigger }, root);
    expect(gsap.from).toHaveBeenCalledTimes(3);
    els.forEach((el, i) => {
      const [target, vars] = gsap.from.mock.calls[i] as unknown as [unknown, Record<string, unknown>];
      expect(target).toBe(el);
      expect(vars).toMatchObject({ opacity: 0, y: 16, duration: 0.4, ease: "power2.out" });
      expect(vars.scrollTrigger).toMatchObject({ trigger: el, start: "top 80%", once: true });
      for (const key of ["pin", "scrub", "snap", "repeat"]) {
        expect(vars, key).not.toHaveProperty(key);
        expect(vars.scrollTrigger, key).not.toHaveProperty(key);
      }
    });
  });

  it("entrance cleanup kills tweens and clears inline styles", () => {
    const { els, root, gsap, tweens, ScrollTrigger } = setup(3);
    const cleanup = run({ gsap, ScrollTrigger }, root);
    cleanup();
    expect(tweens).toHaveLength(3);
    for (const t of tweens) expect(t.kill).toHaveBeenCalledTimes(1);
    for (const el of els) expect(gsap.set).toHaveBeenCalledWith(el, { clearProps: "opacity,transform" });
  });

  it("entrance is a no-op without headings", () => {
    const { root, gsap, ScrollTrigger } = setup(0);
    const cleanup = run({ gsap, ScrollTrigger }, root);
    expect(gsap.from).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
    expect(gsap.set).not.toHaveBeenCalled();
  });

  it("section heading SSR is visible without JavaScript", () => {
    const html = renderToStaticMarkup(createElement(ClaySection, { id: "x", pill: "p", title: "T", children: "c" }));
    const at = html.indexOf("<h2");
    expect(at).toBeGreaterThan(-1);
    const tag = html.slice(at, html.indexOf(">", at) + 1);
    expect(tag).toContain('data-entrance=""');
    for (const s of ["style=", "opacity", "invisible", "hidden"]) expect(tag, s).not.toContain(s);
  });

  it("entrance module is gated and has no runtime imports", () => {
    const src = read("src/components/landing/section-entrance.ts");
    expect(src).not.toContain('"use client"');
    expect(src).not.toMatch(/^\s*import\s+(?!type\b)/m);
    expect(src).not.toMatch(/\bimport\s*\(/);
    expect(src).not.toMatch(/\brequire\s*\(/);

    const files = sources("src");
    const loader = 'import("./section-entrance")';
    expect(files.filter((f) => read(f).includes(loader))).toEqual([MOTION]);
    const motion = read(MOTION);
    const at = motion.indexOf(loader);
    expect(motion.indexOf("shouldLoadLandingMotion(")).toBeGreaterThan(-1);
    expect(motion.indexOf("shouldLoadLandingMotion(")).toBeLessThan(at);
    const all = motion.lastIndexOf("Promise.all([", at);
    expect(all).toBeGreaterThan(-1);
    const group = motion.slice(all, motion.indexOf("])", all) + 2);
    expect(group).toContain('import("gsap")');
    expect(group).toContain(loader);

    const staticImport = /^\s*import\s+(?!type\b)[^;]*from\s*["'][^"']*section-entrance["']/m;
    expect(files.filter((f) => staticImport.test(read(f)))).toEqual([]);
  });

  it("scenes run hero first, then the entrance", () => {
    const motion = read(MOTION);
    const call = motion.indexOf("initLandingScroll(", motion.indexOf("Promise.all(["));
    expect(call).toBeGreaterThan(-1);
    const args = motion.slice(call, motion.indexOf(");", call));
    const hero = args.indexOf("heroTapeScene");
    const entrance = args.indexOf("entranceScene");
    expect(hero).toBeGreaterThan(-1);
    expect(entrance).toBeGreaterThan(hero);
  });
});
