import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const PAGE = "src/app/[lang]/page.tsx";
const ABOUT = "src/components/landing/about-section.tsx";
const HOW = "src/components/landing/how-vignettes.tsx";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
const landing = (lang: "en" | "id") =>
  (JSON.parse(read(`src/dictionaries/${lang}.json`)) as { landing: Record<string, Json> }).landing;

/** Every source file under `dir` matching `ext`, tests and generated code excluded. */
function walk(dir: string, ext: RegExp, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (path === "src/generated") continue;
      walk(path, ext, out);
    } else if (ext.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

function keys(value: Json, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([k, v]) => keys(v, prefix ? `${prefix}.${k}` : k));
}

function strings(value: Json): string[] {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return (Array.isArray(value) ? value : Object.values(value)).flatMap(strings);
}

describe("landing information architecture", () => {
  it("section anchors follow PRD chapter 9 order", () => {
    const ids = [...read(PAGE).matchAll(/\bid="([a-z-]+)"/g)].map((m) => m[1]).filter((id) => !id.endsWith("-title"));
    expect(ids).toEqual([
      "mulai-hero",
      "masalah",
      "tentang",
      "gerbang",
      "pengguna",
      "pratinjau",
      "cara-kerja",
      "arsitektur",
      "bukti",
      "hasil",
      "pelajari",
      "mulai",
    ]);
  });

  it("guard cards live inside the about section", () => {
    const page = read(PAGE);
    expect(page).not.toContain("GuardGrid");
    expect(page).not.toContain("guard-grid");
    expect(page).not.toContain('"dijaga"');
    expect(page).toContain("guardCards={l.guardCards}");
    const about = read(ABOUT);
    expect(about).toContain("guardCards");
    expect(about).not.toContain("HeroShield");
  });

  it("the shield is no longer used on the landing page", () => {
    expect(existsSync(join(ROOT, "src/components/landing/guard-grid.tsx"))).toBe(false);
    const users = walk("src", /\.tsx?$/)
      .filter((f) => f !== "src/components/landing/hero-shield.tsx")
      .filter((f) => {
        const text = read(f);
        return text.includes("landing/hero-shield") || text.includes("HeroShield");
      });
    expect(users).toEqual([]);
  });
});

describe("primary CTA", () => {
  it("primaryCta sends guests to register and members to the dashboard", async () => {
    // Imported inside the test so the rest of the suite still runs before the helper exists.
    const { primaryCta } = await import("@/components/landing/primary-cta");
    expect(primaryCta("id", false)).toEqual({ href: "/id/register", label: "ctaPrimary" });
    expect(primaryCta("en", true)).toEqual({ href: "/en/dashboard", label: "ctaDashboard" });
  });

  it("landing page uses primaryCta for hero and closing CTA", () => {
    const page = read(PAGE);
    expect(page).toContain("primaryCta(");
    expect(page).not.toContain("/login");
    expect(page.match(/href=\{cta\.href\}/g) ?? []).toHaveLength(2);
  });
});

describe("landing copy", () => {
  const TITLES: Record<string, { id: string; en: string }> = {
    problemTitle: { id: "Kode buatan AI cepat jadi, tapi jarang diperiksa.", en: "AI code ships fast, rarely checked." },
    aboutTitle: { id: "Apa itu {name}?", en: "What is {name}?" },
    gatesTitle: { id: "Lima gerbang, diuji berurutan.", en: "Five gates, in order." },
    audienceTitle: { id: "Dibuat untuk tiga kelompok pengguna.", en: "Built for three groups." },
    previewTitle: { id: "Ini studionya, bukan ilustrasi.", en: "This is the studio." },
    howTitle: { id: "Dari prompt ke rilis yang bisa diaudit", en: "From prompt to auditable release" },
    archTitle: { id: "Apa yang terjadi di balik layar.", en: "Under the hood." },
    proofTitle: { id: "Angka dan metode yang bisa Anda periksa sendiri.", en: "Numbers you can check." },
    resultsTitle: {
      id: "Yang Anda bawa pulang, dan yang tidak dijanjikan.",
      en: "What you take home, and what we don't promise.",
    },
    learnTitle: { id: "Pelajari istilah dan jawabannya.", en: "Terms and answers." },
    closingTitle: { id: "Mulai proyek pertama Anda", en: "Start your first project" },
    guardTitle: { id: "Yang dijaga {name} di setiap proyek.", en: "What {name} guards in every project." },
  };

  it("section titles follow PRD chapter 9", () => {
    const id = landing("id");
    const en = landing("en");
    for (const [key, want] of Object.entries(TITLES)) {
      expect({ key, value: id[key] }).toEqual({ key, value: want.id });
      expect({ key, value: en[key] }).toEqual({ key, value: want.en });
    }
  });

  it("standards strip puts ISO/IEC 27001:2022 Annex A first", () => {
    expect(landing("id").stripItems).toEqual([
      "ISO/IEC 27001:2022 Annex A",
      "NIST SSDF SP 800-218 (pelengkap)",
      "Semgrep",
      "Trivy",
    ]);
    expect(landing("en").stripItems).toEqual([
      "ISO/IEC 27001:2022 Annex A",
      "NIST SSDF SP 800-218 (complement)",
      "Semgrep",
      "Trivy",
    ]);
  });

  it("landing dictionary keys match and drop the guard pill", () => {
    const en = landing("en");
    const id = landing("id");
    expect(keys(id).sort()).toEqual(keys(en).sort());
    for (const l of [en, id]) {
      expect((l.pills as Record<string, Json>).guard).toBeUndefined();
      expect(typeof l.guardTitle).toBe("string");
      expect(typeof l.guardLede).toBe("string");
      expect(l.guardCards).toHaveLength(5);
    }
  });

  it("landing copy has no forbidden phrases", () => {
    const forbidden = [
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
    const hits = [...strings(landing("en")), ...strings(landing("id"))]
      .map((s) => s.toLowerCase())
      .flatMap((s) => forbidden.filter((p) => s.includes(p)).map((p) => `${p}: ${s}`));
    expect(hits).toEqual([]);
  });
});

describe("no autoplay on the landing page", () => {
  it("landing components have no autoplaying loop", () => {
    const patterns = ["setInterval", "animate-pulse", "animate-ping", "repeat: Infinity"];
    const offenders = walk("src/components/landing", /\.tsx$/).flatMap((f) => {
      const text = read(f);
      return patterns.filter((p) => text.includes(p)).map((p) => `${f}: ${p}`);
    });
    expect(offenders).toEqual([]);
  });

  it("prompt vignette shows the full prompt without typing", () => {
    const src = read(HOW);
    const start = src.indexOf("function PromptVignette");
    const end = src.indexOf("function PlanVignette");
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);
    expect(body).not.toContain("useState");
    expect(body).not.toContain("useEffect");
    expect(body).not.toContain("slice(");
    expect(body).toContain("{text}");
  });
});
