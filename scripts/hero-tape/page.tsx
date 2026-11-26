// Writes static poster pages (dark + light) for the anatomy kit's lines.mjs and capture.mjs.
// Run: npx tsx scripts/hero-tape/page.tsx <outDir> [--poses 0,0.5,0.75,1]   (--poses also writes hero-tape-<theme>-<p>.html)
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { HeroTapeFigure } from "@/components/landing/hero-tape/figure/art";
import { POSTER_POSE, poseOf, type Pose } from "@/components/landing/hero-tape/model";

const outDir = process.argv[2];
if (!outDir) {
  console.error("usage: npx tsx scripts/hero-tape/page.tsx <outDir> [--poses 0,0.5,0.75,1]");
  process.exit(2);
}

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** The first block that opens with `marker`, up to its closing brace (token blocks have no nesting). */
function block(css: string, marker: string): string {
  const at = css.indexOf(marker);
  if (at < 0) throw new Error(`not found in globals.css: ${marker}`);
  return css.slice(at, css.indexOf("\n}", at) + 2);
}

const globals = read("src/app/globals.css");
// The light .landing override carries the light --clay-bg; without it the light page keeps the dark ground.
const tokens = ["html.dark:has(.landing) {", "html:not(.dark):has(.landing) {", ".landing {", "html:not(.dark) .landing {"].map((m) => block(globals, m));
const style = [
  read("src/components/iso/iso.css"),
  read("src/components/landing/hero-tape/hero-tape.css"),
  ...tokens,
  "body { margin: 0; background: var(--clay-bg); } .landing { min-height: 100vh; overflow: hidden; } .wrap { max-width: 760px; margin: 40px auto; }",
].join("\n");
const at = process.argv.indexOf("--poses");
const poses: [string, Pose][] = [
  ["", POSTER_POSE],
  ...(at < 0 ? [] : process.argv[at + 1]!.split(",").map((p): [string, Pose] => [`-${p}`, poseOf(Number(p))])),
];

mkdirSync(outDir, { recursive: true });
for (const [suffix, pose] of poses) {
  const svg = renderToStaticMarkup(<HeroTapeFigure pose={pose} />);
  for (const theme of ["dark", "light"] as const) {
    const html = `<!doctype html><html${theme === "dark" ? ' class="dark"' : ""} lang="id"><head><meta charset="utf-8"><title>hero tape ${theme}${suffix}</title><style>${style}</style></head><body><div class="landing"><div class="wrap iso hero-tape-figure">${svg}</div></div></body></html>`;
    const file = join(outDir, `hero-tape-${theme}${suffix}.html`);
    writeFileSync(file, html);
    console.log(file);
  }
}
