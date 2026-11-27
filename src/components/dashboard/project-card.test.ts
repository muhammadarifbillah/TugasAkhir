import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import type { ProjectCardData } from "@/components/project-list";
import { fmt } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n";
import { categoryForTemplate } from "@/lib/site-categories";
import { ProjectCard } from "./project-card";

const BASE: ProjectCardData = {
  id: "p1",
  name: "Toko Kopi",
  description: "Online shop for a coffee roaster",
  status: "in_progress",
  version: "v1.0",
  stack: "nextjs",
  score: null,
  scoreSource: null,
  scoreStale: false,
  activeStage: "development",
  stageProgress: { completed: 2, total: 5 },
  revisionCount: 0,
  updatedAt: "2026-11-24T08:00:00.000Z",
  scannedAt: null,
  template: null,
};

const card = (overrides: Partial<ProjectCardData> = {}, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    createElement(ProjectCard, {
      project: { ...BASE, ...overrides },
      dict: en as unknown as Dictionary,
      lang: "en",
      revising: false,
      onRevise: () => {},
      ...extra,
    }),
  );
const count = (html: string, s: string) => html.split(s).length - 1;
const categoryName = (t: string | null) =>
  (en.categories.items as Record<string, { name: string }>)[categoryForTemplate(t).id].name;
/** Opening tag of the first element carrying `marker`. */
const tagWith = (html: string, marker: string) => {
  const at = html.indexOf(marker);
  return html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1);
};

describe("ProjectCard", () => {
  it("maps project.template to the category illustration: e-commerce, lms, saas, rest-api, custom, null and unknown", () => {
    for (const t of ["e-commerce", "lms", "saas", "rest-api", "custom", null, "zzz"]) {
      const html = card({ template: t });
      expect(html, String(t)).toContain(`hsl(${categoryForTemplate(t).hue} `);
      expect(html, String(t)).toContain(fmt(en.dashboard.cardTemplate, { category: categoryName(t) }));
    }
    for (const t of [null, "custom", "zzz"]) expect(categoryForTemplate(t).id).toBe("company");
    expect(card({ template: null })).toContain("hsl(45 ");
    expect(categoryForTemplate("e-commerce").id).toBe("ecommerce");
    expect(card({ template: "e-commerce" })).toContain("hsl(340 ");
  });

  it("completed projects keep the studio link and the revise button; others only the studio link", () => {
    const done = card({ status: "completed", activeStage: "handover" });
    expect(done).toContain('href="/en/studio/p1/handover"');
    expect(done).toMatch(new RegExp(`<button[^>]*>[\\s\\S]*?${en.dashboard.revise}</button>`));
    const open = card();
    expect(open).toContain('href="/en/studio/p1/development"');
    expect(open).not.toContain(`>${en.dashboard.revise}`);
    expect(open).not.toContain("<button");
  });

  it("status chip and round category icon sit inside the bezel; the screen is aria-hidden with two SiteArt pages", () => {
    const statuses: [string, string][] = [
      ["completed", en.dashboard.statusCompleted],
      ["in_revision", en.dashboard.statusInRevision],
      ["draft", en.dashboard.statusDraft],
      ["in_progress", en.dashboard.statusInProgress],
    ];
    for (const [status, text] of statuses) {
      const html = card({ status });
      const bezel = html.slice(html.indexOf('data-card-part="bezel"'), html.indexOf("border-dotted"));
      expect(bezel).toContain('data-card-part="status"');
      const statusPart = bezel.slice(bezel.indexOf('data-card-part="status"'));
      expect(statusPart.slice(0, statusPart.indexOf("</span>") + 200)).toContain(text);
      const cat = tagWith(bezel, 'data-card-part="category"');
      expect(cat).toContain('aria-hidden="true"');
      expect(cat).toContain("size-11");
      expect(tagWith(bezel, 'data-card-part="screen"')).toContain('aria-hidden="true"');
      const screen = bezel.slice(bezel.indexOf('data-card-part="screen"'), bezel.indexOf('data-card-part="status"'));
      expect(screen.match(/<svg[^>]*role="img"/g)).toHaveLength(2);
    }
  });

  it("status chip straddles the top edge of the bezel, outside the screen, and the screen gets top room", () => {
    const html = card();
    const chip = tagWith(html, 'data-card-part="status"');
    expect(chip).toContain('data-chip-edge="top"');
    // Centred on the bezel's top edge: half above the frame, half on the bezel padding.
    expect(chip).toMatch(/\btop-0\b/);
    expect(chip).toContain("-translate-y-1/2");
    expect(chip).toMatch(/\bshadow-/);
    expect(chip).not.toMatch(/\btop-4\b/);
    const css = readFileSync(join(process.cwd(), "src/components/dashboard/dashboard.css"), "utf8");
    const bezel = css.slice(css.indexOf(".project-card-bezel {"), css.indexOf("}", css.indexOf(".project-card-bezel {")));
    const top = bezel.match(/padding-top:\s*([\d.]+)rem/);
    expect(top, "bezel padding-top").not.toBeNull();
    // Badge is ~1.375rem tall; its lower half (~0.69rem) must fit in the bezel padding above the screen.
    expect(Number(top![1])).toBeGreaterThanOrEqual(0.875);
    const cat = tagWith(html, 'data-card-part="category"');
    expect(cat).toContain("bottom-4");
    expect(cat).toContain("right-4");
  });

  it("card anatomy: two dotted rules, title h3 labelled by the article, gate row once, compact rail and score", () => {
    const html = card({ score: 91, scoreSource: "scanner", scannedAt: "2026-11-24T08:00:00.000Z" });
    expect(count(html, "border-dotted")).toBe(2);
    expect(tagWith(html, "<article")).toContain('aria-labelledby="project-p1-title"');
    expect(html).toContain('<h3 id="project-p1-title"');
    expect(count(html, fmt(en.dashboard.gateActive, { n: 3 }))).toBe(1);
    expect(count(html, "data-gate-segment")).toBe(5);
    expect(html).toContain(">91<");
  });

  it("renderTitle wraps the title and old badges stay: stack, version, revision count", () => {
    const html = card(
      {},
      { renderTitle: (t: ReactElement) => createElement("span", { "data-morph": "x" }, t) },
    );
    expect(html).toMatch(/<span data-morph="x"><h3 id="project-p1-title"/);
    expect(html).toContain("#nextjs");
    expect(html).toContain(`${en.dashboard.version}: v1.0`);
    expect(html).not.toMatch(/<\/svg>\s*7</);
    expect(card({ revisionCount: 7 })).toMatch(/<\/svg>\s*7</);
  });

  it("action buttons are at least 44px tall and the all-done card shows the done label", () => {
    const done = card({ status: "completed", activeStage: "handover", stageProgress: { completed: 5, total: 5 } });
    expect(tagWith(done, 'href="/en/studio/p1/')).toContain("h-11");
    expect(tagWith(done, "<button")).toContain("h-11");
    expect(done).toContain(en.dashboard.gatesAllDone);
  });

  it("project-card.tsx imports no ViewTransition, stages, gsap or lenis", () => {
    const src = readFileSync(join(process.cwd(), "src/components/dashboard/project-card.tsx"), "utf8");
    for (const s of ["ViewTransition", '"@/lib/stages"', 'from "gsap', 'from "lenis', '"use client"'])
      expect(src, s).not.toContain(s);
  });
});
