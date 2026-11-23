import { describe, expect, it } from "vitest";
import { inferRunPhase } from "./run-phase";

describe("inferRunPhase", () => {
  it("is ready once the app is running", () => {
    expect(inferRunPhase("running", "")).toBe("ready");
  });

  it("starts in the container phase without logs", () => {
    expect(inferRunPhase("starting", "")).toBe("container");
  });

  it("detects dependency installation", () => {
    expect(inferRunPhase("starting", "npm install\nadded 312 packages in 9s")).toBe("install");
    expect(inferRunPhase("starting", "Collecting fastapi")).toBe("install");
  });

  it("prefers the start phase once a server announces itself", () => {
    expect(inferRunPhase("starting", "added 10 packages\n  ➜  Local:   http://localhost:3000/")).toBe("start");
    expect(inferRunPhase("starting", "INFO: Uvicorn running on http://0.0.0.0:8000")).toBe("start");
  });
});
