import type { RawFinding } from "./types";
import { normalizeSeverity } from "./mapping";

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Parses a SARIF document (Semgrep output) into raw findings. */
export function parseSarif(text: string): RawFinding[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const runs = asArray((data as { runs?: unknown }).runs);
  const out: RawFinding[] = [];
  for (const run of runs) {
    const r = run as Record<string, unknown>;
    const driver = (r.tool as Record<string, unknown> | undefined)?.driver as
      | Record<string, unknown>
      | undefined;
    const ruleIndex = new Map<string, Record<string, unknown>>();
    for (const rule of asArray(driver?.rules)) {
      const rec = rule as Record<string, unknown>;
      if (typeof rec.id === "string") ruleIndex.set(rec.id, rec);
    }
    for (const result of asArray(r.results)) {
      const res = result as Record<string, unknown>;
      const ruleId = asString(res.ruleId);
      const rule = ruleId ? ruleIndex.get(ruleId) : undefined;
      const props = (rule?.properties as Record<string, unknown> | undefined) ?? {};
      const message = (res.message as Record<string, unknown> | undefined)?.text;
      const location = asArray(res.locations)[0] as Record<string, unknown> | undefined;
      const physical = location?.physicalLocation as Record<string, unknown> | undefined;
      const artifact = physical?.artifactLocation as Record<string, unknown> | undefined;
      const region = physical?.region as Record<string, unknown> | undefined;
      const cwe = Array.isArray(props.cwe) ? String(props.cwe[0]) : asString(props.cwe);
      const owasp = Array.isArray(props.owasp) ? String(props.owasp[0]) : asString(props.owasp);

      out.push({
        tool: "semgrep",
        ruleId,
        severity: normalizeSeverity(res.level),
        title: asString(rule?.name) ?? ruleId ?? asString(message) ?? "Semgrep finding",
        description: asString(message),
        filePath: asString(artifact?.uri),
        line: asNumber(region?.startLine),
        cwe,
        owasp,
        raw: result,
      });
    }
  }
  return out;
}

/** Parses `trivy fs --format json` output (vulnerabilities, secrets, misconfig). */
export function parseTrivy(text: string): RawFinding[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const results = asArray((data as { Results?: unknown }).Results);
  const out: RawFinding[] = [];
  for (const result of results) {
    const r = result as Record<string, unknown>;
    const target = asString(r.Target);

    for (const v of asArray(r.Vulnerabilities)) {
      const item = v as Record<string, unknown>;
      const cwe = asArray(item.CweIDs)[0];
      out.push({
        tool: "trivy",
        ruleId: asString(item.VulnerabilityID),
        severity: normalizeSeverity(item.Severity),
        title: asString(item.Title) ?? asString(item.VulnerabilityID) ?? "Dependency vulnerability",
        description: asString(item.Description) ?? asString(item.PkgName),
        filePath: target,
        line: null,
        cwe: typeof cwe === "string" ? cwe : null,
        owasp: null,
        raw: item,
      });
    }

    for (const s of asArray(r.Secrets)) {
      const item = s as Record<string, unknown>;
      out.push({
        tool: "trivy",
        ruleId: asString(item.RuleID),
        severity: normalizeSeverity(item.Severity),
        title: asString(item.Title) ?? "Hardcoded secret",
        description: asString(item.Match),
        filePath: asString(item.Target) ?? target,
        line: asNumber(item.StartLine),
        cwe: null,
        owasp: null,
        raw: item,
      });
    }

    for (const m of asArray(r.Misconfigurations)) {
      const item = m as Record<string, unknown>;
      const cause = item.CauseMetadata as Record<string, unknown> | undefined;
      out.push({
        tool: "trivy",
        ruleId: asString(item.ID),
        severity: normalizeSeverity(item.Severity),
        title: asString(item.Title) ?? "Misconfiguration",
        description: asString(item.Description),
        filePath: target,
        line: asNumber(cause?.StartLine),
        cwe: null,
        owasp: null,
        raw: item,
      });
    }
  }
  return out;
}

/** True when stdout is a real audit report; both tools exit 1 when they find vulnerabilities. */
export function isAuditReport(tool: "npm-audit" | "pip-audit", text: string): boolean {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return false;
  }
  if (!data || typeof data !== "object") return false;
  if (tool === "pip-audit") return Array.isArray(data.dependencies);
  return !data.error && !!data.vulnerabilities && typeof data.vulnerabilities === "object";
}

/** Parses `npm audit --json` (npm v7+ shape). */
export function parseNpmAudit(text: string): RawFinding[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const vulnerabilities = (data as { vulnerabilities?: unknown }).vulnerabilities;
  if (!vulnerabilities || typeof vulnerabilities !== "object") return [];
  const out: RawFinding[] = [];
  for (const [name, raw] of Object.entries(vulnerabilities as Record<string, unknown>)) {
    const item = raw as Record<string, unknown>;
    const via = asArray(item.via);
    const titles = via
      .map((v) => (typeof v === "string" ? v : asString((v as Record<string, unknown>).title)))
      .filter((v): v is string => Boolean(v));
    out.push({
      tool: "npm-audit",
      ruleId: name,
      severity: normalizeSeverity(item.severity),
      title: `${name}: ${titles[0] ?? "dependency vulnerability"}`,
      description: titles.join("; ") || null,
      filePath: "package-lock.json",
      line: null,
      cwe: null,
      owasp: null,
      raw: item,
    });
  }
  return out;
}

/** Parses `pip-audit -f json` output. */
export function parsePipAudit(text: string): RawFinding[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return [];
  }
  const dependencies = asArray((data as { dependencies?: unknown }).dependencies);
  const out: RawFinding[] = [];
  for (const dep of dependencies) {
    const d = dep as Record<string, unknown>;
    const name = asString(d.name) ?? "dependency";
    for (const v of asArray(d.vulns)) {
      const item = v as Record<string, unknown>;
      const fixes = asArray(item.fix_versions).map(String).join(", ");
      out.push({
        tool: "pip-audit",
        ruleId: asString(item.id),
        severity: "high",
        title: `${name}: ${asString(item.id) ?? "vulnerability"}`,
        description: asString(item.description) ?? (fixes ? `Fix versions: ${fixes}` : null),
        filePath: "requirements.txt",
        line: null,
        cwe: null,
        owasp: null,
        raw: item,
      });
    }
  }
  return out;
}
