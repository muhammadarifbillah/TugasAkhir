import { Card, CardContent } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";
import { dashboardStats } from "@/lib/dashboard-view";

export function DashboardStats({
  cards,
  dict,
}: {
  cards: { status: string; score: number | null; scoreSource: string | null }[];
  dict: Dictionary;
}) {
  const s = dashboardStats(cards);
  const items = [
    { label: dict.dashboard.inProgress, value: s.inProgress },
    { label: dict.dashboard.completed, value: s.completed },
    { label: dict.dashboard.inRevision, value: s.inRevision },
    {
      label: dict.dashboard.statAvgScore,
      value: s.avgScanScore ?? "—",
      hint: s.avgScanScore === null ? dict.dashboard.statNoScans : dict.dashboard.statAvgScoreHint,
    },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{item.value}</p>
            {item.hint && <p className="text-[11px] text-muted-foreground">{item.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
