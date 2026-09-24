export type ScanSeverity = "critical" | "high" | "medium" | "low";

export interface ScanFinding {
  tool: string;
  ruleId: string | null;
  severity: ScanSeverity;
  title: string;
  description: string | null;
  filePath: string | null;
  line: number | null;
  cwe: string | null;
  owasp: string | null;
  nistTask: string | null;
  isoControls: string[];
  raw: unknown;
}

/** A finding before it is enriched with its NIST/ISO mapping. */
export type RawFinding = Omit<ScanFinding, "nistTask" | "isoControls">;

export interface ScanReport {
  findings: ScanFinding[];
  score: number;
  toolsRun: string[];
  toolsSkipped: { tool: string; reason: string }[];
  durationMs: number;
}
