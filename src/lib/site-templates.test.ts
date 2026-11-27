import { closeSync, existsSync, openSync, readdirSync, readSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { SITE_CATEGORIES } from "./site-categories";
import { SITE_TEMPLATES, templatesFor } from "./site-templates";

const root = process.cwd();
const PUBLIC = join(root, "public");
const LOCAL_DIR = join(PUBLIC, "templates-local");
const OLD_CREDITS = join(PUBLIC, "templates", "CREDITS.md");

const DICTS = { en, id } as unknown as Record<string, Record<string, unknown>>;
const MAIN_PAGES = ["home", "overview", "intro"];
const CATEGORY_IDS = SITE_CATEGORIES.map((c) => c.id);
const all = () => CATEGORY_IDS.flatMap((c) => [...SITE_TEMPLATES[c]]);
const THIRD_PARTY = /github\.com|htmlcodex|\bMIT\b/i;
const FILLER = /lorem|placeholder/i;
// Common Indonesian function words; an Indonesian sentence uses at least one of them.
const ID_WORDS = /\b(dan|dengan|untuk|yang|di|ke|bernuansa|berwarna|halaman)\b/i;
const EN_WORDS = /\b(the|with|and|for|of|your)\b/i;

function at(tree: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, key) => (node && typeof node === "object" ? (node as Record<string, unknown>)[key] : undefined), tree);
}

/** Width/height of a WebP file from its VP8 / VP8L / VP8X header, or null when it is not a WebP. */
function webpSize(buf: Buffer): { w: number; h: number } | null {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") return null;
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (chunk === "VP8X") return { w: buf.readUIntLE(24, 3) + 1, h: buf.readUIntLE(27, 3) + 1 };
  return null;
}

/** First 32 bytes of a file: enough for the RIFF/WEBP header and the frame size. */
function head(file: string): Buffer {
  const buf = Buffer.alloc(32);
  const fd = openSync(file, "r");
  try {
    readSync(fd, buf, 0, 32, 0);
  } finally {
    closeSync(fd);
  }
  return buf;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe("site templates (FUSE examples)", () => {
  // §6A-1
  it("has 8 categories x exactly 3 templates, unique slugs, SITE_CATEGORIES order, mood only on the first", () => {
    expect(Object.keys(SITE_TEMPLATES)).toEqual(CATEGORY_IDS);
    for (const c of CATEGORY_IDS) {
      expect(SITE_TEMPLATES[c]).toHaveLength(3);
      expect(templatesFor(c)).toBe(SITE_TEMPLATES[c]);
      expect(SITE_TEMPLATES[c].map((t) => t.mood), c).toEqual([true, false, false]);
    }
    expect(new Set(all().map((t) => t.slug)).size).toBe(24);
  });

  // §6A-2
  it("gives every template at least 4 unique, named pages starting with its main page", () => {
    for (const t of all()) {
      expect(t.pages.length, t.slug).toBeGreaterThanOrEqual(4);
      expect(MAIN_PAGES, t.slug).toContain(t.pages[0].id);
      expect(new Set(t.pages.map((p) => p.id)).size, t.slug).toBe(t.pages.length);
      for (const lang of Object.keys(DICTS))
        for (const p of t.pages) {
          const name = at(DICTS[lang], `templatePages.${p.id}`);
          expect(typeof name === "string" && name.trim().length > 0, `${lang} templatePages.${p.id}`).toBe(true);
        }
    }
  });

  // §6A-3
  it("carries no third-party trace: licence 'Contoh FUSE', no source/licence URL/attribution, no old CREDITS.md content", () => {
    for (const t of all()) {
      expect(t.license, t.slug).toBe("Contoh FUSE");
      expect(t.source, t.slug).toBeNull();
      expect(t.licenseUrl, t.slug).toBeNull();
      expect(t.attribution, t.slug).toBeNull();
    }
    expect(JSON.stringify(SITE_TEMPLATES)).not.toMatch(THIRD_PARTY);
    if (existsSync(OLD_CREDITS)) expect(readFileSync(OLD_CREDITS, "utf8")).not.toMatch(THIRD_PARTY);
  });

  // §6A-4
  it("points src, thumb and mobile at WebP files in public/templates-local with the right sizes, 25 MB total", () => {
    const check = (web: string, w: number, h: number) => {
      expect(web.startsWith("/templates-local/"), web).toBe(true);
      const file = join(PUBLIC, web);
      expect(existsSync(file), web).toBe(true);
      expect(webpSize(head(file)), web).toEqual({ w, h });
    };
    for (const t of all()) {
      check(t.mobile, 360, 780);
      for (const p of t.pages) {
        check(p.src, 1200, 750);
        check(p.thumb, 400, 250);
      }
    }
    const files = walk(LOCAL_DIR);
    expect(files.filter((f) => !f.endsWith(".webp"))).toEqual([]);
    expect(files.reduce((sum, f) => sum + statSync(f).size, 0)).toBeLessThanOrEqual(25 * 1024 * 1024);
  });

  // §6A-5
  it("has no filler text and describes every template in Indonesian (id) and briefly in en", () => {
    expect(JSON.stringify(SITE_TEMPLATES)).not.toMatch(FILLER);
    for (const [lang, dict] of Object.entries(DICTS)) {
      for (const t of all()) {
        const desc = at(dict, `templates.${t.slug}.desc`);
        expect(typeof desc === "string" && desc.trim().length > 0, `${lang} templates.${t.slug}.desc`).toBe(true);
        expect(desc as string, `${lang} ${t.slug}`).not.toMatch(FILLER);
        expect(desc as string, `${lang} ${t.slug}`).not.toMatch(/secur|keamanan|\baman\b|certif|sertifi|\bISO\b|\bNIST\b/i);
        if (lang === "id") {
          expect(desc as string, t.slug).toMatch(ID_WORDS);
          expect(desc as string, t.slug).not.toMatch(EN_WORDS);
        }
      }
      const used = new Set(all().map((t) => t.slug));
      expect(Object.keys(at(dict, "templates") as object).filter((k) => !used.has(k)), `${lang} unused templates keys`).toEqual([]);
    }
  });
});
