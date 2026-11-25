import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

/** Every `*.ts`/`*.tsx` under `dir`, tests and generated code excluded; repo-relative with `/`. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (path === "src/generated") continue;
      walk(path, out);
    } else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

const LAYOUT = "src/app/[lang]/layout.tsx";

describe("landing layout carrier", () => {
  it("layout: #main is position relative", () => {
    expect(read(LAYOUT)).toMatch(/<main[^>]*id="main"[^>]*className="[^"]*\brelative\b/);
  });

  it("layout: #main-content wraps children and SiteFooter", () => {
    expect(read(LAYOUT)).toMatch(
      /<main[^>]*id="main"[^>]*>\s*<div id="main-content"[^>]*>\s*\{children\}[\s\S]*?<SiteFooter[\s\S]*?\/>\s*<\/div>\s*<\/main>/,
    );
  });

  it("layout: no transform on the scroll container", () => {
    const layout = read(LAYOUT);
    const mainBlock = layout.slice(layout.indexOf("<main"), layout.indexOf("</main>"));
    expect(mainBlock).not.toMatch(/transform|translate-|scale-|will-change/);
  });
});

describe("gsap/lenis import discipline", () => {
  const staticPatterns = [
    /^\s*import\s+(?!type\b)[^;]*?\bfrom\s*["'](gsap|lenis)(\/[^"']*)?["']/m,
    /^\s*import\s*["'](gsap|lenis)(\/[^"']*)?["']/m,
    /^\s*export\s+[^;]*?\bfrom\s*["'](gsap|lenis)(\/[^"']*)?["']/m,
    /require\(\s*["'](gsap|lenis)/,
  ];

  it("no static gsap/lenis import anywhere in src", () => {
    const offenders = walk("src").filter((file) =>
      staticPatterns.some((pattern) => pattern.test(read(file))),
    );
    expect(offenders).toEqual([]);
  });

  it("dynamic gsap/lenis import only in landing-motion.tsx", () => {
    const dynamicImport = /import\(\s*["'](gsap|lenis)(\/[^"']*)?["']\s*\)/;
    const offenders = walk("src").filter((file) => dynamicImport.test(read(file)));
    expect(offenders).toEqual(["src/components/landing/landing-motion.tsx"]);
  });

  it("LandingMotion is mounted only by the landing page", () => {
    const users = walk("src/app").filter((file) =>
      read(file).includes("components/landing/landing-motion"),
    );
    expect(users).toEqual(["src/app/[lang]/page.tsx"]);
  });

  it("package.json pins gsap 3.15.x and lenis 1.3.x", () => {
    const pkg = JSON.parse(read("package.json")) as {
      dependencies: Record<string, string>;
    };
    expect(pkg.dependencies.gsap).toMatch(/^\^?3\.15\./);
    expect(pkg.dependencies.lenis).toMatch(/^\^?1\.3\./);
  });
});

describe("anatomy kit", () => {
  it("anatomy kit is copied with its MIT notice", () => {
    const license = read("src/components/iso/LICENSE");
    expect(license).toContain("MIT License");
    expect(license).toContain("Copyright (c) 2026 Ryan");

    for (const file of [
      "src/components/iso/iso-kit.ts",
      "src/components/iso/react/draw.tsx",
      "src/components/iso/react/live.tsx",
    ]) {
      expect(existsSync(join(ROOT, file))).toBe(true);
      const head = read(file).split(/\r?\n/).slice(0, 5).join("\n");
      expect(head).toContain("anatomy");
      expect(head).toContain("MIT");
    }
  });
});

describe("design blueprint", () => {
  it("blueprint 7.1 allows landing GSAP + Lenis under PRD rules", () => {
    const blueprint = read("DESIGN-BLUEPRINT.md");
    expect(blueprint).not.toContain("No smooth-scroll library, no GSAP");
    expect(blueprint).not.toContain("No scroll-linked animation.");
    for (const phrase of [
      "Landing scroll (GSAP + Lenis)",
      "LANDING_MOTION_QUERY",
      "#main-content",
      "Standard no-charge",
      ".pin-spacer",
      "reduce, not remove",
    ]) {
      expect(blueprint).toContain(phrase);
    }
  });
});
