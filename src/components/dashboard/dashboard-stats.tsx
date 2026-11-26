import "./dashboard.css";
import { Activity, CheckCircle2, GitPullRequest, ShieldCheck } from "lucide-react";
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
    { key: "inProgress", Icon: Activity, tone: "bg-info/15 text-info", label: dict.dashboard.inProgress, value: s.inProgress },
    { key: "completed", Icon: CheckCircle2, tone: "bg-success/15 text-success", label: dict.dashboard.completed, value: s.completed },
    { key: "inRevision", Icon: GitPullRequest, tone: "bg-warning/15 text-warning", label: dict.dashboard.inRevision, value: s.inRevision },
    {
      key: "avgScore",
      Icon: ShieldCheck,
      tone: "bg-primary/15 text-primary",
      label: dict.dashboard.statAvgScore,
      value: s.avgScanScore ?? "—",
      hint: s.avgScanScore === null ? dict.dashboard.statNoScans : dict.dashboard.statAvgScoreHint,
    },
  ];
  return (
    <section aria-labelledby="dashboard-stats-title" className="mb-6">
      <h2 id="dashboard-stats-title" className="sr-only">
        {dict.dashboard.statsTitle}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map(({ key, Icon, tone, label, value, hint }) => (
          <div key={key} data-stat={key} className="dashboard-stat flex flex-col gap-3 p-4">
            <span aria-hidden="true" className={`flex size-11 rounded-full items-center justify-center ${tone}`}>
              <Icon className="size-5" />
            </span>
            <div>
              <p className="text-3xl font-semibold tabular-nums">{value}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
              {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
