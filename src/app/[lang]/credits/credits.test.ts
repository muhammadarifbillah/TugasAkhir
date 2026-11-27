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
const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const render = async (lang: "en" | "id") => renderToStaticMarkup(await CreditsPage({ params: Promise.resolve({ lang }) }));
const ALL = SITE_CATEGORIES.flatMap((c) => SITE_TEMPLATES[c.id].map((t) => ({ c, t })));

describe("credits page", () => {
  it("lists all 24 templates grouped per category with licence and source links", async () => {
    expect(ALL).toHaveLength(24);
    for (const lang of ["en", "id"] as const) {
      const html = await render(lang);
      const d = DICTS[lang];
      const rows = [...html.matchAll(/<tr[^>]*data-credit-row="([^"]+)"[^>]*>([\s\S]*?)<\/tr>/g)];
      expect(rows.map((r) => r[1])).toEqual(ALL.map((x) => x.t.slug));
      rows.forEach(([, , body], i) => {
        const { c, t } = ALL[i];
        expect(body).toContain(escape(d.categories.items[c.id].name));
        expect(body).toContain(escape(t.name));
        expect(body).toContain(`href="${escape(t.licenseUrl)}"`);
        expect(body).toMatch(new RegExp(`<a[^>]*href="${escape(t.licenseUrl).replace(/[.?*+^$()[\]\\|{}]/g, "\\$&")}"[^>]*>${escape(t.license)}</a>`));
        expect(body).toContain(`href="${escape(t.source)}"`);
        if (t.attribution) expect(body).toContain("Designed by HTML Codex");
      });
      // grouped: one heading per category, in SITE_CATEGORIES order
      const groups = [...html.matchAll(/<tbody[^>]*data-credit-group="([^"]+)"/g)].map((m) => m[1]);
      expect(groups).toEqual(SITE_CATEGORIES.map((c) => c.id));
    }
  });

  it("every external link opens safely and the page has one h1, the intro and the copyright sentence", async () => {
    for (const lang of ["en", "id"] as const) {
      const html = await render(lang);
      const d = DICTS[lang];
      const links = [...html.matchAll(/<a[^>]*href="https?:[^"]*"[^>]*>/g)].map((m) => m[0]);
      expect(links.length).toBeGreaterThanOrEqual(48);
      for (const a of links) expect(a).toContain('rel="noopener noreferrer"');
      expect(html.match(/<h1/g)).toHaveLength(1);
      expect(html).toContain(escape(d.credits.title));
      expect(html).toContain(escape(d.credits.intro));
      expect(d.credits.intro).toMatch(lang === "en" ? /remain the property of their authors/ : /tetap milik pembuatnya/);
      for (const k of ["category", "template", "license", "source", "attribution"] as const)
        expect(html).toContain(escape(d.credits.columns[k]));
    }
    expect(id.credits.intro).toBe(
      "FUSE menampilkan tangkapan layar template open-source sebagai contoh jenis website. Template dan isinya tetap milik pembuatnya dan dipakai sesuai lisensinya.",
    );
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
