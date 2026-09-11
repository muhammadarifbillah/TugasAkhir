import fs from "fs";
import path from "path";
import { STAGE_DEFINITIONS } from "../src/lib/stages";

const LOCALES = [
  "en", "id", "es", "zh", "hi", "ar", "fr", "pt", "ru", "ja", "de", "ko", "it", "tr",
] as const;

const dir = path.join(process.cwd(), "src", "dictionaries");

type JsonValue = Record<string, unknown>;

function flattenKeys(obj: JsonValue, prefix = ""): string[] {
  const keys: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as JsonValue, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

let failed = false;
const report: string[] = [];

const en = JSON.parse(fs.readFileSync(path.join(dir, "en.json"), "utf-8")) as JsonValue;
const enKeys = new Set(flattenKeys(en));

for (const loc of LOCALES) {
  const file = path.join(dir, `${loc}.json`);
  if (!fs.existsSync(file)) {
    failed = true;
    report.push(`[FAIL] ${loc}.json missing`);
    continue;
  }
  const dict = JSON.parse(fs.readFileSync(file, "utf-8")) as JsonValue;
  const keys = new Set(flattenKeys(dict));
  const missing = [...enKeys].filter((k) => !keys.has(k));
  const extra = [...keys].filter((k) => !enKeys.has(k));
  if (missing.length || extra.length) {
    failed = true;
    report.push(
      `[FAIL] ${loc}: missing=${missing.length} extra=${extra.length}` +
        (missing.slice(0, 8).join(", ") ? ` missing[${missing.slice(0, 8).join(", ")}]` : "") +
        (extra.slice(0, 8).join(", ") ? ` extra[${extra.slice(0, 8).join(", ")}]` : ""),
    );
  } else {
    report.push(`[OK]   ${loc}: ${keys.size} keys parity`);
  }
}

// Step-id coverage: every dict.stages.<code>.steps.<id> must exist for each STAGE_DEFINITION step.
const stagesObj = (en.stages ?? {}) as JsonValue;
for (const stage of STAGE_DEFINITIONS) {
  const expected = stage.steps.map((s) => s.id).sort();
  const stageEntry = (stagesObj[stage.code] ?? {}) as JsonValue;
  const stepsEntry = (stageEntry["steps"] ?? {}) as JsonValue;
  const actual = Object.keys(stepsEntry).sort();
  const miss = expected.filter((id) => !actual.includes(id));
  const extra = actual.filter((id) => !expected.includes(id));
  if (miss.length || extra.length) {
    failed = true;
    report.push(
      `[FAIL] stage ${stage.code}: steps mismatch missing=[${miss}] extra=[${extra}]`,
    );
  } else {
    report.push(`[OK]   stage ${stage.code}: ${actual.length} steps match stages.ts`);
  }
}

console.log(report.join("\n"));
console.log(failed ? "\nPARITY FAILED" : "\nPARITY OK — all 14 locales & stage steps aligned");
process.exit(failed ? 1 : 0);
