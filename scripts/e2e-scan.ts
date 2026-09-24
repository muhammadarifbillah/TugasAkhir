import { docker } from "../src/lib/runner/docker";
import { scanProjectArtifacts } from "../src/lib/scanner/run";

/**
 * End-to-end check for the real scanner suite. Unlike the unit tests (which feed
 * canned SARIF/JSON to the parsers), this actually runs Semgrep, Trivy and the
 * dependency audit in Docker against a deliberately vulnerable fixture and
 * verifies that findings come back.
 *
 * Requires Docker and network access (scanner images, Semgrep rules, Trivy DB).
 * Run manually with:  npm run test:e2e
 */
const FIXTURE: Record<string, string> = {
  "package.json": JSON.stringify(
    { name: "shieldforge-e2e-fixture", version: "1.0.0", private: true },
    null,
    2,
  ),
  "Dockerfile": ["FROM node:20-alpine", "USER root", "RUN echo hello"].join("\n"),
  ".env": "GITHUB_TOKEN=ghp_012345678901234567890123456789012345\n",
  "src/app.ts": [
    'const AWS_ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";',
    "export function findUser(userId: string, userInput: string) {",
    '  const query = "SELECT * FROM users WHERE id = " + userId;',
    "  const result = eval(userInput);",
    "  return { query, result, AWS_ACCESS_KEY_ID };",
    "}",
  ].join("\n"),
  "src/insecure.js": [
    'const { exec } = require("child_process");',
    'const crypto = require("crypto");',
    "module.exports = function run(cmd) {",
    "  exec(cmd);",
    '  return crypto.createHash("md5").update(cmd).digest("hex") + eval(cmd);',
    "};",
  ].join("\n"),
};

async function main() {
  console.log("ShieldForge - E2E scanner check");

  if (process.env.RUNNER_MODE === "disabled") {
    console.log("SKIP: RUNNER_MODE=disabled.");
    return;
  }

  console.log("Probing Docker...");
  let dockerOk = false;
  try {
    const probe = await docker(["version", "--format", "{{.Server.Version}}"], 15_000);
    dockerOk = probe.code === 0;
    console.log(
      dockerOk
        ? `  Docker OK (server ${probe.stdout.trim()})`
        : `  Docker not usable: ${probe.stderr.trim().slice(0, 120)}`,
    );
  } catch (err) {
    console.log(`  Docker not available: ${err instanceof Error ? err.message : String(err)}`);
  }
  if (!dockerOk) {
    console.log("SKIP: a Docker daemon is required for the E2E scanner check.");
    return;
  }

  console.log("Scanning the vulnerable fixture (pulls scanner images on first run)...");
  const report = await scanProjectArtifacts(FIXTURE);

  console.log("");
  console.log(`Tools run:     ${report.toolsRun.join(", ") || "(none)"}`);
  console.log(
    `Tools skipped: ${
      report.toolsSkipped.map((t) => `${t.tool} (${t.reason})`).join("; ") || "(none)"
    }`,
  );
  console.log(`Findings:      ${report.findings.length}`);
  console.log(`Score:         ${report.score}/100`);
  for (const f of report.findings.slice(0, 10)) {
    console.log(`  - [${f.severity}] ${f.tool} ${f.filePath ?? ""} :: ${f.title}`);
  }

  if (report.toolsRun.length === 0) {
    console.error(
      "\nFAIL: no scanner could run (Docker/network is needed for Semgrep rules and the Trivy DB).",
    );
    process.exitCode = 2;
    return;
  }
  if (report.findings.length === 0) {
    console.error("\nFAIL: scanners ran but found nothing in a deliberately vulnerable fixture.");
    process.exitCode = 3;
    return;
  }

  console.log("\nPASS: scanners ran and reported findings for the vulnerable fixture.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
