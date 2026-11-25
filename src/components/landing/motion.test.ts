import { describe, expect, it, vi } from "vitest";
import { LANDING_MOTION_QUERY, shouldLoadLandingMotion } from "./motion";

describe("LANDING_MOTION_QUERY", () => {
  it("LANDING_MOTION_QUERY is the three-part desktop query", () => {
    expect(LANDING_MOTION_QUERY).toBe(
      "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
  });
});

describe("shouldLoadLandingMotion", () => {
  it("shouldLoadLandingMotion returns true when the query matches", () => {
    const matchMedia = (q: string) => ({ matches: q === LANDING_MOTION_QUERY });
    expect(shouldLoadLandingMotion(matchMedia)).toBe(true);
  });

  it("shouldLoadLandingMotion returns false when the query does not match", () => {
    expect(shouldLoadLandingMotion(() => ({ matches: false }))).toBe(false);
  });

  it("shouldLoadLandingMotion returns false without matchMedia (SSR)", () => {
    expect(shouldLoadLandingMotion(undefined)).toBe(false);
  });

  it("shouldLoadLandingMotion asks exactly LANDING_MOTION_QUERY", () => {
    const matchMedia = vi.fn(() => ({ matches: true }));
    shouldLoadLandingMotion(matchMedia);
    expect(matchMedia).toHaveBeenCalledTimes(1);
    expect(matchMedia).toHaveBeenCalledWith(LANDING_MOTION_QUERY);
  });
});
