import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");
const PAGE = "src/app/[lang]/page.tsx";

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
    } else if (ext.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
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

const RETIRED = [
  "about-section",
  "architecture-flow",
  "audience-tiles",
  "deliverables",
  "gate-coupons",
  "gate-link",
  "glossary",
  "hero-shield",
  "how-it-works",
  "how-vignettes",
  "ledger",
  "proof-section",
  "substeps-disclosure",
];

const FINAL_KEYS = [
  "books", "closingLede", "closingTitle", "ctaDashboard", "ctaGates", "ctaPrimary", "faq", "faqHeading", "figure",
  "gallery", "limits", "limitsSectionTitle", "limitsTitle", "loop", "mapArtifact", "mapIso", "mapNist", "newTab",
  "pills", "previewShots", "previewTitle", "problemList", "problemStat", "problemStatShow", "problemStatSource",
  "problemStatUrl", "problemTitle", "shelf", "statNist", "statProviders", "statStages", "statSubsteps", "steps",
  "stripItems", "stripLabel",
];

describe("landing information architecture", () => {
  it("section anchors follow the final FUSE v2 order", () => {
    // The hero anchor moved into HeroSection (herosection.jpeg, 2026-11-27); it still renders first on the page.
    const page = read(PAGE).replace("<HeroSection", '<HeroSection id="mulai-hero"');
    expect(read("src/components/landing/hero/hero-section.tsx")).toContain('id="mulai-hero"');
    const ids = [...page.matchAll(/\bid="([a-z-]+)"/g)].map((m) => m[1]).filter((id) => !id.endsWith("-title"));
    expect(ids).toEqual(["mulai-hero", "rak", "masalah", "gerbang", "pratinjau", "hasil", "batasan", "mulai"]);
  });

  it("page renders gallery, strip with facts, shelf, problem, loop, preview, books, limits with FAQ and CTA in order", () => {
    const page = read(PAGE);
    // herosection.jpeg (2026-11-27): the hero is HeroSection, which renders HeroWall inside.
    const order = ["<HeroSection", "<StandardsStrip", "<TemplateShelf", "<ProblemSection", "<GateLoop", "<ProductPreview", "<BookShelf", "l.limits", "<Faq", 'id="mulai"'];
    const at = order.map((s) => page.indexOf(s));
    for (const [i, s] of order.entries()) expect(at[i], s).toBeGreaterThanOrEqual(0);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(page).toContain("facts={factList}");
    expect(page).toContain("defaultOpen={0}");
    for (const s of ["AboutSection", "ArchitectureFlow", "AudienceTiles", "Deliverables", "GateCoupons", "GateLinkProvider", "Glossary", "HowItWorks", "ProofSection", "SubStepsDisclosure", "139,92,246"])
      expect(page, s).not.toContain(s);
  });

  it("no hero-tape or retired landing component remains", () => {
    expect(existsSync(join(ROOT, "src/components/landing/hero-tape"))).toBe(false);
    expect(existsSync(join(ROOT, "scripts/hero-tape"))).toBe(false);
    for (const f of RETIRED) expect(existsSync(join(ROOT, `src/components/landing/${f}.tsx`)), f).toBe(false);
    const banned = ["hero-tape", "HeroTape", "heroTapeScene", "hero-shield", "gate-coupons", "proof-section", "substeps-disclosure", "gate-link", "how-vignettes", "components/landing/ledger"];
    const offenders = [...walk("src", /\.(ts|tsx|css)$/), ...walk("scripts", /\.(ts|tsx|css)$/)].flatMap((f) => {
      const text = read(f);
      return banned.filter((b) => text.includes(b)).map((b) => `${f}: ${b}`);
    });
    expect(offenders).toEqual([]);
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
    // The hero passes the CTA to HeroSection as a prop; the closing CTA still links directly.
    expect(page.match(/href=\{cta\.href\}/g) ?? []).toHaveLength(1);
    expect(page).toContain("ctaHref={cta.href}");
    expect(page).toContain('href="#gerbang"');
    expect(page).toContain("l.ctaGates");
  });
});

describe("landing copy", () => {
  it("landing dictionary has exactly the final keys in id and en", () => {
    for (const lang of ["id", "en"] as const) {
      const l = landing(lang);
      expect(Object.keys(l).sort(), lang).toEqual(FINAL_KEYS);
      expect(Object.keys(l.pills as Record<string, Json>).sort()).toEqual(["gates", "limits", "problem", "results", "start", "studio"]);
      const faq = l.faq as { q: string; a: string }[];
      expect(faq).toHaveLength(5);
      expect(faq[0].q).toContain("ISO 27001");
    }
    expect(keys(landing("id")).sort()).toEqual(keys(landing("en")).sort());
  });

  it("section titles and kept copy are pinned", () => {
    const want: Record<string, { id: string; en: string }> = {
      problemTitle: { id: "Kode buatan AI cepat jadi, tapi jarang diperiksa.", en: "AI code ships fast, rarely checked." },
      previewTitle: { id: "Ini studionya, bukan ilustrasi.", en: "This is the studio." },
      closingTitle: { id: "Mulai proyek pertama Anda", en: "Start your first project" },
      "loop.title": { id: "Satu putaran, lima gerbang.", en: "One loop, five gates." },
      "books.title": { id: "Yang Anda dapatkan dari satu proyek.", en: "What one project gives you." },
      limitsSectionTitle: { id: "Yang tidak kami janjikan, dan pertanyaan yang sering muncul.", en: "What we don't promise, and common questions." },
      ctaPrimary: { id: "Mulai proyek gratis", en: "Start a free project" },
    };
    const get = (l: Record<string, Json>, path: string) =>
      path.split(".").reduce<Json>((v, k) => (v && typeof v === "object" && !Array.isArray(v) ? v[k] : null), l);
    for (const [key, v] of Object.entries(want)) {
      expect({ key, value: get(landing("id"), key) }).toEqual({ key, value: v.id });
      expect({ key, value: get(landing("en"), key) }).toEqual({ key, value: v.en });
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

describe("kept landing components", () => {
  it("StandardsStrip, ProductPreview and Faq keep their contracts", async () => {
    const { StandardsStrip } = await import("@/components/landing/standards-strip");
    const { ProductPreview } = await import("@/components/landing/product-preview");
    const { Faq } = await import("@/components/landing/faq");

    const facts = [
      { label: "Stages", value: 5 },
      { label: "NIST tasks", value: 42 },
      { label: "Sub-steps", value: 26 },
      { label: "Providers", value: 12 },
    ];
    const items = ["ISO", "Semgrep"];
    const withFacts = renderToStaticMarkup(createElement(StandardsStrip, { label: "Mapped to", items, facts }));
    for (const f of facts) {
      expect(withFacts).toContain(f.label);
      expect(withFacts).toContain(`>${f.value}<`);
    }
    const plain = renderToStaticMarkup(createElement(StandardsStrip, { label: "Mapped to", items }));
    for (const f of facts) {
      expect(plain).not.toContain(f.label);
      expect(plain).not.toContain(`>${f.value}<`);
    }

    const shots = [0, 1, 2].map((i) => ({ src: `/landing/shot-${i}.jpg`, width: 400, height: 300, alt: `Alt ${i}`, caption: `Caption ${i}` }));
    const figureLabels = ["Fig 1", "Fig 2", "Fig 3"];
    const preview = renderToStaticMarkup(createElement(ProductPreview, { shots, figureLabels }));
    expect(preview.match(/<img/g)).toHaveLength(3);
    for (const s of shots) {
      expect(preview).toContain(`alt="${s.alt}"`);
      expect(preview).toContain(s.caption);
    }
    for (const f of figureLabels) expect(preview).toContain(f);

    const faq = renderToStaticMarkup(
      createElement(Faq, { items: [{ q: "Q1", a: "A1" }, { q: "Q2", a: "A2" }, { q: "Q3", a: "A3" }], defaultOpen: 0 }),
    );
    expect(faq.match(/<details[^>]*\sopen=""/g)).toHaveLength(1);
    expect(faq.indexOf('open=""')).toBeLessThan(faq.indexOf("Q2"));
  });

  it("product preview bezel paints the gradient card surface as a background, not a colour", () => {
    const src = read("src/components/landing/product-preview.tsx");
    for (const s of ["bg-[var(--fuse-card-bg)]", "var(--fuse-card-bg)_", 'stroke="var(--fuse-card-bg)"']) expect(src, s).not.toContain(s);
    expect(src).toContain("[background:var(--fuse-card-bg)]");
  });

  it("blueprint describes the final landing and its motion", () => {
    const bp = read("DESIGN-BLUEPRINT.md");
    for (const s of ["gate-loop", "book-shelf", "| M12 |", "| M13 |", "| M14 |"]) expect(bp, s).toContain(s);
    for (const s of ["Pita Pindai stage", "| M1 | Hero Pita Pindai", "gate-coupons"]) expect(bp, s).not.toContain(s);
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
});
