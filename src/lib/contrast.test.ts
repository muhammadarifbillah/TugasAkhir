import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STAGE_HEX, contrastRatio } from "./contrast";

const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
const DARK = "html.dark:has(.landing),\nhtml.dark:has(.dashboard-surface) {";
const LIGHT = "html:not(.dark):has(.landing),\nhtml:not(.dark):has(.dashboard-surface) {";

/** Body of the first rule whose selector text is exactly `selector` ("" when absent). */
function block(selector: string): string {
  const start = css.indexOf(selector);
  return start < 0 ? "" : css.slice(start, css.indexOf("}", start));
}

/** Value of `--name` declared in a block body. */
function token(body: string, name: string): string {
  const m = body.match(new RegExp(`(?:^|[\\s;{])${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`${name} missing`);
  return m[1].trim();
}

const STAGES = ["--stage-1", "--stage-2", "--stage-3", "--stage-4", "--stage-5"];
const TEXT_TOKENS = ["--foreground", "--muted-foreground", "--fuse-accent-text", "--success", "--warning", "--danger", "--info", ...STAGES];

function expectAA(body: string, surfaces: string[]) {
  for (const bg of surfaces)
    for (const fg of TEXT_TOKENS) {
      const ratio = contrastRatio(token(body, fg), token(body, bg));
      expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
}

describe("stage colours as text", () => {
  it.each(["#f4f6f8", "#ffffff"])("every stage colour is AA on %s", (bg) => {
    for (const fg of STAGE_HEX) expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches the light-theme tokens in globals.css", () => {
    const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    STAGE_HEX.forEach((hex, i) => expect(root).toContain(`--stage-${i + 1}: ${hex};`));
  });

  it("FUSE dark tokens: text tokens are AA on ink and deep", () => {
    const dark = block(DARK);
    expect(dark).not.toBe("");
    expectAA(dark, ["--background", "--card"]);
  });

  it("FUSE light tokens: text tokens are AA on snow, white and mist surfaces", () => {
    const light = block(LIGHT);
    expect(light).not.toBe("");
    expectAA(light, ["--background", "--card", "--secondary"]);
  });

  it("FUSE button and status-fill pairs are AA", () => {
    for (const body of [block(DARK), block(LIGHT)])
      for (const [fg, bg] of [
        ["--primary-foreground", "--primary"],
        ["--fuse-btn-fg", "--fuse-btn-bg"],
        ["--destructive-foreground", "--destructive"],
        ["--success-foreground", "--success"],
      ])
        expect(contrastRatio(token(body, fg), token(body, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("FUSE non-text tokens reach 3:1 and steel stays out of small text", () => {
    for (const body of [block(DARK), block(LIGHT)]) {
      for (const fg of ["--input", "--ring"])
        for (const bg of ["--background", "--card"])
          expect(contrastRatio(token(body, fg), token(body, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
      for (const fg of TEXT_TOKENS) expect(token(body, fg).toUpperCase()).not.toBe("#4A7FA7");
    }
    expect(contrastRatio("#4A7FA7", "#F6FAFD")).toBeLessThan(4.5);
  });

  it("FUSE utility tokens exist in both blocks", () => {
    const utils = ["--fuse-bg", "--fuse-card-bg", "--fuse-sheen", "--fuse-shadow-soft", "--fuse-glow", "--fuse-accent-text", "--fuse-btn-bg", "--fuse-btn-fg"];
    for (const body of [block(DARK), block(LIGHT)]) for (const name of utils) expect(token(body, name)).not.toBe("");
    expect(token(block(DARK), "--tape-paper")).toBe("#ede6d3");
    expect(token(block(LIGHT), "--tape-paper")).toBe("#f6f1e3");
    const root = block(":root {");
    for (const [name, hex] of [
      ["--fuse-ink", "#0A1931"],
      ["--fuse-deep", "#1A3D63"],
      ["--fuse-steel", "#4A7FA7"],
      ["--fuse-mist", "#B3CFE5"],
      ["--fuse-snow", "#F6FAFD"],
    ])
      expect(token(root, name)).toBe(hex);
  });

  it("no violet clay colours remain in globals.css", () => {
    const lower = css.toLowerCase();
    for (const banned of [
      "#7c3aed",
      "#5b21b6",
      "#b9a6ff",
      "#a78bfa",
      "#2e1065",
      "rgba(124, 58, 237",
      "rgba(139, 92, 246",
      "rgba(167, 139, 250",
      "rgba(120, 110, 255",
    ])
      expect(lower, banned).not.toContain(banned);
  });

  it("dashboard page and loading carry the dashboard-surface scope", () => {
    const app = path.join(process.cwd(), "src/app/[lang]");
    for (const f of ["dashboard/page.tsx", "dashboard/loading.tsx"])
      expect(fs.readFileSync(path.join(app, f), "utf8")).toContain("dashboard-surface");
    for (const dir of ["studio", "settings"])
      for (const f of fs.readdirSync(path.join(app, dir), { recursive: true, withFileTypes: true }))
        if (f.isFile())
          expect(fs.readFileSync(path.join(f.parentPath, f.name), "utf8"), f.name).not.toContain("dashboard-surface");
  });

  it("FUSE high-contrast muted text is at least 7:1", () => {
    for (const bg of ["#0A1931", "#1A3D63"]) expect(contrastRatio("#DCE9F5", bg)).toBeGreaterThanOrEqual(7);
    for (const bg of ["#F6FAFD", "#E8F1F9"]) expect(contrastRatio("#0A1931", bg)).toBeGreaterThanOrEqual(7);
    // every rule mentioning dashboard-surface with a high-contrast muted value
    const rules = [...css.matchAll(/([^{}]*dashboard-surface[^{}]*)\{([^}]*)\}/g)].map((m) => m[2]);
    const muted = rules.flatMap((body) => [...body.matchAll(/--muted-foreground:\s*([^;]+);/g)].map((m) => m[1].trim()));
    expect(muted).toContain("#DCE9F5");
    expect(muted).toContain("#0A1931");
  });

  it("keeps Pita Pindai tape and finding pairs readable", () => {
    for (const bg of ["#ede6d3", "#f6f1e3"]) expect(contrastRatio("#222222", bg)).toBeGreaterThanOrEqual(7);
    for (const bg of ["#f7c6c6", "#f5d9a8"]) expect(contrastRatio("#222222", bg)).toBeGreaterThanOrEqual(7);
    expect(contrastRatio("#eef0ff", "#0f1226")).toBeGreaterThanOrEqual(7);
    // brake jaw is a graphic object on the tape paper (SC 1.4.11)
    for (const bg of ["#ede6d3", "#f6f1e3"]) expect(contrastRatio("#e5484d", bg)).toBeGreaterThanOrEqual(3);
  });

  it("pins the Pita Pindai tokens in globals.css", () => {
    expect(block(DARK)).toContain("--tape-paper: #ede6d3;");
    expect(block(LIGHT)).toContain("--tape-paper: #f6f1e3;");
    const landing = block(".landing {");
    for (const decl of [
      "--tape-ink: #222222;",
      "--finding-medium: #f7c6c6;",
      "--finding-low: #f5d9a8;",
      "--brake: #e5484d;",
      "--odometer-bg: #0f1226;",
    ])
      expect(landing).toContain(decl);
  });

  it("matches a known pair", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});
