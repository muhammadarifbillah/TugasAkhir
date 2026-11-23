/**
 * Maps severity / likelihood / impact / data-classification labels to
 * theme-token classes so badges stay correct in both light and dark mode.
 *
 * Convention (matches common security tooling): critical/high = danger,
 * medium = warning, low = info (blue — never green, so "low" never reads as
 * "safe"), info/none = muted. Green is reserved for "done / verified".
 */

const DANGER = new Set(["critical", "high", "restricted", "confidential", "danger"]);
const WARNING = new Set(["medium", "sensitive", "internal", "warning", "moderate"]);
const INFO = new Set(["low", "public", "info"]);

export type SeverityVariant = "danger" | "warning" | "info" | "muted";

export function severityVariant(level: string | null | undefined): SeverityVariant {
  const l = String(level ?? "").toLowerCase();
  if (DANGER.has(l)) return "danger";
  if (WARNING.has(l)) return "warning";
  if (INFO.has(l)) return "info";
  return "muted";
}

const RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

/** Sort key: critical first, unknown labels last. */
export function severityRank(level: string | null | undefined): number {
  return RANK[String(level ?? "").toLowerCase()] ?? 5;
}

export function levelBadgeClass(level: string): string {
  switch (severityVariant(level)) {
    case "danger":
      return "bg-danger/10 text-danger border-danger/30";
    case "warning":
      return "bg-warning/10 text-warning border-warning/30";
    case "info":
      return "bg-info/10 text-info border-info/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

export function levelTextClass(level: string): string {
  switch (severityVariant(level)) {
    case "danger":
      return "text-danger";
    case "warning":
      return "text-warning";
    case "info":
      return "text-info";
    default:
      return "text-muted-foreground";
  }
}
