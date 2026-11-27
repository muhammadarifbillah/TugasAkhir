import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STAGE_HEX, contrastRatio } from "./contrast";
import { PALETTE, findOffPalette, type PaletteName } from "./palette";

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
const PALETTE_TEXT = [
  "--foreground",
  "--muted-foreground",
  "--fuse-accent-text",
  "--info",
  ...STAGES,
  "--card-foreground",
  "--secondary-foreground",
  "--accent-foreground",
];
/** §0 exception: status token values are not palette colours and stay unchanged. */
const STATUS_TOKENS = ["--destructive", "--destructive-foreground", "--success", "--success-foreground", "--warning", "--danger"];

function expectAA(body: string, texts: string[], surfaces: string[]) {
  expect(body).not.toBe("");
  for (const bg of surfaces)
    for (const fg of texts) {
      const ratio = contrastRatio(token(body, fg), token(body, bg));
      expect(ratio, `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
}

function expectRoles(body: string, roles: Partial<Record<PaletteName, string[]>>) {
  expect(body).not.toBe("");
  for (const [name, tokens] of Object.entries(roles) as [PaletteName, string[]][])
    for (const t of tokens) expect(token(body, t).toUpperCase(), t).toBe(PALETTE[name]);
}

/** Every rule of globals.css with its enclosing at-rule preludes (comments removed). */
function cssRules(): { ctx: string[]; selector: string; body: string }[] {
  const out: { ctx: string[]; selector: string; body: string }[] = [];
  const stack: string[] = [];
  let buf = "";
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (ch === "{") {
      stack.push(buf.slice(buf.lastIndexOf(";") + 1).trim());
      buf = "";
    } else if (ch === "}") {
      const selector = stack.pop() ?? "";
      out.push({ ctx: [...stack], selector, body: buf });
      buf = "";
    } else buf += ch;
  }
  return out;
}

describe("stage colours as text", () => {
  it.each(["#f4f6f8", "#ffffff"])("every stage colour is AA on %s", (bg) => {
    for (const fg of STAGE_HEX) expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches the light-theme tokens in globals.css", () => {
    const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    STAGE_HEX.forEach((hex, i) => expect(root).toContain(`--stage-${i + 1}: ${hex};`));
  });

  it("FUSE dark tokens follow the Colors Ideas role map", () => {
    expectRoles(block(DARK), {
      ink: ["--background", "--primary-foreground", "--fuse-btn-fg"],
      snow: ["--foreground", "--card-foreground", "--popover-foreground", "--secondary-foreground", "--accent-foreground"],
      deep: ["--card", "--popover", "--secondary", "--muted", "--accent"],
      mist: ["--primary", "--muted-foreground", "--info", ...STAGES, "--input", "--ring", "--fuse-accent-text", "--fuse-btn-bg"],
      steel: ["--border"],
    });
  });

  it("FUSE light tokens follow the Colors Ideas role map", () => {
    expectRoles(block(LIGHT), {
      snow: ["--background", "--card", "--popover", "--primary-foreground", "--fuse-btn-fg"],
      ink: ["--foreground", "--card-foreground", "--popover-foreground", "--secondary-foreground", "--accent-foreground"],
      deep: ["--primary", "--muted-foreground", "--info", ...STAGES, "--fuse-accent-text", "--fuse-btn-bg"],
      mist: ["--secondary", "--muted", "--accent", "--border"],
      steel: ["--input", "--ring"],
    });
  });

  it("FUSE tokens use only palette colours outside the status exceptions", () => {
    for (const body of [block(DARK), block(LIGHT)]) {
      expect(body).not.toBe("");
      for (const [, name, value] of body.matchAll(/(--[\w-]+):\s*([^;]+);/g)) {
        if (STATUS_TOKENS.includes(name)) continue;
        expect(findOffPalette(value), `${name}: ${value}`).toEqual([]);
      }
      expect(body).not.toContain("--tape-paper");
    }
    expect(token(block(DARK), "--shadow-color")).toBe("217 66% 12%");
    expect(token(block(LIGHT), "--shadow-color")).toBe("211 58% 25%");
  });

  it("FUSE palette text tokens are AA on page, card and muted surfaces", () => {
    for (const body of [block(DARK), block(LIGHT)]) expectAA(body, PALETTE_TEXT, ["--background", "--card", "--secondary"]);
  });

  it("FUSE status tokens stay AA on page and card", () => {
    // Split from the palette text check: the light muted surface is now mist (§0), while the status tokens are an
    // unchanged exception that is shown on badges with their own background, so they are only held to page and card.
    for (const body of [block(DARK), block(LIGHT)]) expectAA(body, ["--success", "--warning", "--danger"], ["--background", "--card"]);
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

  it("FUSE non-text tokens reach 3:1 and steel is never a text token", () => {
    for (const body of [block(DARK), block(LIGHT)]) {
      for (const fg of ["--input", "--ring"])
        for (const bg of ["--background", "--card"])
          expect(contrastRatio(token(body, fg), token(body, bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(3);
      for (const fg of [...PALETTE_TEXT, "--primary-foreground", "--popover-foreground", "--fuse-btn-fg"])
        expect(token(body, fg).toUpperCase(), fg).not.toBe("#4A7FA7");
    }
    expect(contrastRatio("#4A7FA7", "#F6FAFD")).toBeLessThan(4.5);
  });

  it("FUSE utility tokens exist in both blocks", () => {
    const utils = ["--fuse-bg", "--fuse-card-bg", "--fuse-sheen", "--fuse-shadow-soft", "--fuse-glow", "--fuse-accent-text", "--fuse-btn-bg", "--fuse-btn-fg"];
    for (const body of [block(DARK), block(LIGHT)]) for (const name of utils) expect(token(body, name)).not.toBe("");
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

  it("FUSE high-contrast overrides use palette and reach 7:1", () => {
    const hc = cssRules().filter(
      (r) =>
        (r.ctx.includes("@media (prefers-contrast: more)") || r.selector.includes('[data-contrast="high"]')) &&
        /:has\(\.(landing|dashboard-surface)\)/.test(r.selector) &&
        r.body.includes("--muted-foreground"),
    );
    const themes = [
      { dark: true, body: block(DARK), muted: PALETTE.snow, border: PALETTE.mist },
      { dark: false, body: block(LIGHT), muted: PALETTE.ink, border: PALETTE.deep },
    ];
    for (const t of themes) {
      const rules = hc.filter((r) => r.selector.includes("html.dark") === t.dark);
      // one OS-preference rule and one header-toggle rule per theme
      expect(rules.length, `dark=${t.dark}`).toBeGreaterThanOrEqual(2);
      for (const r of rules) {
        expect(token(r.body, "--muted-foreground").toUpperCase(), r.selector).toBe(t.muted);
        expect(token(r.body, "--border").toUpperCase(), r.selector).toBe(t.border);
      }
      for (const bg of ["--background", "--muted"]) expect(contrastRatio(t.muted, token(t.body, bg)), bg).toBeGreaterThanOrEqual(7);
    }
  });

  it("matches a known pair", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});
