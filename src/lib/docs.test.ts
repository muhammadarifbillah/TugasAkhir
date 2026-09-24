import { test } from "vitest";
import assert from "node:assert/strict";

import { buildTraceabilityMatrix, type TraceRequirement } from "./docs";

function req(partial: Partial<TraceRequirement> & { reqId: string }): TraceRequirement {
  return {
    text: `Requirement ${partial.reqId}`,
    nistControl: null,
    links: [],
    ...partial,
  };
}

test("marks a requirement Implemented when a linked recommendation is applied", () => {
  const md = buildTraceabilityMatrix({
    name: "Demo",
    currentVersion: "v1.0",
    requirements: [
      req({
        reqId: "REQ-SEC-001",
        nistControl: { taskCode: "PW.4.1", title: "Secure coding", iso27001Mapping: ["A.8.28"] },
        links: [
          {
            filePath: "src/auth.ts",
            stageCode: "development",
            status: "recommended",
            recommendation: { isApplied: true, nistControl: { taskCode: "PW.4.1" } },
          },
        ],
      }),
    ],
  });

  assert.match(md, /REQ-SEC-001/);
  assert.match(md, /PW\.4\.1/);
  assert.match(md, /A\.8\.28/);
  assert.match(md, /src\/auth\.ts/);
  assert.match(md, /\| Implemented \|/);
});

test("marks a requirement Partial when a link exists but is not applied", () => {
  const md = buildTraceabilityMatrix({
    name: "Demo",
    currentVersion: "v1.0",
    requirements: [
      req({
        reqId: "REQ-SEC-002",
        links: [
          {
            filePath: "src/db.ts",
            stageCode: "development",
            status: "recommended",
            recommendation: { isApplied: false, nistControl: { taskCode: "PW.7.1" } },
          },
        ],
      }),
    ],
  });

  assert.match(md, /\| Partial \|/);
  assert.match(md, /PW\.7\.1/);
});

test("marks a requirement Gap when it has no links and lists it under Gaps", () => {
  const md = buildTraceabilityMatrix({
    name: "Demo",
    currentVersion: "v1.0",
    requirements: [req({ reqId: "REQ-SEC-003", text: "Encrypt PII at rest" })],
  });

  assert.match(md, /\| Gap \|/);
  assert.match(md, /REQ-SEC-003/);
  assert.match(md, /Encrypt PII at rest/);
  assert.match(md, /## Gaps/);
});

test("reports zero gaps when every requirement is implemented", () => {
  const md = buildTraceabilityMatrix({
    name: "Demo",
    currentVersion: "v1.0",
    requirements: [
      req({
        reqId: "REQ-SEC-001",
        links: [
          {
            filePath: "a.ts",
            stageCode: "development",
            status: "implemented",
            recommendation: { isApplied: true, nistControl: null },
          },
        ],
      }),
    ],
  });

  assert.match(md, /- None\. Every requirement/);
});

test("marks a requirement Issue when the scanner flags its NIST task", () => {
  const md = buildTraceabilityMatrix({
    name: "Demo",
    currentVersion: "v1.0",
    requirements: [
      req({
        reqId: "REQ-SEC-004",
        nistControl: { taskCode: "PW.5.1", title: "Secure coding", iso27001Mapping: ["A.8.28"] },
        links: [
          {
            filePath: "src/api.ts",
            stageCode: "development",
            status: "issue",
            recommendation: { isApplied: true, nistControl: { taskCode: "PW.5.1" } },
          },
        ],
      }),
    ],
  });

  assert.match(md, /\| Issue \|/);
  assert.match(md, /REQ-SEC-004/);
  assert.match(md, /scanner reported high\/critical findings/);
});
