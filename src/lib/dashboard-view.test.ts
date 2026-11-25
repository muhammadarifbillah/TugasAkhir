import { describe, expect, it } from "vitest";
import { STAGE_DEFINITIONS } from "@/lib/stages";
import {
  GATE_CODES,
  dashboardStats,
  gateRail,
  isSearchShortcut,
  matchesGate,
  scoreSourceText,
} from "./dashboard-view";

const COPY = { scanner: "Semgrep + Trivy, {date}", scannerNoDate: "Semgrep + Trivy", ai: "AI", none: "NONE", stale: "STALE" };
const key = (k: string, target: { tagName: string; isContentEditable?: boolean } | null = null, mods = {}) => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  target,
  ...mods,
});

describe("dashboard view", () => {
  it("GATE_CODES equals STAGE_DEFINITIONS codes sorted by orderIndex", () => {
    const codes = [...STAGE_DEFINITIONS].sort((a, b) => a.orderIndex - b.orderIndex).map((s) => s.code);
    expect([...GATE_CODES]).toEqual(codes);
  });

  it("gateRail marks gates before the active one done, the active one active, the rest pending", () => {
    const rail = gateRail("development", { completed: 2, total: 5 });
    expect(rail.segments.map((s) => s.state)).toEqual(["done", "done", "active", "pending", "pending"]);
    expect(rail.segments.map((s) => s.n)).toEqual([1, 2, 3, 4, 5]);
    expect(rail.segments.map((s) => s.code)).toEqual([...GATE_CODES]);
    expect(rail.activeIndex).toBe(2);
  });

  it("gateRail marks all five done and activeIndex null when completed >= total > 0", () => {
    const rail = gateRail("handover", { completed: 5, total: 5 });
    expect(rail.segments.map((s) => s.state)).toEqual(["done", "done", "done", "done", "done"]);
    expect(rail.activeIndex).toBeNull();
    const empty = gateRail("analysis", { completed: 0, total: 0 });
    expect(empty.activeIndex).toBe(0);
    expect(empty.segments[0]!.state).toBe("active");
  });

  it("gateRail falls back to the first gate for an unknown stage code", () => {
    expect(gateRail("unknown", { completed: 0, total: 5 }).activeIndex).toBe(0);
  });

  it('matchesGate keeps all projects for "all" and only the active gate otherwise', () => {
    const p = { activeStage: "testing", stageProgress: { completed: 3, total: 5 } };
    expect(matchesGate(p, "all")).toBe(true);
    expect(matchesGate(p, "testing")).toBe(true);
    expect(matchesGate(p, "design")).toBe(false);
    const done = { activeStage: "handover", stageProgress: { completed: 5, total: 5 } };
    expect(matchesGate(done, "all")).toBe(true);
    for (const code of GATE_CODES) expect(matchesGate(done, code)).toBe(false);
  });

  it("dashboardStats counts in progress (in_progress+draft), completed, in revision", () => {
    const cards = ["in_progress", "draft", "completed", "in_revision", "in_revision"].map((status) => ({
      status,
      score: null,
      scoreSource: null,
    }));
    const s = dashboardStats(cards);
    expect([s.inProgress, s.completed, s.inRevision]).toEqual([2, 1, 2]);
  });

  it("dashboardStats averages scanner scores only and returns null when none are scanned", () => {
    const s = dashboardStats([
      { status: "completed", score: 90, scoreSource: "scanner" },
      { status: "completed", score: 71, scoreSource: "scanner" },
      { status: "completed", score: 40, scoreSource: "ai" },
      { status: "draft", score: null, scoreSource: null },
    ]);
    expect(s.avgScanScore).toBe(81);
    expect(s.scannedCount).toBe(2);
    const none = dashboardStats([{ status: "completed", score: 40, scoreSource: "ai" }]);
    expect(none.avgScanScore).toBeNull();
    expect(none.scannedCount).toBe(0);
  });

  it("scoreSourceText returns scanner+date, scanner without date, ai, none, and appends stale", () => {
    const at = "2026-11-24T08:00:00.000Z";
    expect(scoreSourceText({ scoreSource: "scanner", scannedAt: at, scoreStale: false }, COPY)).toBe("Semgrep + Trivy, 2026-11-24");
    expect(scoreSourceText({ scoreSource: "scanner", scannedAt: null, scoreStale: false }, COPY)).toBe("Semgrep + Trivy");
    expect(scoreSourceText({ scoreSource: "ai", scannedAt: null, scoreStale: false }, COPY)).toBe("AI");
    expect(scoreSourceText({ scoreSource: null, scannedAt: null, scoreStale: false }, COPY)).toBe("NONE");
    expect(scoreSourceText({ scoreSource: "scanner", scannedAt: at, scoreStale: true }, COPY)).toBe(
      "Semgrep + Trivy, 2026-11-24 · STALE",
    );
  });

  it('isSearchShortcut is true for "/" without modifiers outside editable targets', () => {
    expect(isSearchShortcut(key("/"))).toBe(true);
    expect(isSearchShortcut(key("/", { tagName: "BODY", isContentEditable: false }))).toBe(true);
    expect(isSearchShortcut(key("/", { tagName: "button" }))).toBe(true);
    expect(isSearchShortcut(key("a"))).toBe(false);
  });

  it("isSearchShortcut is false in input, textarea, select, contentEditable or with ctrl/meta/alt", () => {
    for (const tagName of ["INPUT", "textarea", "Select"]) expect(isSearchShortcut(key("/", { tagName }))).toBe(false);
    expect(isSearchShortcut(key("/", { tagName: "DIV", isContentEditable: true }))).toBe(false);
    for (const mod of ["ctrlKey", "metaKey", "altKey"]) expect(isSearchShortcut(key("/", null, { [mod]: true }))).toBe(false);
  });
});
