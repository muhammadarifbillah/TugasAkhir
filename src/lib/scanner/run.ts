import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { docker } from "@/lib/runner/docker";
import { detectStack } from "@/lib/runner/registry";
import { runnerDisabled } from "@/lib/runner/mode";
import { filterSafeArtifacts } from "@/lib/artifact-paths";
import type { RawFinding, ScanReport, ScanFinding } from "./types";
import { isAuditReport, parseNpmAudit, parsePipAudit, parseSarif, parseTrivy } from "./parse";
import { computeSecurityScore, enrichFindings } from "./score";

const SEMGREP_IMAGE = "semgrep/semgrep:latest";
const TRIVY_IMAGE = "aquasec/trivy:latest";
const NODE_IMAGE = "node:20-alpine";
const PYTHON_IMAGE = "python:3.12-alpine";

export type ScannerTool = "semgrep" | "trivy" | "npm-audit" | "pip-audit";

// Scanned code is untrusted: even a malicious manifest must not gain root
// capabilities or escalate inside the scanner container.
export const SCANNER_HARDENING = ["--cap-drop", "ALL", "--security-opt", "no-new-privileges"] as const;

export function scannerDockerArgs(tool: ScannerTool, dir: string): string[] {
  switch (tool) {
    case "semgrep":
      return [
        "run",
        "--rm",
        ...SCANNER_HARDENING,
        "-v",
        `${dir}:/src`,
        "-w",
        "/src",
        SEMGREP_IMAGE,
        "semgrep",
        "scan",
        "--config",
        "p/owasp-top-ten",
        "--config",
        "p/security-audit",
        "--sarif",
        "--metrics=off",
        "--quiet",
      ];
    case "trivy":
      return [
        "run",
        "--rm",
        ...SCANNER_HARDENING,
        "-v",
        `${dir}:/src`,
        TRIVY_IMAGE,
        "fs",
        "--scanners",
        "vuln,secret,misconfig",
        "--format",
        "json",
        "--quiet",
        "/src",
      ];
    case "npm-audit":
      return [
        "run",
        "--rm",
        ...SCANNER_HARDENING,
        "-v",
        `${dir}:/app`,
        "-w",
        "/app",
        NODE_IMAGE,
        "sh",
        "-c",
        // Generated projects ship package.json only; npm audit needs a lockfile.
        // --package-lock-only resolves versions without downloading or running package scripts.
        "npm install --package-lock-only --ignore-scripts --no-audit --no-fund --loglevel=error >/dev/null && npm audit --json",
      ];
    case "pip-audit":
      return [
        "run",
        "--rm",
        ...SCANNER_HARDENING,
        "-v",
        `${dir}:/app`,
        "-w",
        "/app",
        PYTHON_IMAGE,
        "sh",
        "-c",
        "pip install --quiet pip-audit && pip-audit -r requirements.txt -f json",
      ];
  }
}

async function runTool(
  tool: string,
  args: string[],
  parse: (stdout: string) => RawFinding[],
  timeoutMs: number,
  isReport?: (stdout: string) => boolean,
): Promise<{ tool: string; findings: RawFinding[] } | { tool: string; reason: string }> {
  try {
    const res = await docker(args, timeoutMs);
    if (res.code !== 0 && !isReport?.(res.stdout)) {
      return { tool, reason: (res.stderr || "tool exited non-zero").trim().slice(0, 300) };
    }
    return { tool, findings: parse(res.stdout) };
  } catch (err) {
    return { tool, reason: err instanceof Error ? err.message.slice(0, 300) : "docker unavailable" };
  }
}

/**
 * Runs the real security scanners against a project's generated source:
 * Semgrep (SAST), Trivy (vulnerabilities/secrets/misconfig) and the language's
 * dependency audit. Tools run in Docker containers; failures are reported as
 * skipped rather than aborting the whole scan.
 */
export async function scanProjectArtifacts(files: Record<string, string>): Promise<ScanReport> {
  const started = Date.now();
  const findings: RawFinding[] = [];
  const toolsRun: string[] = [];
  const toolsSkipped: { tool: string; reason: string }[] = [];

  const { files: safeFiles } = filterSafeArtifacts(files);
  const dir = await mkdtemp(path.join(tmpdir(), "saksi-scan-"));
  try {
    for (const [rel, content] of Object.entries(safeFiles)) {
      const target = path.join(dir, rel);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, content, "utf8");
    }

    if (runnerDisabled()) {
      for (const tool of ["semgrep", "trivy", "dependency-audit"]) {
        toolsSkipped.push({ tool, reason: "RUNNER_MODE=disabled" });
      }
    } else {
      const semgrep = await runTool(
        "semgrep",
        scannerDockerArgs("semgrep", dir),
        parseSarif,
        300_000,
      );
      if ("findings" in semgrep) {
        toolsRun.push("semgrep");
        findings.push(...semgrep.findings);
      } else toolsSkipped.push(semgrep);

      const trivy = await runTool(
        "trivy",
        scannerDockerArgs("trivy", dir),
        parseTrivy,
        300_000,
      );
      if ("findings" in trivy) {
        toolsRun.push("trivy");
        findings.push(...trivy.findings);
      } else toolsSkipped.push(trivy);

      const stack = detectStack(safeFiles);
      if (stack?.id === "node") {
        const audit = await runTool(
          "npm-audit",
          scannerDockerArgs("npm-audit", dir),
          parseNpmAudit,
          180_000,
          (out) => isAuditReport("npm-audit", out),
        );
        if ("findings" in audit) {
          toolsRun.push("npm-audit");
          findings.push(...audit.findings);
        } else toolsSkipped.push(audit);
      } else if (stack?.id === "python") {
        const audit = await runTool(
          "pip-audit",
          scannerDockerArgs("pip-audit", dir),
          parsePipAudit,
          300_000,
          (out) => isAuditReport("pip-audit", out),
        );
        if ("findings" in audit) {
          toolsRun.push("pip-audit");
          findings.push(...audit.findings);
        } else toolsSkipped.push(audit);
      } else {
        toolsSkipped.push({ tool: "dependency-audit", reason: "no supported dependency manifest" });
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }

  const enriched: ScanFinding[] = enrichFindings(findings);
  return {
    findings: enriched,
    score: computeSecurityScore(enriched),
    toolsRun,
    toolsSkipped,
    durationMs: Date.now() - started,
  };
}
