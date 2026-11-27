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
      expect(html, String(t)).toContain('data-category="' + categoryForTemplate(t).id + '"');
      expect(html, String(t)).toContain(fmt(en.dashboard.cardTemplate, { category: categoryName(t) }));
    }
    for (const t of [null, "custom", "zzz"]) expect(categoryForTemplate(t).id).toBe("company");
    expect(card({ template: null })).toContain('data-category="company"');
    expect(categoryForTemplate("e-commerce").id).toBe("ecommerce");
    expect(card({ template: "e-commerce" })).toContain('data-category="ecommerce"');
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
      // R13 §1.6: the round category button is 52px, like the reference's "webcam" (was size-11).
      expect(cat).toContain("size-[3.25rem]");
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
    // R13: the button now hangs 40% out of the bezel instead of sitting inside the screen (was bottom-4 right-4).
    expect(cat).toContain("bottom-0");
    expect(cat).toContain("translate-y-[40%]");
    expect(cat).toMatch(/\bright-/);
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

  it("card background is two-toned, split at 55% of the bezel height", () => {
    const css = readFileSync(join(process.cwd(), "src/components/dashboard/dashboard.css"), "utf8");
    const block = (re: RegExp) => css.match(re)?.[0] ?? "";
    const before = block(/^\.project-card-bezel::before \{[^}]*\}/m);
    expect(before).toContain("55%");
    expect(before).toContain("z-index: -1");
    const light = block(/^\.project-card \{[^}]*\}/m);
    expect(light).toContain("isolation: isolate");
    expect(light).toContain("#B3CFE5");
    expect(light).toContain("#F6FAFD");
    const dark = block(/^\.dark \.project-card \{[^}]*\}/m);
    for (const hex of ["#4A7FA7", "#1A3D63", "#0A1931"]) expect(dark, hex).toContain(hex);
  });

  it("bezel has a lip row of dots inside its bottom edge", () => {
    const html = card();
    const bezel = html.slice(html.indexOf('data-card-part="bezel"'), html.indexOf("border-dotted"));
    expect(count(bezel, 'data-card-part="lip"')).toBe(1);
    expect(bezel.indexOf('data-card-part="lip"')).toBeGreaterThan(bezel.indexOf('data-card-part="screen"'));
    expect(tagWith(bezel, 'data-card-part="lip"')).toContain('aria-hidden="true"');
    const lip = bezel.slice(bezel.indexOf('data-card-part="lip"'));
    expect(count(lip.slice(0, lip.indexOf("</div>")), "data-lip-dot")).toBeGreaterThanOrEqual(16);
    const css = readFileSync(join(process.cwd(), "src/components/dashboard/dashboard.css"), "utf8");
    expect(css).toContain(".project-card-lip");
  });

  it("round category button hangs 40% out of the bezel on a small foot", () => {
    const html = card();
    const cat = tagWith(html, 'data-card-part="category"');
    for (const c of ["size-[3.25rem]", "bottom-0", "translate-y-[40%]", "rounded-full", 'aria-hidden="true"'])
      expect(cat, c).toContain(c);
    const inside = html.slice(html.indexOf('data-card-part="category"'), html.indexOf('data-card-part="category-foot"'));
    expect(html).toContain('data-card-part="category-foot"');
    expect(count(inside, "</span>")).toBe(0);
  });

  it("jarak di bawah bibir bezel cukup untuk kaki tombol", () => {
    // Button foot ends ~28.8px below the bezel; mb-4 + gap-3 is only 28px, so the dotted rule got covered.
    const bezel = tagWith(card(), 'data-card-part="bezel"');
    const mb = bezel.match(/\bmb-(\d+)\b/);
    expect(mb, "bezel mb-*").not.toBeNull();
    expect(Number(mb![1])).toBeGreaterThanOrEqual(5);
  });

  it("title is large on two lines and the gate row bolds the stage name", () => {
    const html = card();
    const h3 = tagWith(html, '<h3 id="project-p1-title"');
    expect(h3).toContain("text-2xl");
    expect(h3).toContain("line-clamp-2");
    const gate = html.slice(html.indexOf('data-card-part="gate"'));
    expect(gate.slice(0, gate.indexOf("</div>"))).toContain(`<strong>${en.stages.development.name}</strong>`);
    expect(tagWith(gate, "<span")).toMatch(/\bsize-11\b[^"]*\brounded-full\b|\brounded-full\b[^"]*\bsize-11\b/);
  });

  it("project-card.tsx imports no ViewTransition, stages, gsap or lenis", () => {
    const src = readFileSync(join(process.cwd(), "src/components/dashboard/project-card.tsx"), "utf8");
    for (const s of ["ViewTransition", '"@/lib/stages"', 'from "gsap', 'from "lenis', '"use client"'])
      expect(src, s).not.toContain(s);
  });
});
