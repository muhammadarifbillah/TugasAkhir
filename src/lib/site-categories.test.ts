import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { STAGE_DEFINITIONS } from "@/lib/stages";
import { SITE_CATEGORIES, categoryForTemplate } from "./site-categories";

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
  // R27: SiteArt is gone, so its illustration data (tone, page blocks, BLOCK_KINDS) went with it. The tone/block tests were
  // removed; the page ids stay because the shelf search matches the page names (gallery-logic searchCategories).
  it("SiteArt and its illustration data are gone; the data the viewer and shelf use stays", () => {
    expect(existsSync(join(process.cwd(), "src/components/site-art/site-art.tsx"))).toBe(false);
    expect(SITE_CATEGORIES).toHaveLength(8);
    expect(new Set(SITE_CATEGORIES.map((c) => c.id)).size).toBe(8);
    for (const c of SITE_CATEGORIES) {
      expect(Object.keys(c).sort(), c.id).toEqual(["checks", "features", "id", "pages", "shelf", "stack", "templates"]);
      expect(c.pages).toHaveLength(3);
      expect(new Set(c.pages.map((p) => p.id)).size).toBe(3);
      for (const p of c.pages) expect(Object.keys(p), `${c.id}.${p.id}`).toEqual(["id"]);
      expect(c.features).toHaveLength(3);
      expect(c.stack.length).toBeGreaterThan(0);
    }
    const src = read("src/lib/site-categories.ts");
    for (const s of ["tone", "blocks", "BLOCK_KINDS", "CategoryTone", "./palette"]) expect(src, s).not.toContain(s);
  });

  it("no source under src still references SiteArt or the illustration data", () => {
    const hits: string[] = [];
    const visit = (rel: string) => {
      const abs = join(process.cwd(), rel);
      if (statSync(abs).isDirectory()) for (const n of readdirSync(abs)) visit(`${rel}/${n}`);
      else if (/\.(ts|tsx)$/.test(rel) && !/\.test\.ts$/.test(rel)) {
        const text = readFileSync(abs, "utf8");
        for (const s of ["SiteArt", "site-art/site-art", "BLOCK_KINDS", "CategoryTone"]) if (text.includes(s)) hits.push(`${rel}: ${s}`);
      }
    };
    visit("src");
    expect(hits).toEqual([]);
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
      // R27: artLabel only labelled the SiteArt illustration.
      expect(at(cat, "artLabel"), lang).toBeUndefined();
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
