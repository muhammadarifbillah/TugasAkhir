import { describe, expect, it } from "vitest";
import { navDirection } from "./nav-direction";

describe("navDirection", () => {
  it("moves forward to a later stage", () => {
    expect(navDirection(0, 3)).toBe("nav-forward");
  });

  it("moves back to an earlier stage", () => {
    expect(navDirection(3, 1)).toBe("nav-back");
  });

  it("treats the same stage as forward", () => {
    expect(navDirection(2, 2)).toBe("nav-forward");
  });
});
