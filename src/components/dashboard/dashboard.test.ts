import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { fmt } from "@/lib/format";
import { scoreColorClass } from "@/lib/project-stats";
import { dashboardStats, scoreSourceText } from "@/lib/dashboard-view";
import type { Dictionary } from "@/lib/i18n";
import { DashboardEmpty } from "./dashboard-empty";
import { DashboardStats } from "./dashboard-stats";
import { GateRail } from "./gate-rail";
import { ScoreBlock } from "./score-block";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");
const NAMES = ["Analysis", "Design", "Development", "Testing", "Handover"];
const RAIL_LABELS = { gates: en.dashboard.gatesLabel, gateActive: en.dashboard.gateActive, allDone: en.dashboard.gatesAllDone };
const NEW_KEYS = [
  "statAvgScore",
  "statAvgScoreHint",
  "statNoScans",
  "gatesLabel",
  "gateNumber",
  "gateActive",
  "gatesAllDone",
  "gateFilter",
  "gateFilterAll",
  "scoreLabel",
  "scoreGood",
  "scoreFair",
  "scorePoor",
  "scoreScanner",
  "scoreScannerNoDate",
  "scoreAi",
  "scoreNone",
  "scoreStale",
  "searchHint",
  "emptyTitle",
  "emptyLede",
  "cardTemplate",
  "statsTitle",
];
const FORBIDDEN = /bersertifikat|patuh standar|100% aman|terjamin|diperkeras|certified|compliant|hardened|guaranteed/i;

const rail = (activeStage: string, completed: number) =>
  renderToStaticMarkup(
    createElement(GateRail, { activeStage, stageProgress: { completed, total: 5 }, stageNames: NAMES, labels: RAIL_LABELS }),
  );
const textOf = (html: string) => html.replace(/<[^>]*>/g, " ");

describe("dashboard components", () => {
  it("GateRail renders five segments in --stage-1..5 order with one bordered active segment", () => {
    const segments = rail("development", 2).match(/<span[^>]*data-gate-segment[^>]*>/g) ?? [];
    expect(segments).toHaveLength(5);
    expect(segments.map((s) => s.match(/data-state="(\w+)"/)?.[1])).toEqual(["done", "done", "active", "pending", "pending"]);
    segments.forEach((s, i) => {
      if (s.includes('data-state="pending"')) expect(s).toContain("bg-muted");
      else expect(s).toContain(`var(--stage-${i + 1})`);
    });
    expect(segments[0]).toContain("background:var(--stage-1)");
    expect(segments[1]).toContain("background:var(--stage-2)");
    expect(segments[2]).toContain("border-2");
    expect(segments[2]).toContain("bg-transparent");
    expect(segments.filter((s) => s.includes("border-2"))).toHaveLength(1);
  });

  it("GateRail shows the hallmark and text label of the active gate, and the all-done label when finished", () => {
    const html = rail("development", 2);
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*style="color:var\(--stage-3\)"/);
    expect(html).toContain(fmt(en.dashboard.gateActive, { n: 3 }));
    expect(html).toContain(NAMES[2]);
    const done = rail("handover", 5);
    expect(done).toContain(en.dashboard.gatesAllDone);
    expect(done).toMatch(/<svg[^>]*aria-hidden="true"[^>]*style="color:var\(--stage-5\)"/);
  });

  it('ScoreBlock shows the number with a band text label and the source line, or a dash and "not scanned"', () => {
    const p = { score: 91, scoreSource: "scanner" as const, scannedAt: "2026-11-24T08:00:00.000Z", scoreStale: false };
    const html = renderToStaticMarkup(createElement(ScoreBlock, { ...p, labels: en.dashboard }));
    expect(html).toContain(">91<");
    expect(html).toContain(en.dashboard.scoreGood);
    expect(html).toContain(scoreColorClass(91));
    const copy = {
      scanner: en.dashboard.scoreScanner,
      scannerNoDate: en.dashboard.scoreScannerNoDate,
      ai: en.dashboard.scoreAi,
      none: en.dashboard.scoreNone,
      stale: en.dashboard.scoreStale,
    };
    expect(html).toContain(scoreSourceText(p, copy));
    const none = renderToStaticMarkup(
      createElement(ScoreBlock, { score: null, scoreSource: null, scannedAt: null, scoreStale: false, labels: en.dashboard }),
    );
    expect(none).toContain("—");
    expect(none).toContain(en.dashboard.scoreNone);
    for (const band of [en.dashboard.scoreGood, en.dashboard.scoreFair, en.dashboard.scorePoor]) expect(none).not.toContain(band);
  });

  const empty = () => renderToStaticMarkup(createElement(DashboardEmpty, { dict: en, lang: "en" }));

  const COLLAGE = /<div class="dashboard-collage"[^>]*>(?:[\s\S]*?<\/svg>){3}<\/div>/;

  it("DashboardEmpty renders an aria-hidden collage of three SiteArt pages and no hero-tape hooks", () => {
    const html = empty();
    const at = html.indexOf('class="dashboard-collage"');
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1)).toContain('aria-hidden="true"');
    const collage = html.match(COLLAGE)?.[0] ?? "";
    expect(collage.match(/<svg/g)).toHaveLength(3);
    for (const hook of ["hero-tape", "dashboard-poster", "data-hero-stage", "data-pose", "iso-face"]) expect(html).not.toContain(hook);
  });

  it("DashboardEmpty shows three steps and no digits outside the aria-hidden collage", () => {
    const html = empty();
    const stripped = html.replace(COLLAGE, "");
    expect(stripped).not.toContain("dashboard-collage");
    expect(textOf(stripped)).not.toMatch(/\d/);
    const ol = stripped.slice(stripped.indexOf("<ol"), stripped.indexOf("</ol>"));
    expect(ol.match(/<li/g)).toHaveLength(3);
    expect(ol).toContain("list-decimal");
  });

  it("ProjectList keeps its three props and the project-title morph name", () => {
    const src = read("src/components/project-list.tsx");
    expect(src).toMatch(/export function ProjectList\(\{\s*projects,\s*dict,\s*lang,\s*\}/);
    expect(src).toContain("name={`project-title-${p.id}`} share=\"morph\"");
    const iface = src.slice(src.indexOf("export interface ProjectCardData"), src.indexOf("\n}", src.indexOf("export interface ProjectCardData")));
    for (const field of [
      "id",
      "name",
      "description",
      "status",
      "version",
      "stack",
      "score",
      "scoreSource",
      "scoreStale",
      "activeStage",
      "stageProgress",
      "revisionCount",
      "updatedAt",
      "template",
    ])
      expect(iface).toMatch(new RegExp(`\\n\\s*${field}:`));
    for (const s of ["<ProjectCard", "--card-index", "project-card-enter", "h-11 md:h-8", "grid gap-4 md:grid-cols-2 xl:grid-cols-3"])
      expect(src, s).toContain(s);
    const mdiv = src.slice(src.indexOf("<m.div"), src.indexOf(">", src.indexOf("transition={{ duration")));
    expect(mdiv).toContain("layout");
    expect(mdiv).toContain("exit={{ opacity: 0, scale: 0.97 }}");
    expect(mdiv).not.toContain("initial={{");
    expect(mdiv).not.toContain("animate={{");
  });

  it("dashboard page passes the project template to the cards", () => {
    const src = read("src/app/[lang]/dashboard/page.tsx");
    expect(src).toContain("template: p.template");
    expect(src).toContain("dashboard-surface");
  });

  it("dashboard sources import no gsap, lenis or @/lib/stages and use no backdrop", () => {
    const dashDir = "src/components/dashboard";
    const pageDir = "src/app/[lang]/dashboard";
    const files = [
      ...readdirSync(join(ROOT, dashDir))
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => `${dashDir}/${f}`),
      `${dashDir}/dashboard.css`,
      "src/components/project-list.tsx",
      ...readdirSync(join(ROOT, pageDir))
        .filter((f) => f.endsWith(".tsx"))
        .map((f) => `${pageDir}/${f}`),
      "src/lib/dashboard-view.ts",
    ];
    for (const f of files) {
      const text = read(f);
      for (const s of ['from "gsap', 'from "lenis', '"@/lib/stages"', "backdrop-", "hero-tape", "@/components/iso"])
        expect(text, `${f}: ${s}`).not.toContain(s);
    }
    expect(files).toContain(`${dashDir}/project-card.tsx`);
    for (const f of ["dashboard-empty.tsx", "dashboard-stats.tsx", "gate-rail.tsx", "score-block.tsx", "project-card.tsx"])
      expect(read(`${dashDir}/${f}`), f).not.toContain('"use client"');
  });

  it("dashboard.css animates cards only with hover and turns motion off for reduced motion", () => {
    const css = read("src/components/dashboard/dashboard.css");
    const block = (marker: string) => {
      const at = css.indexOf(marker);
      expect(at, marker).toBeGreaterThan(-1);
      let depth = 0;
      for (let i = css.indexOf("{", at); i < css.length; i++) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}" && --depth === 0) return css.slice(at, i + 1);
      }
      return css.slice(at);
    };
    const hover = block("@media (hover: hover)");
    expect(hover).toContain(".project-card-art");
    expect(hover).toContain("translateY(-50%)");
    const reduced = block("@media (prefers-reduced-motion: reduce)");
    for (const s of [".project-card-art", ".project-card-enter", "animation: none", "transform: none"]) expect(reduced, s).toContain(s);
    expect(css).not.toContain(".dashboard-poster");
  });

  const STATS_FIXTURE: { status: string; score: number | null; scoreSource: string | null }[] = [
    { status: "in_progress", score: 80, scoreSource: "scanner" },
    { status: "draft", score: 70, scoreSource: "ai" },
    { status: "completed", score: 91, scoreSource: "scanner" },
    { status: "in_revision", score: null, scoreSource: null },
  ];
  const stats = (cards: typeof STATS_FIXTURE) =>
    renderToStaticMarkup(createElement(DashboardStats, { cards, dict: en as unknown as Dictionary }));
  const statCard = (html: string, key: string) => {
    const at = html.indexOf(`data-stat="${key}"`);
    const next = html.indexOf("data-stat=", at + 1);
    return html.slice(at, next === -1 ? undefined : next);
  };

  it("DashboardStats renders four SaaS stat cards with the dashboardStats numbers", () => {
    const html = stats(STATS_FIXTURE);
    const s = dashboardStats(STATS_FIXTURE);
    expect([s.inProgress, s.completed, s.inRevision, s.avgScanScore]).toEqual([2, 1, 1, 86]);
    const expected: [string, number][] = [
      ["inProgress", 2],
      ["completed", 1],
      ["inRevision", 1],
      ["avgScore", 86],
    ];
    for (const [key, n] of expected) expect(statCard(html, key), key).toMatch(new RegExp(`>${n}<`));
    expect(html.match(/<span[^>]*class="[^"]*size-11 rounded-full[^"]*"[^>]*>/g)?.filter((t) => t.includes('aria-hidden="true"'))).toHaveLength(4);
    expect(html).toMatch(new RegExp(`<h2[^>]*class="sr-only"[^>]*>${en.dashboard.statsTitle}</h2>`));
    const none = statCard(stats(STATS_FIXTURE.map((c) => ({ ...c, scoreSource: null }))), "avgScore");
    expect(none).toContain("—");
    expect(none).toContain(en.dashboard.statNoScans);
  });

  it("compact GateRail drops its label row but keeps five segments; compact ScoreBlock keeps number, band and source without the box", () => {
    const html = renderToStaticMarkup(
      createElement(GateRail, { activeStage: "development", stageProgress: { completed: 2, total: 5 }, stageNames: NAMES, labels: RAIL_LABELS, compact: true }),
    );
    expect(html.match(/data-gate-segment/g)).toHaveLength(5);
    expect(html).not.toContain(fmt(en.dashboard.gateActive, { n: 3 }));
    expect(html).not.toContain("<p");
    expect(html).toMatch(new RegExp(`<span class="sr-only">${en.dashboard.gatesLabel}</span>`));
    const p = { score: 91, scoreSource: "scanner" as const, scannedAt: "2026-11-24T08:00:00.000Z", scoreStale: false };
    const score = renderToStaticMarkup(createElement(ScoreBlock, { ...p, labels: en.dashboard, compact: true }));
    expect(score).toContain(">91<");
    expect(score).toContain(en.dashboard.scoreGood);
    expect(score).toContain("text-xl");
    expect(score).not.toContain("text-3xl");
    expect(score).not.toContain("rounded-lg border");
    expect(score).toContain(fmt(en.dashboard.scoreScanner, { date: "2026-11-24" }));
  });

  it("en and id dashboard namespaces have identical keys and no forbidden phrases in the new keys", () => {
    expect(Object.keys(en.dashboard).sort()).toEqual(Object.keys(id.dashboard).sort());
    for (const dict of [en.dashboard, id.dashboard] as Record<string, unknown>[]) {
      for (const k of NEW_KEYS) {
        expect(typeof dict[k], k).toBe("string");
        expect(dict[k] as string, k).not.toMatch(FORBIDDEN);
      }
    }
  });
});
