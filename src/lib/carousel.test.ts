import { describe, expect, it } from "vitest";
import { nextIndex } from "./carousel";

describe("nextIndex", () => {
  it("steps forward and wraps to the start", () => {
    expect(nextIndex(1, 5, 1)).toBe(2);
    expect(nextIndex(4, 5, 1)).toBe(0);
  });

  it("steps back and wraps to the end", () => {
    expect(nextIndex(0, 5, -1)).toBe(4);
    expect(nextIndex(3, 5, -1)).toBe(2);
  });
});
