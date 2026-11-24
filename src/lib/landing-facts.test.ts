import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n";
import { AI_PROVIDERS, LANDING_FACTS } from "./landing-facts";

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
