import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import * as kit from "@/components/iso/react/draw";
import * as server from "./figure/draw-server";
import { applyFrame, frameAttributes, frameOf } from "./figure/frame";
import { PATHS } from "./figure/geometry";
import { HeroTape } from "./hero-tape";
import { setupHeroTape } from "./hero-tape-live";
import { POSTER_POSE, poseOf } from "./model";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const STEPS = ["s0", "s1", "s2", "s3", "s4"];

interface FakeEl {
  attrs: Map<string, string>;
  textContent: string | null;
  setAttribute(k: string, v: string): void;
  removeAttribute(k: string): void;
  getAttribute(k: string): string | null;
  querySelector(sel: string): FakeEl | null;
}

function el(children: Record<string, FakeEl> = {}): FakeEl {
  return {
    attrs: new Map(),
    textContent: null,
    setAttribute(k, v) {
      this.attrs.set(k, v);
    },
    removeAttribute(k) {
      this.attrs.delete(k);
    },
    getAttribute(k) {
      return this.attrs.has(k) ? this.attrs.get(k)! : null;
    },
    querySelector: (sel) => children[sel] ?? null,
  };
}

function makeRoot() {
  const posterAttrs = frameAttributes(frameOf(POSTER_POSE));
  const els: Record<string, FakeEl> = {};
  const texts: FakeEl[] = [];
  for (const [id, attrs] of Object.entries(posterAttrs)) {
    let node: FakeEl;
    if (id.startsWith("drum-")) {
      const text = el();
      text.textContent = String(POSTER_POSE.odometer).padStart(3, "0")[Number(id.slice(5)) - 1]!;
      texts.push(text);
      node = el({ text });
    } else node = el();
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined) node.setAttribute(k, v);
    els[`[data-part="${id}"]`] = node;
  }
  const tapeRun = el();
  const odometer = el();
  const caption = el();
  caption.setAttribute("data-steps", JSON.stringify(STEPS));
  caption.textContent = STEPS[POSTER_POSE.step]!;
  const all: Record<string, FakeEl> = { ...els, '[data-group="tape-run"]': tapeRun, "[data-odometer]": odometer };
  const stage = el(all);
  stage.setAttribute("data-pose", "poster");
  const pin = el();
  const root = el({ ...all, "[data-hero-pin]": pin, "[data-hero-stage]": stage, "[data-hero-step]": caption });
  const part = (id: string) => els[`[data-part="${id}"]`]!;
  const digits = () => texts.map((t) => t.textContent);
  return { root, stage, pin, caption, tapeRun, odometer, part, digits };
}

function makeGsap() {
  const gsap = { to: vi.fn((target: { p: number }, vars: Record<string, unknown>) => ({ kill: vi.fn(), target, vars })) };
  return { gsap, ScrollTrigger: {} };
}

type Deps = Parameters<typeof setupHeroTape>[0];
type Root = Parameters<typeof setupHeroTape>[1];

function setup() {
  const dom = makeRoot();
  const deps = makeGsap();
  const cleanup = setupHeroTape(deps as unknown as Deps, dom.root as unknown as Root);
  const tween = deps.gsap.to.mock.results[0]?.value as {
    kill: ReturnType<typeof vi.fn>;
    target: { p: number };
    vars: { onUpdate: () => void; scrollTrigger: Record<string, () => void> } & Record<string, unknown>;
  };
  return { ...dom, ...deps, cleanup, tween };
}

describe("hero-tape-live", () => {
  it("applyFrame writes the pose attributes onto the poster", () => {
    const { root, part, tapeRun, odometer } = makeRoot();
    const frame = frameOf(poseOf(0));
    applyFrame(root, frame);
    for (let i = 1; i <= 5; i++) expect(part(`lamp-${i}`).getAttribute("data-lit")).toBeNull();
    expect(part("brake").getAttribute("data-state")).toBe("open");
    expect(part("stamp-mark").getAttribute("opacity")).toBe("0");
    expect(tapeRun.getAttribute("transform")).toBe(frame.tape);
    expect(odometer.getAttribute("data-odometer")).toBe("100");
    const drums = [1, 2, 3].map((n) => part(`drum-${n}`));
    expect(drums.map((d) => d.querySelector("text")!.textContent)).toEqual(["1", "0", "0"]);
    expect(drums.map((d) => d.getAttribute("data-digit"))).toEqual(["1", "0", "0"]);
  });

  it("applyFrame at 50% matches frameAttributes exactly", () => {
    const { root, part, digits } = makeRoot();
    applyFrame(root, frameOf(poseOf(0)));
    const frame = frameOf(poseOf(0.5));
    applyFrame(root, frame);
    for (const [id, attrs] of Object.entries(frameAttributes(frame)))
      for (const [k, v] of Object.entries(attrs)) expect(part(id).getAttribute(k)).toBe(v === undefined ? null : v);
    expect(digits()).toEqual(["0", "9", "1"]);
  });

  it("setupHeroTape pins the stage and scrubs one tween", () => {
    const { gsap, tween, pin } = setup();
    expect(gsap.to).toHaveBeenCalledTimes(1);
    expect(tween.target).toEqual({ p: 0 });
    expect(tween.vars.p).toBe(1);
    expect(tween.vars.ease).toBe("none");
    const st = tween.vars.scrollTrigger;
    expect(st).toMatchObject({ trigger: pin, pin: true, scrub: 0.6, start: "center center", end: "+=1600" });
    expect(st).not.toHaveProperty("snap");
    expect(st).not.toHaveProperty("scroller");
  });

  it("scroll progress drives the pose forward and back", () => {
    const { tween, digits, part, caption } = setup();
    tween.target.p = 0.5;
    tween.vars.onUpdate();
    expect(digits()).toEqual(["0", "9", "1"]);
    expect(part("brake").getAttribute("data-state")).toBe("clamp");
    expect(caption.textContent).toBe("s2");
    tween.target.p = 0;
    tween.vars.onUpdate();
    expect(digits()).toEqual(["1", "0", "0"]);
    expect(part("brake").getAttribute("data-state")).toBe("open");
    expect(caption.textContent).toBe("s0");
  });

  it("scene states follow the pin lifecycle", () => {
    const { tween, stage, digits } = setup();
    expect(stage.getAttribute("data-pose")).toBe("idle");
    expect(digits()).toEqual(["1", "0", "0"]);
    const st = tween.vars.scrollTrigger;
    st.onEnter();
    expect(stage.getAttribute("data-pose")).toBe("scrub");
    st.onLeave();
    expect(stage.getAttribute("data-pose")).toBe("done");
    st.onEnterBack();
    expect(stage.getAttribute("data-pose")).toBe("scrub");
    st.onLeaveBack();
    expect(stage.getAttribute("data-pose")).toBe("idle");
  });

  it("cleanup kills the tween and restores the poster", () => {
    const { tween, cleanup, stage, part, digits, caption } = setup();
    tween.target.p = 1;
    tween.vars.onUpdate();
    cleanup();
    expect(tween.kill).toHaveBeenCalledTimes(1);
    expect(stage.getAttribute("data-pose")).toBe("poster");
    for (const [id, attrs] of Object.entries(frameAttributes(frameOf(POSTER_POSE))))
      for (const [k, v] of Object.entries(attrs)) expect(part(id).getAttribute(k)).toBe(v === undefined ? null : v);
    expect(part("stamp-mark").getAttribute("opacity")).toBe("1");
    expect(part("lamp-4").getAttribute("data-lit")).toBe("");
    expect(digits()).toEqual(["0", "9", "1"]);
    expect(caption.textContent).toBe(STEPS[POSTER_POSE.step]);
  });

  it("setupHeroTape is a no-op without the pin element", () => {
    const deps = makeGsap();
    const cleanup = setupHeroTape(deps as unknown as Deps, { querySelector: () => null } as unknown as Root);
    expect(deps.gsap.to).not.toHaveBeenCalled();
    expect(() => cleanup()).not.toThrow();
  });

  it("hero markup carries the pin wrapper and step data", () => {
    const id = JSON.parse(read("src/dictionaries/id.json")) as { landing: { heroTape: unknown } };
    const html = renderToStaticMarkup(
      createElement(HeroTape, { copy: id.landing.heroTape as Parameters<typeof HeroTape>[0]["copy"] }),
    );
    const pinAt = html.indexOf("data-hero-pin");
    expect(pinAt).toBeGreaterThan(-1);
    const stageTag = html.match(/<div[^>]*data-hero-stage=""[^>]*>/)?.[0] ?? "";
    expect(stageTag).toContain('data-pose="poster"');
    expect(stageTag).toContain('aria-hidden="true"');
    // End of the pin wrapper: the </div> that balances its opening <div.
    const open = html.lastIndexOf("<div", pinAt);
    const tags = /<div\b|<\/div>/g;
    tags.lastIndex = open;
    let depth = 0;
    let pinEnd = -1;
    for (let m = tags.exec(html); m; m = tags.exec(html)) {
      depth += m[0] === "</div>" ? -1 : 1;
      if (depth === 0) {
        pinEnd = m.index;
        break;
      }
    }
    const stageAt = html.indexOf(stageTag);
    const tableAt = html.indexOf("<table");
    expect(stageAt).toBeGreaterThan(pinAt);
    expect(stageAt).toBeLessThan(pinEnd);
    expect(tableAt).toBeGreaterThan(pinEnd);
    const caption = html.match(/<p[^>]*data-hero-step=""[^>]*>/)?.[0] ?? "";
    const raw = caption.match(/data-steps="([^"]*)"/)?.[1] ?? "";
    const unescaped = raw
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
    const steps = JSON.parse(unescaped) as string[];
    expect(steps).toHaveLength(5);
    expect(steps[2]).toBe("Semgrep dan Trivy menemukan 2 medium dan 1 low.");
    expect(html.indexOf(caption)).toBeLessThan(pinEnd);
  });

  const walk = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
    );
  const sources = (dir: string) =>
    walk(join(ROOT, dir)).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f));

  it("live module is only loaded dynamically, after the gate", () => {
    const files = sources("src");
    const staticImport = /^\s*import\s+(?!type\b)[^;]*from\s*["'][^"']*hero-tape-live["']/m;
    expect(files.filter((f) => staticImport.test(readFileSync(f, "utf8")))).toEqual([]);
    const loader = 'import("./hero-tape/hero-tape-live")';
    const loaders = files.filter((f) => readFileSync(f, "utf8").includes(loader));
    expect(loaders.map((f) => relative(ROOT, f).replace(/\\/g, "/"))).toEqual([
      "src/components/landing/landing-motion.tsx",
    ]);
    const src = read("src/components/landing/landing-motion.tsx");
    const at = src.indexOf(loader);
    expect(src.indexOf("shouldLoadLandingMotion(")).toBeLessThan(at);
    const all = src.lastIndexOf("Promise.all([", at);
    expect(all).toBeGreaterThan(-1);
    const group = src.slice(all, src.indexOf("])", all));
    expect(group).toContain('import("gsap")');
    expect(group).toContain(loader);
  });

  it("hero-tape-live has no React and no static gsap", () => {
    const src = read("src/components/landing/hero-tape/hero-tape-live.ts");
    expect(src).not.toContain('"use client"');
    expect(src).not.toContain('from "react"');
    expect(src).not.toMatch(/^\s*import\s+(?!type\b)[^;]*from\s*["'](gsap|lenis)[^"']*["']/m);
  });

  it("figure no longer imports the client kit module", () => {
    const files = sources("src/components/landing/hero-tape");
    const offenders = files.filter((f) => /iso\/react\/(draw|live)/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
    expect(read("src/components/landing/hero-tape/figure/art.tsx")).toContain("./draw-server");
  });

  it("draw-server renders the same markup as the kit", () => {
    const tree = (m: typeof kit | typeof server) =>
      renderToStaticMarkup(
        createElement(
          "g",
          null,
          createElement(m.Solid, { paths: PATHS["head-1"]!, tone: "hi", crease: "none" }),
          createElement(m.Line, { d: "M0 0 10 10", free: true }),
          createElement(m.FaceText, { transform: "matrix(1 0 0 1 0 0)", size: 4 }, "091"),
        ),
      );
    expect(tree(server)).toBe(tree(kit));
  });
});
