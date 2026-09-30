import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Copies Monaco's prebuilt AMD assets into `public/monaco/vs` so the editor is
 * served from our own origin instead of cdn.jsdelivr.net. This lets the CSP drop
 * the third-party script origin and keeps the editor working offline.
 */
const src = path.join(process.cwd(), "node_modules", "monaco-editor", "min", "vs");
const dest = path.join(process.cwd(), "public", "monaco", "vs");

if (!existsSync(src)) {
  console.warn("[copy-monaco] monaco-editor is not installed; skipping");
  process.exit(0);
}

await rm(dest, { recursive: true, force: true });
await mkdir(path.dirname(dest), { recursive: true });
await cp(src, dest, { recursive: true });

/**
 * Monaco's min files reference source maps under `min-maps/…`, which the package
 * does not ship. Browsers with DevTools open then request a non-existent map and
 * log a 404. Stripping the `sourceMappingURL` comments removes that noise (maps
 * are debug-only and not needed at runtime).
 */
async function stripSourceMapReferences(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await stripSourceMapReferences(full);
      continue;
    }
    if (!/\.(js|css)$/i.test(entry.name)) continue;
    const content = await readFile(full, "utf8");
    if (!content.includes("sourceMappingURL")) continue;
    // Only strip actual source-map comments, which sit on their own line at the
    // end of the file. Matching anywhere would corrupt files that merely contain
    // the literal string "sourceMappingURL" in code (e.g. the TS worker).
    const cleaned = content
      .replace(/^\/\/#\s*sourceMappingURL=.*$/gm, "")
      .replace(/^\/\*#\s*sourceMappingURL=[\s\S]*?\*\//gm, "");
    if (cleaned !== content) await writeFile(full, cleaned, "utf8");
  }
}

await stripSourceMapReferences(dest);
console.log("[copy-monaco] copied Monaco assets to public/monaco/vs");

