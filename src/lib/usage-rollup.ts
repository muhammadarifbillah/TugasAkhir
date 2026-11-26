export interface UsageDay {
  day: string;
  prompt: number;
  completion: number;
}

export type UsageGranularity = "day" | "month" | "year";

/** Rolls daily totals up by day, month or year and sorts newest first. */
export function aggregateUsage(
  series: UsageDay[],
  granularity: UsageGranularity,
): { period: string; prompt: number; completion: number }[] {
  const buckets = new Map<string, { prompt: number; completion: number }>();
  for (const row of series) {
    const key =
      granularity === "year"
        ? row.day.slice(0, 4)
        : granularity === "month"
          ? row.day.slice(0, 7)
          : row.day;
    const slot = buckets.get(key) ?? { prompt: 0, completion: 0 };
    slot.prompt += row.prompt;
    slot.completion += row.completion;
    buckets.set(key, slot);
  }
  return [...buckets.entries()]
    .map(([period, value]) => ({ period, ...value }))
    .sort((a, b) => b.period.localeCompare(a.period));
}
