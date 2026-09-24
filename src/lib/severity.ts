/**
 * Maps severity / likelihood / impact / data-classification labels to
 * theme-token classes so badges stay correct in both light and dark mode.
 */

const DANGER = new Set(["critical", "high", "restricted", "confidential", "danger"]);
const WARNING = new Set(["medium", "sensitive", "internal", "warning", "moderate"]);
const SUCCESS = new Set(["low", "public", "success", "none"]);

export function levelBadgeClass(level: string): string {
  const l = String(level).toLowerCase();
  if (DANGER.has(l)) return "bg-danger/10 text-danger border-danger/30";
  if (WARNING.has(l)) return "bg-warning/10 text-warning border-warning/30";
  if (SUCCESS.has(l)) return "bg-success/10 text-success border-success/30";
  return "bg-muted text-muted-foreground border-border";
}

export function levelTextClass(level: string): string {
  const l = String(level).toLowerCase();
  if (DANGER.has(l)) return "text-danger";
  if (WARNING.has(l)) return "text-warning";
  if (SUCCESS.has(l)) return "text-success";
  return "text-muted-foreground";
}
