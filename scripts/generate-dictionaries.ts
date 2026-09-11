import fs from "node:fs";
import path from "node:path";
import { locales, defaultLocale, type Locale } from "../src/lib/i18n";

/**
 * Normalises the shipped dictionaries.
 *
 * The JSON files in `src/dictionaries` are the SOURCE OF TRUTH for all copy —
 * they are edited through the file tools, which guarantees UTF-8. This script
 * only rewrites them with stable formatting and then asserts that every
 * supported locale is a complete superset of the English dictionary, so a
 * missing key fails loudly here instead of rendering as an empty string in the UI.
 */
const dir = path.join(process.cwd(), "src", "dictionaries");

type Json = Record<string, unknown>;

function readDictionary(locale: Locale): Json {
  const file = path.join(dir, `${locale}.json`);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing dictionary: ${file}`);
  }
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Json;
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value as Json).flatMap(([key, child]) =>
    flattenKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

const base = readDictionary(defaultLocale);
const baseKeys = new Set(flattenKeys(base));

let failed = false;

for (const locale of locales) {
  const dict = locale === defaultLocale ? base : readDictionary(locale);
  const keys = new Set(flattenKeys(dict));

  const missing = [...baseKeys].filter((key) => !keys.has(key));
  const extra = [...keys].filter((key) => !baseKeys.has(key));

  if (missing.length > 0 || extra.length > 0) {
    failed = true;
    console.error(`[FAIL] ${locale}: missing=${missing.length} extra=${extra.length}`);
    if (missing.length > 0) console.error(`        missing: ${missing.join(", ")}`);
    if (extra.length > 0) console.error(`        extra:   ${extra.join(", ")}`);
    continue;
  }

  // Rewrite with stable 2-space formatting, always as UTF-8 without a BOM.
  fs.writeFileSync(
    path.join(dir, `${locale}.json`),
    `${JSON.stringify(dict, null, 2)}\n`,
    "utf-8",
  );
  console.log(`[OK]   ${locale}: ${keys.size} keys`);
}

if (failed) {
  console.error("\nDICTIONARY CHECK FAILED");
  process.exit(1);
}

console.log(`\nDictionaries normalised for ${locales.length} locales: ${locales.join(", ")}`);
