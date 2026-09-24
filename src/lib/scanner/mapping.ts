import type { RawFinding, ScanSeverity } from "./types";

/** Maps tool-specific severity strings (SARIF, Trivy, npm audit) to our scale. */
export function normalizeSeverity(value: unknown): ScanSeverity {
  const v = String(value ?? "").toLowerCase();
  if (v === "critical" || v === "blocker") return "critical";
  if (v === "high" || v === "error" || v === "major") return "high";
  if (v === "low" || v === "note" || v === "info" || v === "minor") return "low";
  return "medium";
}

export type FindingCategory =
  | "injection"
  | "xss"
  | "secrets"
  | "dependency"
  | "misconfiguration"
  | "cryptography"
  | "authentication"
  | "generic";

const CATEGORY_STANDARDS: Record<FindingCategory, { nistTask: string; isoControls: string[] }> = {
  injection: { nistTask: "PW.4.1", isoControls: ["A.8.28"] },
  xss: { nistTask: "PW.4.1", isoControls: ["A.8.28"] },
  secrets: { nistTask: "PS.1.1", isoControls: ["A.8.12", "A.5.17"] },
  dependency: { nistTask: "PW.7.2", isoControls: ["A.8.8", "A.8.29"] },
  misconfiguration: { nistTask: "PW.9.2", isoControls: ["A.8.9", "A.8.31"] },
  cryptography: { nistTask: "PW.4.1", isoControls: ["A.8.24", "A.8.28"] },
  authentication: { nistTask: "PS.1.1", isoControls: ["A.8.5", "A.8.28"] },
  generic: { nistTask: "PW.7.2", isoControls: ["A.8.8", "A.8.29"] },
};

/** Infers a coarse category from the finding's tool, rule id, CWE/OWASP and text. */
export function inferCategory(finding: RawFinding): FindingCategory {
  const haystack = `${finding.ruleId ?? ""} ${finding.title} ${finding.description ?? ""} ${finding.cwe ?? ""} ${finding.owasp ?? ""}`.toLowerCase();

  if (finding.tool.includes("audit") || /dependen|vulnerab|package|library|pkg/.test(haystack)) {
    if (finding.tool === "npm-audit" || finding.tool === "pip-audit" || finding.tool === "composer-audit" || finding.tool === "govulncheck") {
      return "dependency";
    }
  }
  if (/secret|credential|api[-_ ]?key|token|password|private[-_ ]?key/.test(haystack)) return "secrets";
  if (/sql[-_ ]?injection|cwe-89|injection/.test(haystack)) return "injection";
  if (/xss|cross[-_ ]?site[-_ ]?script|cwe-79/.test(haystack)) return "xss";
  if (/crypto|cipher|hash|md5|sha1|weak[-_ ]?random|cwe-327|cwe-326/.test(haystack)) return "cryptography";
  if (/auth|session|jwt|oauth|credential|password/.test(haystack)) return "authentication";
  if (/misconfig|dockerfile|kubernetes|terraform|iac|header|permission/.test(haystack)) return "misconfiguration";
  if (/dependen|vulnerab|package/.test(haystack)) return "dependency";
  return "generic";
}

export function enrichFinding(finding: RawFinding): {
  category: FindingCategory;
  nistTask: string;
  isoControls: string[];
} {
  const category = inferCategory(finding);
  const standards = CATEGORY_STANDARDS[category];
  return { category, ...standards };
}
