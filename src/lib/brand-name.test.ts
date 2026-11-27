import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/dictionaries/en.json";
import id from "@/dictionaries/id.json";
import manifest from "@/app/manifest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Built from pieces so this file never counts as an occurrence of the old name.
const OLD = ["shield", "forge"].join("");
const OLD_RE = new RegExp(OLD, "i");
// Legacy dev account: changing the email orphans the existing dev user's projects.
const EXCEPTIONS = ['src/auth.ts:const DEV_EMAIL = "dev@' + OLD + '.local";'];
const FORBIDDEN = /kepatuhan|patuh|complian|bersertifikat|terjamin|diperkeras|certified|hardened|guaranteed|100% aman/i;

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

function strings(v: unknown, path = ""): Array<[string, string]> {
  if (typeof v === "string") return [[path, v]];
  if (Array.isArray(v)) return v.flatMap((x, i) => strings(x, `${path}[${i}]`));
  if (v && typeof v === "object") return Object.entries(v).flatMap(([k, x]) => strings(x, path ? `${path}.${k}` : k));
  return [];
}

const DICTS = { en, id } as Record<string, Record<string, unknown>>;

const MARK_TOP =
  "M 0,26.8 A 26.8,26.8 0 0 1 26.8,0 L 102.1,0 A 2.5,2.5 0 0 1 104.6,2.5 L 104.6,12.6 A 19.2,19.2 0 0 1 85.4,31.8 L 17,31.8 A 21,21 0 0 0 0,40.47 Z";
const MARK_BOTTOM =
  "M 26.8,39 L 80.3,39 A 2.5,2.5 0 0 1 82.8,41.5 L 82.8,51.6 A 16.7,16.7 0 0 1 66.1,68.3 L 40.2,68.3 A 10.9,10.9 0 0 0 29.3,79.2 L 29.3,81.6 A 18.4,18.4 0 0 1 10.9,100 L 2.5,100 A 2.5,2.5 0 0 1 0,97.5 L 0,65.8 A 26.8,26.8 0 0 1 26.8,39 Z";

describe("brand name", () => {
  it('app.name is "FUSE" in en and id', () => {
    expect(en.app.name).toBe("FUSE");
    expect(id.app.name).toBe("FUSE");
  });

  it("no dictionary string still names the product Saksi", () => {
    const hits = Object.entries(DICTS).flatMap(([lang, d]) =>
      strings(d)
        .filter(([, s]) => /\bSaksi\b/.test(s))
        .map(([p]) => `${lang}:${p}`),
    );
    expect(hits).toEqual([]);
  });

  it("app.tagline uses the witness tagline in en and id", () => {
    expect(en.app.tagline).toBe("AI code ships only with a witness. Every gate is mapped to ISO/IEC 27001:2022.");
    expect(id.app.tagline).toBe("Kode AI lolos hanya bila ada saksinya. Setiap gerbang dipetakan ke ISO/IEC 27001:2022.");
  });

  it("no dictionary string contains the old name", () => {
    const hits = Object.entries(DICTS).flatMap(([lang, d]) =>
      strings(d)
        .filter(([, s]) => OLD_RE.test(s))
        .map(([p]) => `${lang}:${p}`),
    );
    expect(hits).toEqual([]);
  });

  it("no non-test source under src contains the old name except the recorded exceptions", () => {
    const files = (readdirSync(join(ROOT, "src"), { recursive: true }) as string[])
      .map((f) => `src/${f.replace(/\\/g, "/")}`)
      .filter((f) => /\.(ts|tsx|json|css)$/.test(f) && !f.endsWith(".test.ts") && !f.startsWith("src/generated/"));
    const hits = files.flatMap((f) =>
      read(f)
        .split(/\r?\n/)
        .filter((line) => OLD_RE.test(line))
        .map((line) => `${f}:${line.trim()}`),
    );
    expect(hits).toEqual(EXCEPTIONS);
  });

  it("app, landing, dashboard and auth copy has no compliance or forbidden phrases", () => {
    const hits = Object.entries(DICTS).flatMap(([lang, d]) =>
      (["app", "landing", "dashboard", "auth", "categories"] as const).flatMap((ns) =>
        strings(d[ns] ?? {}, ns)
          .filter(([, s]) => FORBIDDEN.test(s))
          .map(([p, s]) => `${lang}:${p}: ${s}`),
      ),
    );
    expect(hits).toEqual([]);
  });

  it("manifest uses the new name and short_name", () => {
    const m = manifest();
    expect(m.short_name).toBe("FUSE");
    expect(m.name?.startsWith("FUSE")).toBe(true);
    expect(m.theme_color).toBe("#0A1931");
  });

  it("layout metadata titles, OG wordmark and footer template use the new name", () => {
    const layout = read("src/app/[lang]/layout.tsx");
    expect(layout.split('title: "FUSE — ').length - 1).toBe(2);
    expect(layout).toContain("label={`${dict.app.name} — ${dict.app.tagline} ${dict.app.frameworkNote}`}");
    expect(layout).toContain("name={dict.app.name}");
    const og = read("src/app/opengraph-image.tsx");
    expect(og).toContain(">FUSE</div>");
    expect(og).toContain('alt = "FUSE');
  });

  it("FuseLockup renders an accessible two-part gradient mark and the USE wordmark", async () => {
    const { FuseLockup } = await import("@/components/brand/fuse-lockup");
    const html = renderToStaticMarkup(createElement(FuseLockup, { label: "FUSE" }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="FUSE"');
    expect(html.match(/class="fuse-mark"/g)).toHaveLength(2);
    expect(html).toContain(`d="${MARK_TOP}"`);
    expect(html).toContain(`d="${MARK_BOTTOM}"`);
    const words = html.match(/<path[^>]*class="fuse-word"[^>]*>/g) ?? [];
    expect(words).toHaveLength(1);
    expect(words[0]).toContain('fill="currentColor"');
    expect(html).toContain("#04A2FB");
    expect(html).toContain("#8448FC");
    const ids = [...html.matchAll(/<linearGradient[^>]*id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(html).not.toContain("<rect");
    expect(html).not.toContain("<text");
  });

  it("header and footer render the lockup; header drops the shield icon", () => {
    const header = read("src/components/header.tsx");
    expect(header).toContain("<FuseLockup");
    expect(header).toContain('from "@/components/brand/fuse-lockup"');
    expect(header).not.toContain("ShieldCheck");
    expect(read("src/components/site-footer.tsx")).toContain("<FuseLockup");
    expect(read("src/app/globals.css")).toMatch(/\.dark \.fuse-mark \{[^}]*fill: currentColor/);
  });

  it("icon.svg is the FUSE mark", () => {
    const icon = read("src/app/icon.svg");
    expect(icon).toContain("#04A2FB");
    expect(icon).toContain("#8448FC");
    expect(icon).not.toContain("#7c6cf6");
  });

  // rename Saksi → FUSE 2026-11-27: product outputs, package name and docs now carry FUSE.
  it("product outputs use FUSE", () => {
    expect(read("src/components/landing/loop/gate-loop.tsx")).toContain('"fuse-matriks-nist-iso.csv"');
    const panel = read("src/components/studio/deliverables-panel.tsx");
    expect(panel).toContain('"fuse-website"');
    expect(panel).toContain("fuse-${projectId}.zip");
    expect(panel).toContain("[![FUSE](https://img.shields.io/badge/FUSE-");
    expect(read("src/app/api/github/push/route.ts")).toContain("via FUSE");
    expect(read("src/app/api/revisions/route.ts")).toContain("via FUSE");
    const docs = read("src/lib/docs.ts");
    expect(docs).toContain("Generated by FUSE");
    expect(docs).toContain("name: FUSE Security Pipeline");
    expect(read("src/lib/pdf.tsx")).toContain("Generated by FUSE");
  });

  it('package.json and package-lock.json root name is "fuse"', () => {
    expect(JSON.parse(read("package.json")).name).toBe("fuse");
    const lock = JSON.parse(read("package-lock.json"));
    expect(lock.name).toBe("fuse");
    expect(lock.packages[""].name).toBe("fuse");
  });

  it("no source names the product Saksi and no saksi- slug remains", () => {
    const list = (dir: string) =>
      (readdirSync(join(ROOT, dir), { recursive: true }) as string[])
        .map((f) => `${dir}/${f.replace(/\\/g, "/")}`)
        .filter((f) => /\.(ts|tsx|json|css)$/.test(f) && !f.startsWith("src/generated/"));
    const src = list("src");
    // Built from pieces so this file never matches its own check.
    const SLUG = ["sak", "si-"].join("");
    const wordHits = src
      .filter((f) => !/\.test\.tsx?$/.test(f) && !f.startsWith("src/dictionaries/"))
      .flatMap((f) => read(f).split(/\r?\n/).filter((l) => /\bSaksi\b/.test(l)).map((l) => `${f}:${l.trim()}`));
    const slugHits = [...src, ...list("scripts"), "package.json"]
      .flatMap((f) => read(f).split(/\r?\n/).filter((l) => l.includes(SLUG)).map((l) => `${f}:${l.trim()}`));
    expect(wordHits).toEqual([]);
    expect(slugHits).toEqual([]);
  });

  it("old favicon.ico is gone and icon.svg stays the FUSE mark", () => {
    expect(existsSync(join(ROOT, "src/app/favicon.ico"))).toBe(false);
    expect(read("src/app/icon.svg")).toContain("#04A2FB");
  });

  it("README starts with # FUSE and DEPLOY.md no longer names Saksi", () => {
    expect(read("README.md").startsWith("# FUSE")).toBe(true);
    expect(read("DEPLOY.md")).not.toMatch(/\bSaksi\b/);
  });

  it("docker-compose keeps the legacy shieldforge-db volume", () => {
    const compose = read("docker-compose.yml");
    expect(compose).toContain(`- ${OLD}-db:/var/lib/postgresql/data`);
    expect(compose.split(/\r?\n/)).toContain(`  ${OLD}-db:`);
  });
});
