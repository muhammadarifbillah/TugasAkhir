import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HeroTape } from "./hero-tape";

type Json = Record<string, unknown>;
const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const en = JSON.parse(read("src/dictionaries/en.json")) as { landing: Json };
const id = JSON.parse(read("src/dictionaries/id.json")) as { landing: Json };

const html = () =>
  renderToStaticMarkup(
    createElement(HeroTape, { copy: id.landing.heroTape as Parameters<typeof HeroTape>[0]["copy"] }),
  );

function keys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Json).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.values(value as Json).flatMap(strings);
}

const FORBIDDEN = [
  "bersertifikat",
  "patuh standar",
  "100% aman",
  "terjamin",
  "diperkeras",
  "certified",
  "compliant",
  "100% secure",
  "guaranteed",
  "hardened",
];

describe("hero tape", () => {
  it("stage slot is aria-hidden", () => {
    expect(html()).toMatch(/<div[^>]*data-hero-stage[^>]*aria-hidden="true"|<div[^>]*aria-hidden="true"[^>]*data-hero-stage/);
  });

  it("findings table has three rows, score 91 and both code families", () => {
    const out = html();
    expect(out).toContain("<table");
    expect(out).toContain("<caption");
    expect(out.match(/data-finding=/g)?.length).toBe(3);
    for (const s of [">91<", "A.8.29 · PW.8.1", "A.8.28 · PW.4.1", "A.8.8, A.8.29 · PW.7.2", "\u22124", "\u22121"])
      expect(out).toContain(s);
  });

  it("caption shows the poster step with counts filled in", () => {
    const out = html();
    expect(out).toContain("Semgrep dan Trivy menemukan 2 medium dan 1 low.");
    expect(out).not.toContain("{medium}");
    expect(out).not.toContain("{low}");
  });

  it("hero markup has no backdrop filter", () => {
    expect(html()).not.toContain("backdrop");
  });

  it("hero copy keys are identical in en and id", () => {
    expect(keys(en.landing.heroTape)).toEqual(keys(id.landing.heroTape));
    for (const d of [en, id]) {
      const tape = d.landing.heroTape as { steps?: unknown[]; findings?: unknown[] } | undefined;
      expect(tape?.steps?.length).toBe(5);
      expect(tape?.findings?.length).toBe(3);
      expect(d.landing).toHaveProperty("heroSub");
      expect(d.landing).toHaveProperty("ctaSample");
      expect(d.landing).not.toHaveProperty("heroWordmark");
      expect(d.landing).not.toHaveProperty("heroStandards");
    }
  });

  it("H1, sub-headline and lede follow PRD chapter 7", () => {
    expect(id.landing.headline).toBe("Kode dari AI dibaca lima gerbang sebelum boleh dikirim.");
    expect(en.landing.headline).toBe("AI code is read by five gates before it ships.");
    for (const d of [en, id])
      for (const k of ["heroSub", "heroLede"]) {
        const s = String(d.landing[k]);
        expect(s).toContain("{name}");
        expect(s).toContain("ISO/IEC 27001:2022");
        expect(s).not.toContain("ShieldForge");
      }
    expect(id.landing.ctaPrimary).toBe("Mulai proyek gratis");
    expect(en.landing.ctaPrimary).toBe("Start a free project");
    expect(id.landing.ctaSample).toBe("Lihat contoh laporan");
    expect(en.landing.ctaSample).toBe("See a sample report");
  });

  it("hero copy has no forbidden phrases", () => {
    const text = [en, id]
      .flatMap((d) => [d.landing.headline, d.landing.heroSub, d.landing.heroLede, ...strings(d.landing.heroTape)])
      .map((s) => String(s ?? ""))
      .join("\n")
      .toLowerCase();
    for (const phrase of FORBIDDEN) expect(text).not.toContain(phrase);
  });

  it("landing page renders the tape hero, not the shield", () => {
    const page = read("src/app/[lang]/page.tsx");
    for (const s of ["HeroShield", "heroWordmark", "hero-wordmark", "heroStandards"]) expect(page).not.toContain(s);
    for (const s of ["<HeroTape", "fmt(l.heroSub", "fmt(l.heroLede", "dict.app.name", 'href="#bukti"', "l.ctaSample"])
      expect(page).toContain(s);
  });
});
