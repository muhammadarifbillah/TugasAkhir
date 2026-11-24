import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STAGE_HEX, contrastRatio } from "./contrast";

describe("stage colours as text", () => {
  it.each(["#f4f6f8", "#ffffff"])("every stage colour is AA on %s", (bg) => {
    for (const fg of STAGE_HEX) expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches the light-theme tokens in globals.css", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");
    const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    STAGE_HEX.forEach((hex, i) => expect(root).toContain(`--stage-${i + 1}: ${hex};`));
  });

  it("keeps Dark Clay landing text pairs readable", () => {
    // ink, muted and link/accent text on the page and card surfaces
    for (const bg of ["#0b0d1a", "#1a1e3a"]) {
      expect(contrastRatio("#eef0ff", bg)).toBeGreaterThanOrEqual(7);
      expect(contrastRatio("#a6abd6", bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio("#b9a6ff", bg)).toBeGreaterThanOrEqual(4.5);
    }
    // dark-theme stage colours used as text on the clay surfaces
    for (const bg of ["#0b0d1a", "#1a1e3a"])
      for (const fg of ["#d9b45e", "#d08a4e", "#b394db", "#86ace0", "#9cadbd"])
        expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    // white text on both ends of the primary clay button gradient
    for (const btn of ["#7c3aed", "#5b21b6"]) expect(contrastRatio("#ffffff", btn)).toBeGreaterThanOrEqual(4.5);
  });

  it("matches a known pair", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});
