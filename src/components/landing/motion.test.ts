import { describe, expect, it } from "vitest";
import { LANDING_MOTION_QUERY } from "./motion";

describe("LANDING_MOTION_QUERY", () => {
  it("LANDING_MOTION_QUERY is the three-part desktop query", () => {
    expect(LANDING_MOTION_QUERY).toBe(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
  });
});
