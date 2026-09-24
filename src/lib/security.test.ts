/**
 * Unit tests for the artifact-path validation that backstops the ZIP-slip fix.
 *
 * Run with:  npm test
 */
import { test } from "vitest";
import assert from "node:assert/strict";

import {
  validateArtifactPath,
  isSafeArtifactPath,
  findArtifactProblems,
  filterSafeArtifacts,
  MAX_ARTIFACT_FILES,
} from "./artifact-paths";

test("rejects traversal, absolute, drive, home and control-character paths", () => {
  const rejected = [
    "../../.env",
    "src/../../etc/passwd",
    "..",
    "a/../b",
    "/etc/cron.d/x",
    "C:/Windows/System32/x.dll",
    "c:\\windows\\x",
    "~/.ssh/authorized_keys",
    "src\\windows\\path.ts",
    "CON",
    "com1.txt",
    "nul",
    "",
    "a\u0000b",
    "src//empty-segment.ts",
  ];
  for (const path of rejected) {
    assert.equal(isSafeArtifactPath(path), false, `expected rejection: ${JSON.stringify(path)}`);
  }
});

test("accepts ordinary relative project paths", () => {
  const accepted = [
    "README.md",
    "package.json",
    "src/index.ts",
    "src/app/api/route.ts",
    ".github/workflows/security.yml",
    ".env.example",
    "docs/MANUAL-BOOK.md",
    "a/b/c/d/deep.tsx",
  ];
  for (const path of accepted) {
    assert.equal(
      validateArtifactPath(path),
      null,
      `expected acceptance: ${JSON.stringify(path)}`,
    );
  }
});

test("findArtifactProblems reports every offending entry", () => {
  const problems = findArtifactProblems({
    "src/ok.ts": "const a = 1;",
    "../../evil.sh": "rm -rf /",
    "/abs.sh": "x",
  });
  assert.equal(problems.length, 2);
  assert.ok(problems.some((p) => p.includes("evil.sh")));
  assert.ok(problems.some((p) => p.includes("abs.sh")));
});

test("findArtifactProblems enforces the file-count ceiling", () => {
  const many: Record<string, string> = {};
  for (let i = 0; i <= MAX_ARTIFACT_FILES; i++) many[`src/f${i}.ts`] = "x";
  const problems = findArtifactProblems(many);
  assert.ok(problems.some((p) => p.startsWith("too many files")));
});

test("findArtifactProblems enforces the per-file size ceiling", () => {
  const problems = findArtifactProblems({ "src/big.ts": "x".repeat(600 * 1024) });
  assert.ok(problems.some((p) => p.includes("file too large")));
});

test("filterSafeArtifacts drops unsafe entries and keeps safe ones", () => {
  const { files, rejected } = filterSafeArtifacts({
    "src/keep.ts": "ok",
    "../../drop.sh": "bad",
  });
  assert.deepEqual(Object.keys(files), ["src/keep.ts"]);
  assert.deepEqual(rejected, ["../../drop.sh"]);
});
