import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { GATE_MAPPING, gateFacts } from "@/lib/landing-facts";
import { GateLoop } from "./gate-loop";
import { loopLayout } from "./loop-geometry";

type Json = Record<string, unknown>;
type Props = Parameters<typeof GateLoop>[0];
type Dict = {
  landing: Json & { steps: { title: string; why: string; artifact: string }[]; mapNist: string; mapIso: string; mapArtifact: string };
  stages: Record<string, { name: string; steps: Record<string, { label: string }> }>;
};

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const DICTS = {
  id: JSON.parse(read("src/dictionaries/id.json")) as Dict,
  en: JSON.parse(read("src/dictionaries/en.json")) as Dict,
};
const LANGS = ["id", "en"] as const;
const FORBIDDEN = ["certified", "compliant", "certification", "bersertifikat", "sertifikasi resmi", "patuh", "aman 100%", "100% aman", "100% secure", "guaranteed", "terjamin", "dijamin"];

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");

const loopOf = (lang: "id" | "en") => (DICTS[lang].landing.loop ?? {}) as Record<string, string>;
const labelsOf = (lang: "id" | "en") =>
  ({ ...loopOf(lang), nist: DICTS[lang].landing.mapNist, iso: DICTS[lang].landing.mapIso, artifact: DICTS[lang].landing.mapArtifact }) as unknown as Props["labels"];

function propsOf(lang: "id" | "en"): Props {
  const d = DICTS[lang];
  const label = (code: string, id: string) => d.stages[code]?.steps?.[id]?.label ?? id;
  const facts = gateFacts();
  const gates = facts.map((g, i) => ({
    code: g.code,
    title: d.landing.steps[i].title,
    why: d.landing.steps[i].why,
    artifact: d.landing.steps[i].artifact,
    nist: [GATE_MAPPING[i].nist],
    iso: [...GATE_MAPPING[i].iso],
    steps: g.steps.map((s) => ({ label: label(g.code, s.id), nist: s.nist, iso: s.iso })),
  }));
  const matrix = gates.flatMap((g) => g.steps.map((s) => ({ gate: g.title, subStep: s.label, nist: s.nist, iso: s.iso })));
  return { gates, labels: labelsOf(lang), matrix };
}

const render = (lang: "id" | "en") => renderToStaticMarkup(createElement(GateLoop, propsOf(lang)));

/** Number pairs (x y) of an SVG path d string. */
function points(d: string): { x: number; y: number }[] {
  const nums = (d.match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) out.push({ x: nums[i], y: nums[i + 1] });
  return out;
}

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Json).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("gate loop geometry", () => {
  it("loopLayout places five stations left to right and alternates rows", () => {
    const { stations } = loopLayout(5);
    expect(stations).toHaveLength(5);
    for (let i = 1; i < 5; i++) expect(stations[i].x).toBeGreaterThan(stations[i - 1].x);
    expect(stations[0].x).toBe(90);
    expect(stations[4].x).toBe(910);
    expect(stations.map((s) => s.y)).toEqual([110, 230, 110, 230, 110]);
  });

  it("forward path runs through every station and the back path returns below to station 1", () => {
    const { forward, back, stations } = loopLayout(5);
    const last = stations[4];
    expect(forward.startsWith("M90 110")).toBe(true);
    expect(forward.trim().endsWith(`${last.x} ${last.y}`)).toBe(true);
    expect(forward.match(/C/g)).toHaveLength(4);
    expect(back.startsWith(`M${last.x} ${last.y}`)).toBe(true);
    expect(back.trim().endsWith("90 110")).toBe(true);
    expect(back).toContain("470");
    for (const d of [forward, back])
      for (const p of points(d)) {
        expect(p.y).toBeLessThanOrEqual(470);
        expect(p.y).toBeGreaterThanOrEqual(0);
      }
  });

  it("arrows point forward along the path and back along the return", () => {
    const { arrows } = loopLayout(5);
    const fwd = arrows.filter((a) => a.dir === "forward");
    const back = arrows.filter((a) => a.dir === "back");
    expect(fwd).toHaveLength(4);
    for (const a of fwd) {
      expect(a.angle).toBeGreaterThan(-90);
      expect(a.angle).toBeLessThan(90);
    }
    expect(back).toHaveLength(1);
    expect(back[0].angle).toBe(180);
    expect(back[0].y).toBe(470);
  });
});

describe("gate loop", () => {
  it("GateLoop renders five gate stations as buttons in both layouts", () => {
    const html = render("id");
    const { gates, labels } = propsOf("id");
    expect(html.match(/data-loop-station=/g)).toHaveLength(5);
    expect(html.match(/data-loop-station-m=/g)).toHaveLength(5);
    const tags = [...html.matchAll(/<button[^>]*data-loop-station(-m)?=[^>]*>/g)].map((m) => m[0]);
    expect(tags).toHaveLength(10);
    tags.forEach((tag, k) => {
      const i = k % 5;
      expect(tag).toContain('type="button"');
      expect(tag).toContain(`aria-label="${escape(fmt(labels.stationLabel, { n: i + 1, title: gates[i].title }))}"`);
    });
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(2);
    const pressed = tags.filter((t) => t.includes('aria-pressed="true"'));
    for (const t of pressed) expect(t).toMatch(/data-loop-station(-m)?="0"/);
  });

  it("sub-step counts are 5, 6, 6, 4, 5 and total 26", () => {
    const counts = gateFacts().map((g) => g.steps.length);
    expect(counts).toEqual([5, 6, 6, 4, 5]);
    const html = render("id");
    const labels = labelsOf("id");
    for (const count of counts) expect(html).toContain(escape(fmt(labels.substeps, { count })));
    expect(html).toContain(escape(fmt(labels.total, { count: 26 })));
  });

  it("the return path is labelled as a revision back to Analysis", () => {
    for (const lang of LANGS) {
      const html = render(lang);
      const loop = loopOf(lang);
      expect(html).toContain("data-loop-return");
      expect(html).toContain(escape(loop.returnLabel));
      expect(html).toContain(escape(loop.returnNote));
    }
    expect(loopOf("id").returnLabel).toContain("Analisis");
    expect(loopOf("en").returnLabel).toContain("Analysis");
  });

  it("the detail panel shows gate 1 controls, its sub-steps and the CSV download", () => {
    const d = DICTS.id;
    const html = render("id");
    expect(html).toContain(GATE_MAPPING[0].nist);
    for (const iso of GATE_MAPPING[0].iso) expect(html).toContain(iso);
    expect(html).toContain(escape(d.landing.steps[0].artifact));
    const analysis = gateFacts()[0];
    expect(analysis.code).toBe("analysis");
    expect(analysis.steps).toHaveLength(5);
    for (const s of analysis.steps) expect(html).toContain(escape(d.stages.analysis.steps[s.id].label));
    expect(html).toContain(escape(fmt(labelsOf("id").download, { count: 26 })));
  });

  it("gate-loop source keeps the CSV export, gates ambient motion and never loops", () => {
    const src = read("src/components/landing/loop/gate-loop.tsx");
    for (const s of ["buildMatrixCsv", '"saksi-matriks-nist-iso.csv"', "useAmbientMotion", "pathLength", "animateMotion", 'repeatCount="1"', "beginElement", "skipAnimations={false}"])
      expect(src, s).toContain(s);
    for (const s of ['repeatCount="indefinite"', "setInterval", "backdrop", "<motion.", "useAnimate", 'from "gsap"']) expect(src, s).not.toContain(s);
    const hook = read("src/components/landing/use-ambient-motion.ts");
    expect(hook).toContain("LANDING_MOTION_QUERY");
    expect(hook).toContain("useSyncExternalStore");
  });

  it("stations, hallmarks and the raised path use solid surfaces, never the gradient token as a colour", () => {
    const src = read("src/components/landing/loop/gate-loop.tsx");
    for (const s of ["bg-[var(--fuse-card-bg)]", "var(--fuse-card-bg)_", 'stroke="var(--fuse-card-bg)"', "var(--fuse-card-bg))"]) expect(src, s).not.toContain(s);
  });

  it("landing.loop keys match in id and en, keep placeholders and avoid forbidden words", () => {
    const id = DICTS.id.landing.loop as Record<string, string> | undefined;
    const en = DICTS.en.landing.loop as Record<string, string> | undefined;
    expect(id).toBeDefined();
    expect(keys(id).sort()).toEqual(keys(en).sort());
    for (const l of [id!, en!]) {
      expect(l.stationLabel).toContain("{n}");
      expect(l.stationLabel).toContain("{title}");
      for (const k of ["substeps", "total", "download"]) expect(l[k], k).toContain("{count}");
      const hits = Object.values(l)
        .map((s) => s.toLowerCase())
        .flatMap((s) => FORBIDDEN.filter((p) => s.includes(p)).map((p) => `${p}: ${s}`));
      expect(hits).toEqual([]);
    }
  });
});
