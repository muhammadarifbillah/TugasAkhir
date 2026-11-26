import type { Dictionary } from "@/lib/i18n";
import { scoreSourceText } from "@/lib/dashboard-view";
import { scoreBand, scoreColorClass } from "@/lib/project-stats";

type Labels = Pick<
  Dictionary["dashboard"],
  | "scoreLabel"
  | "scoreGood"
  | "scoreFair"
  | "scorePoor"
  | "scoreScanner"
  | "scoreScannerNoDate"
  | "scoreAi"
  | "scoreNone"
  | "scoreStale"
>;

export function ScoreBlock({
  score,
  scoreSource,
  scannedAt,
  scoreStale,
  labels,
  compact = false,
}: {
  score: number | null;
  scoreSource: "scanner" | "ai" | null;
  scannedAt: string | null;
  scoreStale: boolean;
  labels: Labels;
  compact?: boolean;
}) {
  const band = scoreBand(score);
  const bandText = { good: labels.scoreGood, fair: labels.scoreFair, poor: labels.scorePoor, none: null }[band];
  const source = scoreSourceText(
    { scoreSource, scannedAt, scoreStale },
    {
      scanner: labels.scoreScanner,
      scannerNoDate: labels.scoreScannerNoDate,
      ai: labels.scoreAi,
      none: labels.scoreNone,
      stale: labels.scoreStale,
    },
  );
  return (
    <div className={compact ? undefined : "rounded-lg border px-3 py-2"}>
      <span className="text-[11px] text-muted-foreground">{labels.scoreLabel}</span>
      <div className={`flex items-baseline gap-2 ${scoreColorClass(score)}`}>
        <span className={`${compact ? "text-xl" : "text-3xl"} font-semibold tabular-nums`}>{score ?? "—"}</span>
        {bandText && <span className="text-sm font-medium">{bandText}</span>}
      </div>
      <p className="text-[11px] text-muted-foreground">{source}</p>
    </div>
  );
}
