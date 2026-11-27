import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { fmt } from "@/lib/format";
import { GATE_MAPPING, gateFacts } from "@/lib/landing-facts";
import { GateLoop } from "./gate-loop";
import { LANE_DROP, LANE_HALF, LOOP_VIEW, STATION_HALF, loopLayout } from "./loop-geometry";

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

/** Points sampled along an "M p (C c c p | L p)*" path, so bounds check the drawn curve, not only control points. */
function sample(d: string): { x: number; y: number }[] {
  const tokens = d.match(/[MCL]|-?\d+(\.\d+)?/g) ?? [];
  const out: { x: number; y: number }[] = [];
  let cur = { x: 0, y: 0 };
  let cmd = "";
  const nums: number[] = [];
  const flush = () => {
    if (cmd === "M" || cmd === "L") cur = { x: nums[0], y: nums[1] };
    if (cmd === "C") {
      const [c1x, c1y, c2x, c2y, x, y] = nums;
      for (let k = 0; k <= 20; k++) {
        const t = k / 20;
        const u = 1 - t;
        out.push({
          x: u ** 3 * cur.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t ** 3 * x,
          y: u ** 3 * cur.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t ** 3 * y,
        });
      }
      cur = { x, y };
    }
    out.push(cur);
    nums.length = 0;
  };
  for (const tok of tokens) {
    if (/[MCL]/.test(tok)) {
      if (cmd) flush();
      cmd = tok;
    } else nums.push(Number(tok));
  }
  if (cmd) flush();
  return out;
}

type Box = { x: number; y: number; w: number; h: number };
/** Strict overlap of two axis-aligned boxes (touching edges do not count). */
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inView = (b: Box) => b.x >= 0 && b.y >= 0 && b.x + b.w <= LOOP_VIEW.width && b.y + b.h <= LOOP_VIEW.height;
const stationBox = (s: { x: number; y: number }): Box => ({ x: s.x - STATION_HALF, y: s.y - STATION_HALF, w: 2 * STATION_HALF, h: 2 * STATION_HALF });
/** Footprint of the raised lane at a centre point: its surface plus the side dropping LANE_DROP below. */
const laneBox = (p: { x: number; y: number }): Box => ({ x: p.x - LANE_HALF, y: p.y - LANE_HALF, w: 2 * LANE_HALF, h: 2 * LANE_HALF + LANE_DROP });
/** Markup from an opening tag carrying `attr` up to the first closing `end` after it. */
const chunk = (html: string, attr: string, end: string) => {
  const i = html.indexOf(attr);
  expect(i, attr).toBeGreaterThanOrEqual(0);
  return html.slice(i, html.indexOf(end, i));
};

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value as Json).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

describe("gate loop geometry", () => {
  // Changed (fuse-v2-r11): text moved to the right of each station, so the last station sits at margin + 4 * pitch
  // to leave room for its text, and rows come from LOOP_VIEW instead of the old literals 110/230.
  it("loopLayout places five stations left to right and alternates rows", () => {
    const { stations } = loopLayout(5);
    const { margin, pitch, yTop, yBottom } = LOOP_VIEW;
    expect(stations).toHaveLength(5);
    for (let i = 1; i < 5; i++) expect(stations[i].x).toBeGreaterThan(stations[i - 1].x);
    expect(stations[0].x).toBe(margin);
    expect(stations[4].x).toBe(margin + 4 * pitch);
    expect(stations.map((s) => s.y)).toEqual([yTop, yBottom, yTop, yBottom, yTop]);
  });

  // Changed (fuse-v2-r11): literal 470 replaced by LOOP_VIEW.yReturn; the bottom row and its text boxes need a lower return lane.
  it("forward path runs through every station and the back path returns below to station 1", () => {
    const { forward, back, stations } = loopLayout(5);
    const { yReturn } = LOOP_VIEW;
    const last = stations[4];
    const start = `${stations[0].x} ${stations[0].y}`;
    expect(forward.startsWith(`M${start}`)).toBe(true);
    expect(forward.trim().endsWith(`${last.x} ${last.y}`)).toBe(true);
    expect(forward.match(/C/g)).toHaveLength(4);
    expect(back.startsWith(`M${last.x} ${last.y}`)).toBe(true);
    expect(back.trim().endsWith(start)).toBe(true);
    expect(back).toContain(String(yReturn));
    for (const d of [forward, back])
      for (const p of points(d)) {
        expect(p.y).toBeLessThanOrEqual(yReturn);
        expect(p.y).toBeGreaterThanOrEqual(0);
      }
  });

  // Changed (fuse-v2-r11): literal 470 replaced by LOOP_VIEW.yReturn.
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
    expect(back[0].y).toBe(LOOP_VIEW.yReturn);
  });

  // Replaced (fuse-v2-r11): "the return lane passes outside the text columns of the first and last station" is covered
  // by A2 below; the old half-width constant of the centred text columns is gone and A2 checks every text box against both lanes.

  // Changed (fuse-v2-r11): LANE_HALF now comes from the geometry (22, wider lane) plus LANE_DROP (10) for the side
  // below; the old margin >= label half + 16 + lane half assertion is dropped with that constant.
  it("the whole loop, lane width included, stays inside the viewBox", () => {
    const { forward, back } = loopLayout(5);
    for (const d of [forward, back])
      for (const p of [...points(d), ...sample(d)]) {
        expect(p.x - LANE_HALF).toBeGreaterThanOrEqual(0);
        expect(p.x + LANE_HALF).toBeLessThanOrEqual(LOOP_VIEW.width);
        expect(p.y - LANE_HALF).toBeGreaterThanOrEqual(0);
        expect(p.y + LANE_HALF + LANE_DROP).toBeLessThanOrEqual(LOOP_VIEW.height);
      }
  });

  it("loopLayout gives every station a text box to its right, above the lane on top rows and below it on bottom rows", () => {
    const { stations, labels } = loopLayout(5);
    expect(labels).toHaveLength(5);
    stations.forEach((s, i) => {
      const box = labels[i];
      expect(box.x).toBeGreaterThanOrEqual(s.x + STATION_HALF);
      if (i % 2 === 0) expect(box.y + box.h).toBeLessThanOrEqual(s.y - LANE_HALF);
      else expect(box.y).toBeGreaterThanOrEqual(s.y + LANE_HALF + LANE_DROP);
    });
  });

  it("no sampled point of the forward or return lane touches a text box", () => {
    const { forward, back, labels } = loopLayout(5);
    for (const d of [forward, back])
      for (const p of sample(d))
        for (const box of labels) expect(overlaps(laneBox(p), box), `${p.x},${p.y}`).toBe(false);
    // sample() keeps only the ends of the straight return run, so check that run's top edge directly.
    for (const box of labels) expect(box.y + box.h).toBeLessThanOrEqual(LOOP_VIEW.yReturn - LANE_HALF);
  });

  it("text boxes and stations stay inside the viewBox and never overlap each other", () => {
    const { stations, labels } = loopLayout(5);
    const boxes = stations.map(stationBox);
    for (const b of [...labels, ...boxes]) expect(inView(b), JSON.stringify(b)).toBe(true);
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) expect(overlaps(labels[i], labels[j]), `${i}-${j}`).toBe(false);
      for (const b of boxes) expect(overlaps(labels[i], b), `${i}`).toBe(false);
    }
  });

  it("return label sits under the return lane inside the viewBox", () => {
    const { returnLabel } = loopLayout(5);
    expect(returnLabel.y).toBeGreaterThanOrEqual(LOOP_VIEW.yReturn + LANE_HALF + LANE_DROP);
    expect(returnLabel.y + 40).toBeLessThanOrEqual(LOOP_VIEW.height);
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

  // Replaced (fuse-v2-r11): "station text columns are as wide as 2 x the label half-width ..." is covered by B4 below;
  // the text no longer sits centred under the station.

  it("desktop lane is layered: side, surface and edge for the forward and the return lane", () => {
    const html = render("id");
    for (const lane of ["forward", "back"]) {
      const g = chunk(html, `data-loop-lane="${lane}"`, "</g>");
      const layer = (k: string) => [...g.matchAll(new RegExp(`<path[^>]*data-lane-layer="${k}"[^>]*>`, "g"))].map((m) => m[0]);
      const [side, surface, edge] = ["side", "surface", "edge"].map(layer);
      expect(side, lane).toHaveLength(1);
      expect(surface, lane).toHaveLength(1);
      expect(edge, lane).toHaveLength(1);
      expect(side[0]).toContain('stroke="#0A1931"');
      expect(side[0]).toContain('transform="translate(0 10)"');
      expect(surface[0]).toMatch(/stroke="url\(#[^)]+\)"/);
      expect(surface[0]).toContain('stroke-width="44"');
      expect(edge[0]).toContain('stroke="#B3CFE5"');
    }
    expect(html).toMatch(/<g[^>]*data-loop-lane="forward"/);
    expect(html).toMatch(/<g[^>]*data-loop-lane="back"/);
    const grad = chunk(html, "<linearGradient", "</linearGradient>");
    expect(grad).toContain("#1A3D63");
    expect(grad).toContain("#4A7FA7");
  });

  it("the return lane is the same road, never dashed", () => {
    const html = render("id");
    expect(chunk(html, 'data-loop-lane="back"', "</g>")).not.toContain("stroke-dasharray");
    const tags = [...html.matchAll(/<[^>]*data-loop-return[^>]*>/g)].map((m) => m[0]);
    expect(tags.length).toBeGreaterThan(0);
    for (const t of tags) expect(t).not.toContain("stroke-dasharray");
    expect(read("src/components/landing/loop/gate-loop.tsx")).not.toContain("border-dashed");
  });

  // Changed (fuse-v2-r11 putaran 2): the see-through glass (dark:bg-[#F6FAFD]/10, border /45) let the lane show through
  // the station; the glass is now an opaque palette gradient with a /50 mist border, checked in the test after this one.
  it("stations are 88px glass boxes with a 32px icon", () => {
    const html = render("id");
    const { gates, labels } = propsOf("id");
    const buttons = [...html.matchAll(/<button[^>]*data-loop-station(-m)?=[^>]*>[\s\S]*?<\/button>/g)].map((m) => m[0]);
    expect(buttons).toHaveLength(10);
    buttons.forEach((b, k) => {
      const tag = b.slice(0, b.indexOf(">") + 1);
      for (const s of ["data-loop-glass", "size-22", "dark:border-[#B3CFE5]/50", 'type="button"', "aria-pressed="])
        expect(tag, s).toContain(s);
      expect(tag).toContain(`aria-label="${escape(fmt(labels.stationLabel, { n: (k % 5) + 1, title: gates[k % 5].title }))}"`);
      expect(b).toMatch(/<svg[^>]*class="[^"]*\bsize-8\b/);
    });
  });

  it("desktop stations stand on top of the lane with an opaque glass fill", () => {
    const html = render("id");
    const laneSvgEnd = html.indexOf("</svg>", html.indexOf('data-loop-lane="forward"'));
    expect(laneSvgEnd).toBeGreaterThan(0);
    const tags = [...html.matchAll(/<button[^>]*data-loop-station(-m)?=[^>]*>/g)];
    expect(tags).toHaveLength(10);
    for (const m of tags) {
      const tag = m[0];
      if (!tag.includes("data-loop-station-m")) expect(m.index, "station after lane layers").toBeGreaterThan(laneSvgEnd);
      expect(tag).toContain("data-station-glass");
      expect(tag).toContain("bg-[linear-gradient(180deg,#F6FAFD,#B3CFE5)]");
      expect(tag).toContain("dark:bg-[linear-gradient(180deg,#1A3D63,#0A1931)]");
      // No see-through fill: a palette hex with an alpha suffix as the background.
      expect(tag).not.toMatch(/(^|\s)(dark:)?bg-\[#[0-9A-Fa-f]{6}\]\/\d+/);
    }
  });

  it("mobile road closes the loop with top and bottom joints in the same layers", () => {
    const html = render("id");
    for (const joint of ["top", "bottom"]) {
      const tag = html.match(new RegExp(`<div[^>]*data-lane-joint="${joint}"[^>]*>`))?.[0] ?? "";
      expect(tag, joint).toContain('aria-hidden="true"');
      const body = chunk(html, `data-lane-joint="${joint}"`, "</div>");
      for (const k of ["side", "surface", "edge"])
        expect(body.match(new RegExp(`<span[^>]*data-lane-layer="${k}"`, "g")), `${joint} ${k}`).toHaveLength(1);
    }
  });

  it("text sits right of each station at its layout box", () => {
    const html = render("id");
    const { gates } = propsOf("id");
    const { labels } = loopLayout(5);
    const tags = [...html.matchAll(/<div[^>]*data-loop-text[^>]*>/g)];
    expect(tags).toHaveLength(5);
    tags.forEach((m, i) => {
      const tag = m[0];
      const box = labels[i];
      expect(tag).toContain(`left:${box.x / 10}%`);
      expect(tag).toContain(`top:${(box.y * 100) / LOOP_VIEW.height}%`);
      expect(tag).toContain(`width:${box.w / 10}%`);
      expect(tag).not.toContain("-translate-x-1/2");
      const body = html.slice(m.index, html.indexOf("</div>", m.index));
      expect(body).toMatch(new RegExp(`<p[^>]*xl:text-\\[40px\\][^>]*>0${i + 1}</p>`));
      expect(body).toContain(escape(gates[i].title));
      expect(body).toContain(escape(gates[i].why));
    });
  });

  it("arrows sit on the lane surface in mist", () => {
    const html = render("id");
    const fwd = [...html.matchAll(/<polygon[^>]*data-loop-arrow="forward"[^>]*>/g)].map((m) => m[0]);
    const back = [...html.matchAll(/<polygon[^>]*data-loop-arrow="back"[^>]*>/g)].map((m) => m[0]);
    expect(fwd).toHaveLength(4);
    expect(back).toHaveLength(1);
    for (const a of [...fwd, ...back]) expect(a).toContain('fill="#B3CFE5"');
  });

  it("mobile uses the same layered road vertically, for the return lane too", () => {
    const html = render("id");
    for (const lane of ["forward", "back"]) {
      const tag = html.match(new RegExp(`<div[^>]*data-loop-lane-m="${lane}"[^>]*>`))?.[0] ?? "";
      expect(tag, lane).toContain('aria-hidden="true"');
      const body = chunk(html, `data-loop-lane-m="${lane}"`, "</div>");
      for (const k of ["side", "surface", "edge"])
        expect(body.match(new RegExp(`<span[^>]*data-lane-layer="${k}"`, "g")), `${lane} ${k}`).toHaveLength(1);
    }
    const loop = loopOf("id");
    expect(html).toContain(escape(loop.returnLabel));
    expect(html).toContain(escape(loop.returnNote));
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
