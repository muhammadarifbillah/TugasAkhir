"use client";

import { useMemo, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { aggregateUsage, type UsageDay, type UsageGranularity } from "@/lib/usage-rollup";

export type { UsageDay };

type Granularity = UsageGranularity;

interface UsageLabels {
  title: string;
  daily: string;
  monthly: string;
  yearly: string;
  prompt: string;
  completion: string;
  total: string;
  period: string;
  empty: string;
  note: string;
}

export function UsageCard({ series, labels }: { series: UsageDay[]; labels: UsageLabels }) {
  const [granularity, setGranularity] = useState<Granularity>("day");
  const rows = useMemo(() => aggregateUsage(series, granularity), [series, granularity]);
  // The chart stays readable: the last 14 buckets of the selected period.
  const chart = rows.slice(0, 14).reverse();
  const max = Math.max(1, ...chart.map((r) => r.prompt + r.completion));
  const totals = rows.reduce(
    (acc, row) => ({
      prompt: acc.prompt + row.prompt,
      completion: acc.completion + row.completion,
    }),
    { prompt: 0, completion: 0 },
  );

  const tabs: { value: Granularity; label: string }[] = [
    { value: "day", label: labels.daily },
    { value: "month", label: labels.monthly },
    { value: "year", label: labels.yearly },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" /> {labels.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-sm">
          {[
            { label: labels.prompt, value: totals.prompt },
            { label: labels.completion, value: totals.completion },
            { label: labels.total, value: totals.prompt + totals.completion },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {item.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        <div role="tablist" aria-label={labels.title} className="flex rounded-lg border bg-muted p-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={granularity === tab.value}
              onClick={() => setGranularity(tab.value)}
              className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                granularity === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {rows.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
            {labels.empty}
          </p>
        ) : (
          <>
            <div className="flex h-24 items-end gap-1">
              {chart.map((row) => {
                const total = row.prompt + row.completion;
                const height = Math.max(4, Math.round((total / max) * 100));
                return (
                  <div
                    key={row.period}
                    className="group relative flex flex-1 flex-col items-center"
                    title={`${row.period} — ${total.toLocaleString()}`}
                  >
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                    <span className="mt-1 w-full truncate text-center text-[10px] text-muted-foreground">
                      {row.period}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="max-h-64 overflow-y-auto rounded-lg border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-1.5 font-medium">{labels.period}</th>
                    <th scope="col" className="px-3 py-1.5 text-end font-medium">{labels.prompt}</th>
                    <th scope="col" className="px-3 py-1.5 text-end font-medium">{labels.completion}</th>
                    <th scope="col" className="px-3 py-1.5 text-end font-medium">{labels.total}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.period} className="border-t tabular-nums">
                      <td className="px-3 py-1.5 font-mono">{row.period}</td>
                      <td className="px-3 py-1.5 text-end">{row.prompt.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-end">{row.completion.toLocaleString()}</td>
                      <td className="px-3 py-1.5 text-end font-medium">
                        {(row.prompt + row.completion).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <p className="text-[11px] text-muted-foreground">{labels.note}</p>
      </CardContent>
    </Card>
  );
}
