import { describe, expect, it } from "vitest";
import { railSchedule } from "./rail-schedule";

describe("railSchedule", () => {
  it("schedules one step per gate and finishes under 5 s", () => {
    const s = railSchedule(750, 5);
    expect(s.map((x) => x.step)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(s.at(-1)!.at).toBeLessThan(5000);
  });

  it("is pure, so a replay restarts from the same plan", () => {
    expect(railSchedule(750, 5)).toEqual(railSchedule(750, 5));
  });
});
