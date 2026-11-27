import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { SITE_CATEGORIES } from "./site-categories";
import { SITE_TEMPLATES, templatesFor } from "./site-templates";

const root = process.cwd();
const PUBLIC = join(root, "public");
const TEMPLATES_DIR = join(PUBLIC, "templates");

type Source = { slug: string; name: string; license: string; pages: { id: string }[] };
const SOURCES = JSON.parse(readFileSync(join(root, "scripts/templates/sources.json"), "utf8")) as Record<string, Source[]>;

const DICTS = { en, id } as unknown as Record<string, Record<string, unknown>>;
const LICENSES = ["MIT", "BSD-2-Clause", "BSD-3-Clause", "Apache-2.0", "ISC", "CC0-1.0", "CC-BY-4.0", "CC-BY-3.0"];
const MAIN_PAGES = ["home", "overview", "intro", "dashboard", "quickstart"];
const CATEGORY_IDS = SITE_CATEGORIES.map((c) => c.id);
const all = () => CATEGORY_IDS.flatMap((c) => [...SITE_TEMPLATES[c]]);

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

describe("site templates", () => {
  it("has exactly 8 category keys with 3 templates each and globally unique slugs", () => {
    expect(Object.keys(SITE_TEMPLATES).sort()).toEqual([...CATEGORY_IDS].sort());
    for (const c of CATEGORY_IDS) {
      expect(SITE_TEMPLATES[c]).toHaveLength(3);
      expect(templatesFor(c)).toBe(SITE_TEMPLATES[c]);
    }
    const slugs = all().map((t) => t.slug);
    expect(new Set(slugs).size).toBe(24);
  });

  it("marks only the first template of each category as mood, in sources.json order and names", () => {
    expect(Object.keys(SOURCES).sort()).toEqual([...CATEGORY_IDS].sort());
    for (const c of CATEGORY_IDS) {
      const list = SITE_TEMPLATES[c];
      expect(list.map((t) => t.mood)).toEqual([true, false, false]);
      expect(list.map((t) => [t.slug, t.name])).toEqual(SOURCES[c].map((s) => [s.slug, s.name]));
    }
  });

  it("gives every template at least 4 unique pages starting with its main page", () => {
    for (const t of all()) {
      expect(t.pages.length, t.slug).toBeGreaterThanOrEqual(4);
      expect(MAIN_PAGES, t.slug).toContain(t.pages[0].id);
      expect(new Set(t.pages.map((p) => p.id)).size, t.slug).toBe(t.pages.length);
    }
  });

  it("uses only permissive licenses, CC-BY with attribution, and https source and license URLs", () => {
    for (const t of all()) {
      expect(LICENSES, t.slug).toContain(t.license);
      if (t.license.startsWith("CC-BY")) expect(t.attribution?.trim(), t.slug).toBeTruthy();
      expect(new URL(t.source).protocol, t.slug).toBe("https:");
      expect(new URL(t.licenseUrl).protocol, t.slug).toBe("https:");
    }
  });

  it("points src, thumb and mobile at existing WebP files with the right sizes", () => {
    const check = (web: string, w: number, h: number) => {
      expect(web.startsWith("/templates/"), web).toBe(true);
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
  });

  it("keeps public/templates under 25 MB with only WebP files and one CREDITS.md", () => {
    const files = walk(TEMPLATES_DIR);
    const total = files.reduce((sum, f) => sum + statSync(f).size, 0);
    expect(total).toBeLessThanOrEqual(25 * 1024 * 1024);
    const others = files.filter((f) => !f.endsWith(".webp")).map((f) => f.slice(TEMPLATES_DIR.length + 1));
    expect(others).toEqual(["CREDITS.md"]);
  });

  it("names every used page and describes every template in id and en", () => {
    for (const [lang, dict] of Object.entries(DICTS)) {
      for (const t of all()) {
        const desc = at(dict, `templates.${t.slug}.desc`);
        expect(typeof desc === "string" && desc.trim().length > 0, `${lang} templates.${t.slug}.desc`).toBe(true);
        expect(desc as string, `${lang} ${t.slug}`).not.toMatch(/secur|keamanan|\baman\b|certif|sertifi|\bISO\b|\bNIST\b/i);
        for (const p of t.pages) {
          const name = at(dict, `templatePages.${p.id}`);
          expect(typeof name === "string" && name.trim().length > 0, `${lang} templatePages.${p.id}`).toBe(true);
        }
      }
    }
  });

  it("credits all 24 templates with name, source, license and attribution", () => {
    const credits = readFileSync(join(TEMPLATES_DIR, "CREDITS.md"), "utf8");
    for (const t of all()) {
      expect(credits, t.slug).toContain(t.name);
      expect(credits, t.slug).toContain(t.source);
      expect(credits, t.slug).toContain(t.license);
      if (t.attribution) expect(credits, t.slug).toContain(t.attribution);
    }
  });
});
