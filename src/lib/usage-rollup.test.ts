import { test } from "vitest";
import assert from "node:assert/strict";

import { aggregateUsage, type UsageDay } from "./usage-rollup";

const series: UsageDay[] = [
  { day: "2026-11-25", prompt: 10, completion: 5 },
  { day: "2026-11-26", prompt: 20, completion: 10 },
  { day: "2026-10-31", prompt: 1, completion: 1 },
  { day: "2025-12-01", prompt: 100, completion: 0 },
];

test("aggregateUsage sums by day, month and year, newest first", () => {
  assert.deepEqual(aggregateUsage(series, "day").map((r) => r.period), [
    "2026-11-26",
    "2026-11-25",
    "2026-10-31",
    "2025-12-01",
  ]);

  const monthly = aggregateUsage(series, "month");
  assert.deepEqual(monthly, [
    { period: "2026-11", prompt: 30, completion: 15 },
    { period: "2026-10", prompt: 1, completion: 1 },
    { period: "2025-12", prompt: 100, completion: 0 },
  ]);

  const yearly = aggregateUsage(series, "year");
  assert.deepEqual(yearly, [
    { period: "2026", prompt: 31, completion: 16 },
    { period: "2025", prompt: 100, completion: 0 },
  ]);
});

test("aggregateUsage returns an empty list for no data", () => {
  assert.deepEqual(aggregateUsage([], "month"), []);
});
