import { test } from "vitest";
import assert from "node:assert/strict";

import { sanitizeMermaid } from "./mermaid";

test("strips markdown fences and unescapes literal \\n", () => {
  const out = sanitizeMermaid("```mermaid\nflowchart TD\\n  A --> B\n```");
  assert.ok(out.startsWith("flowchart TD"));
  assert.ok(out.includes("A --> B"));
  assert.ok(!out.includes("```"));
  assert.ok(!out.includes("\\n"));
});

test("quotes unquoted subgraph titles", () => {
  const out = sanitizeMermaid("flowchart TD\n  subgraph TB1 [TB-1: Batas]\n    A --> B\n  end");
  assert.match(out, /subgraph TB1 \["TB-1: Batas"\]/);
});

test("appends missing flowchart subgraph terminators", () => {
  const out = sanitizeMermaid("flowchart LR\n  subgraph A [X]\n    a --> b");
  const ends = out.split("\n").filter((l) => /^\s*end\s*$/.test(l)).length;
  assert.equal(ends, 1);
});

test("neutralises semicolons in sequence messages and balances blocks", () => {
  const out = sanitizeMermaid(
    "sequenceDiagram\n  A->>B: BEGIN; SELECT 1\n  alt ok\n    B-->>A: yes",
  );
  assert.ok(!/BEGIN;\s*SELECT/.test(out));
  assert.match(out, /BEGIN,\s*SELECT/);
  const ends = out.split("\n").filter((l) => /^\s*end\s*$/.test(l)).length;
  assert.equal(ends, 1);
});

test("leaves an already-valid diagram unchanged", () => {
  const code = 'flowchart TD\n  A[Start] --> B[End]\n  subgraph S ["Ok"]\n    C --> D\n  end';
  assert.equal(sanitizeMermaid(code), code);
});
