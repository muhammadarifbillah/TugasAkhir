import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { STAGE_DEFINITIONS } from "@/lib/stages";
import { contrastRatio } from "./contrast";
import { PALETTE } from "./palette";
import { BLOCK_KINDS, SITE_CATEGORIES, categoryForTemplate, type CategoryTone } from "./site-categories";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

type Tree = { [key: string]: Tree | string };
const DICTS = { en, id } as unknown as Record<string, { categories: Tree }>;

function at(tree: Tree, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Tree)[key] : undefined), tree);
}

function keys(tree: Tree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) => (typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`)));
}

describe("site categories", () => {
  it("site categories have a unique palette tone each", () => {
    expect(SITE_CATEGORIES).toHaveLength(8);
    expect(new Set(SITE_CATEGORIES.map((c) => c.id)).size).toBe(8);
    const expected: Record<string, CategoryTone> = {
      marketplace: { field: "snow", accent: "steel", soft: "deep", hero: ["deep", "steel"] },
      ecommerce: { field: "snow", accent: "deep", soft: "steel", hero: ["ink", "deep"] },
      lms: { field: "mist", accent: "deep", soft: "steel", hero: ["deep", "ink"] },
      saas: { field: "snow", accent: "deep", soft: "ink", hero: ["steel", "deep"] },
      clinic: { field: "mist", accent: "ink", soft: "steel", hero: ["steel", "ink"] },
      company: { field: "snow", accent: "ink", soft: "steel", hero: ["ink", "steel"] },
      news: { field: "mist", accent: "ink", soft: "deep", hero: ["ink", "deep"] },
      api: { field: "snow", accent: "steel", soft: "ink", hero: ["ink", "steel"] },
    };
    for (const c of SITE_CATEGORIES) {
      expect(c.tone, c.id).toEqual(expected[c.id]);
      expect("hue" in c, c.id).toBe(false);
      const t = c.tone;
      expect(["snow", "mist"]).toContain(t.field);
      expect(t.accent, c.id).not.toBe(t.soft);
      expect(contrastRatio(PALETTE[t.accent], PALETTE[t.field]), c.id).toBeGreaterThanOrEqual(3);
      expect(t.hero[0], c.id).not.toBe(t.hero[1]);
      for (const h of t.hero) {
        expect(["ink", "deep", "steel"]).toContain(h);
        expect(contrastRatio(PALETTE.snow, PALETTE[h]), `${c.id} ${h}`).toBeGreaterThanOrEqual(3);
      }
    }
    expect(new Set(SITE_CATEGORIES.map((c) => JSON.stringify(c.tone))).size).toBe(8);
  });

  it("every category has three pages with unique ids and non-empty block lists", () => {
    for (const c of SITE_CATEGORIES) {
      expect(c.pages).toHaveLength(3);
      expect(new Set(c.pages.map((p) => p.id)).size).toBe(3);
      for (const p of c.pages) {
        expect(p.blocks.length).toBeGreaterThan(0);
        for (const b of p.blocks) expect(BLOCK_KINDS).toContain(b);
      }
    }
  });

  it("the 24 pages together use all twelve block kinds", () => {
    const used = new Set(SITE_CATEGORIES.flatMap((c) => c.pages.flatMap((p) => p.blocks)));
    expect(BLOCK_KINDS).toHaveLength(12);
    expect([...used].sort()).toEqual([...BLOCK_KINDS].sort());
  });

  it("every security check names a NIST task and ISO control of its own stage in stages.ts", () => {
    for (const c of SITE_CATEGORIES) {
      expect(new Set(c.checks.map((k) => k.id)).size).toBe(3);
      for (const k of c.checks) {
        const stage = STAGE_DEFINITIONS.find((s) => s.code === k.stage);
        expect(stage, `${c.id}.${k.id}`).toBeDefined();
        expect(stage!.nistTasks, `${c.id}.${k.id}`).toContain(k.nist);
        expect(stage!.isoControls, `${c.id}.${k.id}`).toContain(k.iso);
      }
    }
  });

  it("every ALLOWED_TEMPLATES value, null, undefined and an unknown value map to a category", () => {
    const m = read("src/app/api/projects/route.ts").match(/ALLOWED_TEMPLATES = new Set\(\[([^\]]*)\]\)/);
    expect(m).not.toBeNull();
    const templates = [...m![1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
    expect(templates.length).toBeGreaterThan(0);
    for (const t of templates) expect(SITE_CATEGORIES.filter((c) => c.templates.includes(t)), t).toHaveLength(1);
    expect(categoryForTemplate("e-commerce").id).toBe("ecommerce");
    expect(categoryForTemplate("saas").id).toBe("saas");
    expect(categoryForTemplate("rest-api").id).toBe("api");
    expect(categoryForTemplate("lms").id).toBe("lms");
    for (const t of ["custom", null, undefined, "zzz"]) expect(categoryForTemplate(t).id).toBe("company");
  });

  it("id and en dictionaries describe every category, page, feature and check", () => {
    for (const [lang, d] of Object.entries(DICTS)) {
      const cat = d.categories;
      expect(cat, lang).toBeDefined();
      const str = (path: string) => {
        const v = at(cat, path);
        expect(typeof v, `${lang}:${path}`).toBe("string");
        expect((v as string).trim(), `${lang}:${path}`).not.toBe("");
      };
      str("galleryLabel");
      str("artLabel");
      expect(at(cat, "artLabel")).toContain("{page}");
      expect(at(cat, "artLabel")).toContain("{category}");
      for (const shelf of ["sell", "learn", "business", "tech"]) str(`shelves.${shelf}`);
      for (const c of SITE_CATEGORIES) {
        str(`items.${c.id}.name`);
        str(`items.${c.id}.desc`);
        for (const p of c.pages) str(`items.${c.id}.pages.${p.id}`);
        for (const f of c.features) str(`items.${c.id}.features.${f}`);
        for (const k of c.checks) str(`items.${c.id}.checks.${k.id}`);
      }
    }
    expect(keys(DICTS.id.categories).sort()).toEqual(keys(DICTS.en.categories).sort());
    for (const shelf of ["sell", "learn", "business", "tech"])
      expect(SITE_CATEGORIES.some((c) => c.shelf === shelf), shelf).toBe(true);
  });

  it("site-categories.ts imports neither React nor @/lib/stages", () => {
    const src = read("src/lib/site-categories.ts");
    expect(src).not.toMatch(/from ["']react["']/);
    expect(src).not.toContain("@/lib/stages");
    expect(src).not.toMatch(/from ["']\.\/stages["']/);
  });
});
