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

  it("matches a known pair", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 1);
  });
});
