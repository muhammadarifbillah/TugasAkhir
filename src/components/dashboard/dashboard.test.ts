import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { fmt } from "@/lib/format";
import { scoreColorClass } from "@/lib/project-stats";
import { scoreSourceText } from "@/lib/dashboard-view";
import { DashboardEmpty } from "./dashboard-empty";
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

  it("DashboardEmpty renders the poster svg inside an aria-hidden wrapper without data-hero-stage", () => {
    const html = empty();
    const at = html.indexOf('class="dashboard-poster iso hero-tape-figure"');
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(html.lastIndexOf("<", at), html.indexOf(">", at) + 1)).toContain('aria-hidden="true"');
    expect(html.indexOf("<svg", at)).toBeGreaterThan(at);
    for (const hook of ["data-hero-stage", "data-pose", "hero-tape-stage"]) expect(html).not.toContain(hook);
  });

  it("DashboardEmpty shows three steps and no digits outside the aria-hidden poster", () => {
    const html = empty();
    const stripped = html.replace(/<div class="dashboard-poster[^"]*"[^>]*>[\s\S]*?<\/svg><\/div>/, "");
    expect(stripped).not.toContain("dashboard-poster");
    expect(textOf(stripped)).not.toMatch(/\d/);
    const ol = stripped.slice(stripped.indexOf("<ol"), stripped.indexOf("</ol>"));
    expect(ol.match(/<li/g)).toHaveLength(3);
    expect(ol).toContain("list-decimal");
  });

  it("ProjectList keeps its three props and the project-title morph name", () => {
    const src = read("src/components/project-list.tsx");
    expect(src).toMatch(/export function ProjectList\(\{\s*projects,\s*dict,\s*lang,\s*\}/);
    expect(src).toContain("name={`project-title-${p.id}`} share=\"morph\"");
    const iface = src.slice(src.indexOf("export interface ProjectCardData"), src.indexOf("}", src.indexOf("export interface ProjectCardData")));
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
    ])
      expect(iface).toMatch(new RegExp(`\\n\\s*${field}:`));
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
      for (const s of ['from "gsap', 'from "lenis', '"@/lib/stages"', "backdrop-"]) expect(text, `${f}: ${s}`).not.toContain(s);
    }
    for (const f of ["dashboard-empty.tsx", "dashboard-stats.tsx", "gate-rail.tsx", "score-block.tsx"])
      expect(read(`${dashDir}/${f}`), f).not.toContain('"use client"');
  });

  it("dashboard.css hides figure text inside .dashboard-poster", () => {
    const css = read("src/components/dashboard/dashboard.css");
    const at = css.indexOf(".dashboard-poster .iso-face-text");
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at))).toMatch(/visibility:\s*hidden/);
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
