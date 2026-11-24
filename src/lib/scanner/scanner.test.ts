import { test } from "vitest";
import assert from "node:assert/strict";

import { isAuditReport, parseNpmAudit, parseSarif, parseTrivy } from "./parse";
import { SCANNER_HARDENING, scannerDockerArgs } from "./run";
import { computeSecurityScore, enrichFindings, severityCounts } from "./score";
import { inferCategory, normalizeSeverity } from "./mapping";
import type { RawFinding } from "./types";

test("normalizeSeverity maps tool levels onto our scale", () => {
  assert.equal(normalizeSeverity("error"), "high");
  assert.equal(normalizeSeverity("warning"), "medium");
  assert.equal(normalizeSeverity("note"), "low");
  assert.equal(normalizeSeverity("CRITICAL"), "critical");
  assert.equal(normalizeSeverity("bogus"), "medium");
});

test("parseSarif extracts rule, location and CWE/OWASP metadata", () => {
  const sarif = JSON.stringify({
    runs: [
      {
        tool: { driver: { rules: [{ id: "javascript.lang.security.audit.xss", name: "xss", properties: { cwe: ["CWE-79: XSS"], owasp: ["A03:2021"] } }] } },
        results: [
          {
            ruleId: "javascript.lang.security.audit.xss",
            level: "error",
            message: { text: "Potential XSS" },
            locations: [{ physicalLocation: { artifactLocation: { uri: "src/app.ts" }, region: { startLine: 12 } } }],
          },
        ],
      },
    ],
  });
  const findings = parseSarif(sarif);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].tool, "semgrep");
  assert.equal(findings[0].severity, "high");
  assert.equal(findings[0].filePath, "src/app.ts");
  assert.equal(findings[0].line, 12);
  assert.match(findings[0].cwe ?? "", /CWE-79/);
});

test("parseSarif tolerates malformed input", () => {
  assert.deepEqual(parseSarif("not json"), []);
});

test("parseTrivy extracts vulnerabilities, secrets and misconfigurations", () => {
  const trivy = JSON.stringify({
    Results: [
      {
        Target: "package-lock.json",
        Vulnerabilities: [
          { VulnerabilityID: "CVE-2024-1", Severity: "CRITICAL", Title: "RCE", PkgName: "left-pad", CweIDs: ["CWE-94"] },
        ],
      },
      {
        Target: "src/config.ts",
        Secrets: [{ RuleID: "aws-access-key", Severity: "HIGH", Title: "AWS key", StartLine: 3, Match: "AKIA..." }],
        Misconfigurations: [{ ID: "DS002", Severity: "MEDIUM", Title: "Root user", CauseMetadata: { StartLine: 1 } }],
      },
    ],
  });
  const findings = parseTrivy(trivy);
  assert.equal(findings.length, 3);
  const critical = findings.find((f) => f.severity === "critical");
  assert.ok(critical);
  assert.equal(critical?.tool, "trivy");
  assert.match(findings[1].title, /AWS key/);
});

test("parseNpmAudit flattens the vulnerabilities map", () => {
  const audit = JSON.stringify({
    vulnerabilities: {
      lodash: { severity: "high", via: [{ title: "Prototype Pollution" }] },
      minimist: { severity: "low", via: ["ReDoS"] },
    },
  });
  const findings = parseNpmAudit(audit);
  assert.equal(findings.length, 2);
  assert.equal(findings[0].tool, "npm-audit");
  assert.match(findings[0].title, /Prototype Pollution/);
});

test("computeSecurityScore is deterministic and floored at 0", () => {
  assert.equal(computeSecurityScore([]), 100);
  assert.equal(computeSecurityScore([{ severity: "critical" }]), 80);
  assert.equal(computeSecurityScore([{ severity: "high" }, { severity: "low" }]), 89);
  assert.equal(
    computeSecurityScore(Array.from({ length: 10 }, () => ({ severity: "critical" as const }))),
    0,
  );
});

test("severityCounts tallies each bucket", () => {
  const counts = severityCounts([
    { severity: "critical" },
    { severity: "high" },
    { severity: "high" },
    { severity: "low" },
  ]);
  assert.deepEqual(counts, { critical: 1, high: 2, medium: 0, low: 1 });
});

test("inferCategory recognises secrets and dependencies", () => {
  const base: RawFinding = {
    tool: "trivy",
    ruleId: null,
    severity: "high",
    title: "Hardcoded AWS secret key",
    description: null,
    filePath: null,
    line: null,
    cwe: null,
    owasp: null,
    raw: null,
  };
  assert.equal(inferCategory(base), "secrets");
  assert.equal(inferCategory({ ...base, tool: "npm-audit", title: "lodash vulnerability" }), "dependency");
  assert.equal(inferCategory({ ...base, tool: "semgrep", title: "SQL injection", description: "cwe-89" }), "injection");
});

test("enrichFindings attaches NIST and ISO controls", () => {
  const [enriched] = enrichFindings([
    {
      tool: "semgrep",
      ruleId: "sql-injection",
      severity: "critical",
      title: "SQL injection",
      description: null,
      filePath: "src/db.ts",
      line: 5,
      cwe: "CWE-89",
      owasp: null,
      raw: null,
    },
  ]);
  assert.equal(enriched.nistTask, "PW.4.1");
  assert.ok(enriched.isoControls.includes("A.8.28"));
});

test("scannerDockerArgs hardens every scanner container", () => {
  for (const tool of ["semgrep", "trivy", "npm-audit", "pip-audit"] as const) {
    const args = scannerDockerArgs(tool, "/tmp/x");
    assert.deepEqual(args.slice(0, 2), ["run", "--rm"]);
    assert.deepEqual(args.slice(2, 6), [...SCANNER_HARDENING]);
    assert.ok(args.some((a) => a.startsWith("/tmp/x:")), `${tool} mounts the scan dir`);
  }
  assert.ok(scannerDockerArgs("semgrep", "/tmp/x").includes("p/owasp-top-ten"));
  assert.ok(scannerDockerArgs("trivy", "/tmp/x").includes("vuln,secret,misconfig"));
});

test("dependency audits build a lockfile without scripts and do not mask failures", () => {
  const npm = scannerDockerArgs("npm-audit", "/tmp/x").join(" ");
  assert.match(npm, /npm install --package-lock-only --ignore-scripts/);
  assert.match(npm, /npm audit --json/);
  assert.doesNotMatch(scannerDockerArgs("pip-audit", "/tmp/x").join(" "), /\|\| true/);
});

test("isAuditReport accepts real reports and rejects tool errors", () => {
  // npm and pip-audit exit 1 when they find vulnerabilities; only a real report may pass.
  assert.equal(isAuditReport("npm-audit", JSON.stringify({ vulnerabilities: { lodash: {} } })), true);
  assert.equal(isAuditReport("npm-audit", JSON.stringify({ vulnerabilities: {} })), true);
  assert.equal(isAuditReport("npm-audit", JSON.stringify({ error: { code: "ENOLOCK" } })), false);
  assert.equal(isAuditReport("npm-audit", JSON.stringify({ vulnerabilities: {}, error: { code: "E500" } })), false);
  assert.equal(isAuditReport("pip-audit", JSON.stringify({ dependencies: [{ name: "django", vulns: [] }] })), true);
  assert.equal(isAuditReport("pip-audit", ""), false);
  assert.equal(isAuditReport("npm-audit", "npm notice"), false);
});
