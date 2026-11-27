import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import { findOffPalette } from "@/lib/palette";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";
import CreditsPage, { generateMetadata } from "./page";

const DICTS = { en, id };
type Descs = Record<string, { desc: string }>;
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const render = async (lang: "en" | "id") => renderToStaticMarkup(await CreditsPage({ params: Promise.resolve({ lang }) }));
const ALL = SITE_CATEGORIES.flatMap((c) => SITE_TEMPLATES[c.id].map((t) => ({ c, t })));

describe("example templates page (/credits)", () => {
  // R29 §6A-7
  it("lists all 24 FUSE example templates grouped per category with name and description", async () => {
    expect(ALL).toHaveLength(24);
    for (const lang of ["en", "id"] as const) {
      const html = await render(lang);
      const d = DICTS[lang];
      const groups = [...html.matchAll(/<section[^>]*data-credit-group="([^"]+)"/g)].map((m) => m[1]);
      expect(groups).toEqual(SITE_CATEGORIES.map((c) => c.id));
      const items = [...html.matchAll(/<li[^>]*data-credit-item="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)];
      expect(items.map((r) => r[1])).toEqual(ALL.map((x) => x.t.slug));
      items.forEach(([, , body], i) => {
        const { t } = ALL[i];
        expect(body).toContain(escape(t.name));
        expect(body).toContain(escape((d.templates as Descs)[t.slug].desc));
      });
      for (const c of SITE_CATEGORIES) expect(html).toContain(escape(d.categories.items[c.id].name));
    }
  });

  it("explains the templates are made by FUSE, with no third-party licence table or external links", async () => {
    for (const lang of ["en", "id"] as const) {
      const html = await render(lang);
      const d = DICTS[lang];
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain(escape(d.credits.title));
      expect(html).toContain(escape(d.credits.intro));
      expect(html).not.toContain("<table");
      expect(html).not.toMatch(/href="https?:/);
      expect(html).not.toMatch(/github\.com|htmlcodex|\bMIT\b|lisensi|licen[cs]e/i);
    }
    expect(id.credits.title).toBe("Contoh template");
    expect(id.credits.intro).toMatch(/dibuat .*FUSE/);
    expect(en.credits.intro).toMatch(/made by FUSE/);
  });

  it("generateMetadata returns the localised title", async () => {
    for (const lang of ["en", "id"] as const) {
      const meta = await generateMetadata({ params: Promise.resolve({ lang }) });
      expect(String(meta.title)).toContain(DICTS[lang].credits.title);
    }
  });

  it("credits copy has identical keys, no certification claims, and the page uses theme tokens without hex", () => {
    expect(Object.keys(en.credits).sort()).toEqual(Object.keys(id.credits).sort());
    const text = JSON.stringify([en.credits, id.credits]).toLowerCase();
    for (const p of ["certified", "compliant", "certification", "bersertifikat", "sertifikasi", "guaranteed", "dijamin", "terjamin"])
      expect(text).not.toContain(p);
    const src = readFileSync(join(process.cwd(), "src/app/[lang]/credits/page.tsx"), "utf8");
    expect(src).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(findOffPalette(src)).toEqual([]);
    for (const k of ["bg-background", "text-foreground", "border-border"]) expect(src).toContain(k);
    expect(src).not.toContain("backdrop");
    expect(src).not.toContain('"use client"');
  });
});
