import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n";
import { AI_PROVIDERS, LANDING_FACTS, SCORE_WEIGHTS, TEMPER, gateFacts } from "./landing-facts";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");

describe("LANDING_FACTS", () => {
  it("counts the five Secure SDLC stages and their sub-steps", () => {
    expect(LANDING_FACTS.stages).toBe(5);
    expect(LANDING_FACTS.subSteps).toBe(26);
  });

  it("matches the unique NIST SSDF task codes in the seed", () => {
    const codes = new Set(read("prisma/seed.ts").match(/\b(?:PO|PS|PW|RV)\.\d\.\d\b/g));
    expect(LANDING_FACTS.nistTasks).toBe(codes.size);
  });

  it("lists exactly the providers buildModel handles", () => {
    const cases = [...read("src/lib/ai/provider.ts").matchAll(/case "([a-z]+)":/g)].map((m) => m[1]);
    expect(AI_PROVIDERS.map((p) => p.toLowerCase()).sort()).toEqual([...cases].sort());
    expect(LANDING_FACTS.providers).toBe(cases.length);
  });

  it("matches the supported locales", () => {
    expect(LANDING_FACTS.languages).toBe(locales.length);
  });
});

describe("gateFacts", () => {
  it("derives 5 gates and 26 sub-steps from STAGE_DEFINITIONS", () => {
    const g = gateFacts();
    expect(g).toHaveLength(5);
    expect(g.reduce((n, s) => n + s.steps.length, 0)).toBe(26);
    expect(g[2].nist).toEqual(["PS.1.1", "PW.4.2", "PW.5.1", "PW.6.1", "PW.6.2"]);
  });

  it("only shows NIST tasks that exist in prisma/seed.ts", () => {
    const seed = read("prisma/seed.ts");
    for (const g of gateFacts()) for (const c of g.nist) expect(seed).toContain(`"${c}"`);
  });

  it("only shows valid ISO/IEC 27001:2022 Annex A control IDs", () => {
    // Annex A 2022: 5.1-5.37 organisational, 6.1-6.8 people, 7.1-7.14 physical, 8.1-8.34 technological.
    const max: Record<string, number> = { "5": 37, "6": 8, "7": 14, "8": 34 };
    for (const g of gateFacts())
      for (const c of g.iso) {
        const m = /^A\.([5-8])\.(\d+)$/.exec(c);
        expect(m, c).not.toBeNull();
        expect(Number(m![2]), c).toBeGreaterThanOrEqual(1);
        expect(Number(m![2]), c).toBeLessThanOrEqual(max[m![1]]);
      }
  });

  it("has the five temper temperatures in order", () => {
    expect(TEMPER.map((t) => t.celsius)).toEqual([205, 260, 282, 310, 371]);
  });

  it("has a label for every sub-step in both locales", () => {
    for (const loc of locales) {
      const d = JSON.parse(read(`src/dictionaries/${loc}.json`));
      for (const g of gateFacts()) for (const s of g.steps) expect(d.stages[g.code].steps[s.id].label).toBeTruthy();
    }
  });

  it("re-exports the scanner score weights", () => {
    expect(SCORE_WEIGHTS).toEqual({ critical: 20, high: 10, medium: 4, low: 1 });
  });
});
