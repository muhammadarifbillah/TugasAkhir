import { cp, mkdir, rm } from "node:fs/promises";
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
console.log("[copy-monaco] copied Monaco assets to public/monaco/vs");
