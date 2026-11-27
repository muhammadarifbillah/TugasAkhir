import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ClaySection } from "./clay-section";
import { LANDING_MOTION_QUERY } from "./motion";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const css = read("src/app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");

/** The at-rule starting at `start` up to its matching closing brace. */
function blockAt(start: number): string {
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) return css.slice(start, i + 1);
  }
  throw new Error(`unbalanced block at ${start}`);
}

const indicesOf = (s: string) => [...css.matchAll(new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))].map((m) => m.index);
const blocks = (head: string) => indicesOf(head).map((i) => ({ start: i, text: blockAt(i) }));

describe("section heading entrance", () => {
  it("section heading SSR is visible without JavaScript", () => {
    // eslint-disable-next-line react/no-children-prop -- ClaySection types children as a required prop
    const html = renderToStaticMarkup(createElement(ClaySection, { id: "x", pill: "p", title: "T", children: "c" }));
    const at = html.indexOf("<h2");
    expect(at).toBeGreaterThan(-1);
    const tag = html.slice(at, html.indexOf(">", at) + 1);
    expect(tag).toContain('data-entrance=""');
    for (const s of ["style=", "opacity", "invisible", "hidden"]) expect(tag, s).not.toContain(s);
  });

  it("globals.css runs the heading entrance only inside @supports view() and the motion query", () => {
    const [keyframes] = blocks("@keyframes section-entrance");
    expect(keyframes, "@keyframes section-entrance").toBeDefined();
    expect(keyframes.text).toContain("opacity: 0");
    expect(keyframes.text).toContain("translate: 0 16px");

    const supports = blocks("@supports (animation-timeline: view())").find((b) =>
      b.text.includes("@media " + LANDING_MOTION_QUERY),
    );
    expect(supports, "@supports block with the motion query").toBeDefined();
    const media = supports!.text.slice(supports!.text.indexOf("@media " + LANDING_MOTION_QUERY));
    expect(media).toContain("[data-entrance]");
    expect(media).toContain("animation-timeline: view()");
    expect(media).toContain("animation-range: entry 0% entry 40%");

    const outside = css.slice(0, supports!.start) + css.slice(supports!.start + supports!.text.length);
    expect(outside).not.toContain("[data-entrance]");
  });

  it("reduced motion turns off smooth scroll and the entrance", () => {
    const smooth = indicesOf("scroll-behavior: smooth");
    expect(smooth.length).toBeGreaterThan(0);
    const noPref = blocks("@media (prefers-reduced-motion: no-preference) {");
    for (const i of smooth) {
      const owner = noPref.find((b) => i > b.start && i < b.start + b.text.length);
      expect(owner, `scroll-behavior: smooth at ${i}`).toBeDefined();
      expect(owner!.text.slice(0, i - owner!.start)).toMatch(/[{}]\s*#main\s*\{\s*$/);
    }

    const [reduce] = blocks("@media (prefers-reduced-motion: reduce)");
    expect(reduce.text).toContain("scroll-behavior: auto !important");

    const entrance = indicesOf("[data-entrance]");
    expect(entrance.length).toBeGreaterThan(0);
    for (const i of entrance) {
      const at = css.lastIndexOf("@media", i);
      expect(at).toBeGreaterThan(-1);
      expect(at + blockAt(at).length).toBeGreaterThan(i);
      expect(css.slice(at, css.indexOf("{", at))).toContain("prefers-reduced-motion: no-preference");
    }
  });
});
