import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findOffPalette } from "@/lib/palette";

const ROOT = process.cwd();

/** Landing and dashboard sources that must stay inside the five Colors Ideas colours. */
const SCOPE = [
  "src/components/landing",
  "src/components/dashboard",
  "src/components/site-art",
  "src/components/project-list.tsx",
  "src/app/[lang]/page.tsx",
  "src/app/[lang]/dashboard",
];

/** The only scoped file that shows a real status (the error alert of the project list). */
const STATUS_ALLOWED = ["src/components/project-list.tsx"];

/** Status tokens are the §0 exception: their values are not palette colours and stay unchanged. */
const STATUS_TOKENS = ["--destructive", "--destructive-foreground", "--success", "--success-foreground", "--warning", "--danger"];

/** Keputusan pemilik 2026-11-27: hero meniru warna herosection.jpeg. Only these two paths leave the palette. */
const HERO_EXEMPT = ["src/components/landing/hero/", "src/components/landing/gallery/hero-wall.tsx"];
const heroExempt = (rel: string) => HERO_EXEMPT.some((p) => (p.endsWith("/") ? rel.startsWith(p) : rel === p));

function scopedFiles(): string[] {
  const out: string[] = [];
  const visit = (rel: string) => {
    if (heroExempt(rel) || heroExempt(`${rel}/`)) return;
    const abs = path.join(ROOT, rel);
    if (fs.statSync(abs).isDirectory()) {
      for (const name of fs.readdirSync(abs)) visit(`${rel}/${name}`);
    } else if (/\.(ts|tsx|css)$/.test(rel) && !/\.test\./.test(rel)) out.push(rel);
  };
  for (const rel of SCOPE) visit(rel);
  return out;
}

const lineOf = (text: string, index: number) => text.slice(0, index).split("\n").length;

describe("palette guard", () => {
  it("palette helper flags off-palette samples and accepts palette samples", () => {
    const bad = [
      "#12284A",
      "#fff",
      "#FFFFFF80",
      "rgb(0 0 0 / .5)",
      "rgba(255, 255, 255, 0.1)",
      "rgb(5_13_28/0.82)",
      "hsl(24 72% 52%)",
      "oklch(0.6 0.1 240)",
      "color-mix(in oklab, var(--a) 45%, #0A1931)",
      "color-mix(in oklab, var(--a) 18%, var(--card))",
      "text-emerald-500",
      "bg-amber-50/40",
      "hover:bg-sky-400",
      "text-white",
      "bg-black/50",
      "border-white",
      'fill="white"',
    ];
    const good = [
      "#0a1931",
      "#B3CFE5",
      "#F6FAFD80",
      "rgb(10 25 49 / .6)",
      "rgba(26, 61, 99, 0.18)",
      "rgb(246_250_253/0.14)",
      "color-mix(in oklab, var(--x) 30%, transparent)",
      'href="#rak"',
      "#mulai-hero",
      "&#x27;",
      "whitespace-nowrap",
      "text-foreground",
      "bg-[var(--fuse-deep)]",
    ];
    for (const s of bad) expect(findOffPalette(s).length, s).toBeGreaterThan(0);
    for (const s of good) expect(findOffPalette(s), s).toEqual([]);
  });

  it("palette helper flags named colours and Tailwind default shadow/ring colours", () => {
    const bad = [
      'fill="red"',
      'stroke="black"',
      "bg-[red]",
      "text-[WhiteSmoke]",
      "color: white",
      "background: tomato;",
      'style={{ color: "navy" }}',
      'stop-color="gold"',
      "shadow-sm",
      'className="card shadow"',
      "hover:shadow-md",
      "shadow-lg",
      "shadow-xl",
      "shadow-2xl",
      "shadow-black/40",
      "ring-offset-white",
      "ring-white",
      "bg-white",
      "bg-black",
      "text-black",
      "from-sky-500",
      "via-indigo-400",
      "to-rose-300",
    ];
    const good = [
      'fill="none"',
      'stroke="currentColor"',
      "bg-[transparent]",
      "color: inherit",
      "background: transparent;",
      "fill={accent}",
      'fill="url(#company-hero)"',
      "shadow-[var(--fuse-shadow-soft)]",
      "shadow-[0_1px_3px_rgb(10_25_49/0.1)]",
      "shadow-none",
      "box-shadow: var(--clay-shadow);",
      "--shadow-color: 217 66% 12%;",
      "--clay-shadow-hover:",
      "bg-[var(--fuse-snow)]",
      "ring-ring",
      "ring-offset-background",
    ];
    for (const s of bad) expect(findOffPalette(s).length, s).toBeGreaterThan(0);
    for (const s of good) expect(findOffPalette(s), s).toEqual([]);
  });

  it("scoped landing and dashboard sources use only the five palette colours", () => {
    const files = scopedFiles();
    expect(files.length).toBeGreaterThanOrEqual(30);
    const hits: string[] = [];
    for (const f of files) {
      const text = fs.readFileSync(path.join(ROOT, f), "utf8");
      for (const h of findOffPalette(text)) hits.push(`${f}:${lineOf(text, h.index)}: ${h.match}`);
    }
    expect(hits).toEqual([]);
  });

  it("the hero exemption is exactly the hero folder and hero-wall.tsx; page.tsx stays palette-only", () => {
    expect(HERO_EXEMPT).toEqual(["src/components/landing/hero/", "src/components/landing/gallery/hero-wall.tsx"]);
    const heroDir = "src/components/landing/hero";
    const heroFiles = fs.readdirSync(path.join(ROOT, heroDir)).filter((f) => /\.(ts|tsx|css)$/.test(f) && !/\.test\./.test(f));
    expect(heroFiles.length).toBeGreaterThan(0);
    const files = scopedFiles();
    for (const f of heroFiles) expect(files, f).not.toContain(`${heroDir}/${f}`);
    expect(files).not.toContain("src/components/landing/gallery/hero-wall.tsx");
    for (const f of ["src/app/[lang]/page.tsx", "src/components/landing/gallery/template-shelf.tsx", "src/components/landing/gallery/category-viewer.tsx", "src/components/landing/fuse-waves.tsx"])
      expect(files, f).toContain(f);
  });

  it("status colours appear only where a status is shown", () => {
    const pattern = /\b(?:bg|text|border|fill|stroke|ring)-(?:success|warning|danger|destructive)\b|\bvar\(--(?:success|warning|danger|destructive|clay-danger)\b/g;
    const hits: string[] = [];
    for (const f of scopedFiles()) {
      if (STATUS_ALLOWED.includes(f)) continue;
      const text = fs.readFileSync(path.join(ROOT, f), "utf8");
      for (const m of text.matchAll(pattern)) hits.push(`${f}:${lineOf(text, m.index)}: ${m[0]}`);
    }
    expect(hits).toEqual([]);
  });

  it("globals.css FUSE region is palette-only", () => {
    const css = fs.readFileSync(path.join(ROOT, "src/app/globals.css"), "utf8");
    const START = "/* fuse-palette:start */";
    const END = "/* fuse-palette:end */";
    expect(css.split(START)).toHaveLength(2);
    expect(css.split(END)).toHaveLength(2);
    const start = css.indexOf(START);
    const end = css.indexOf(END);
    expect(start).toBeLessThan(end);
    const region = css.slice(start, end);
    for (const s of ["html.dark:has(.landing)", "html:not(.dark):has(.landing)", ".landing {", ".clay-btn"]) expect(region, s).toContain(s);
    const statusDecl = new RegExp(`(?<![\\w-])(?:${STATUS_TOKENS.join("|")}):[^;]*;`, "g");
    const stripped = region.replace(statusDecl, "");
    expect(findOffPalette(stripped).map((h) => `globals.css:${lineOf(css, start + h.index)}: ${h.match}`)).toEqual([]);
  });
});
