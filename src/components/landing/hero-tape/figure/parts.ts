import type { Plan, Plane, Point3, Tone } from "@/components/iso/iso-kit";
import {
  BRAKE_Y,
  BRAKE_Z,
  DRUM_X,
  DRUM_Z,
  DRUMS_Y,
  FOOT_H,
  HEAD_HALF,
  HEAD_TOP,
  HEAD_X0,
  HEADS_Y,
  INK,
  LINE_LEN,
  LINES_Y,
  REEL_R,
  REEL_TOP,
  REEL_X,
  REEL_Y,
  REEL_Z,
  ROW_H,
  ROWS_Z,
  STAMP_H,
  STAMP_LEN,
  STAMP_Y,
  STAMP_Z,
  TABLE,
  TAPE_RUN,
  TAPE_T,
  TAPE_X,
  TAPE_Z0,
  TAPE_Z1,
  TOP,
  WINDOW,
} from "./view";

export type PartGroup = "base" | "structure" | "mechanism" | "controls" | "subject";
export type Shape =
  | { kind: "slab"; plan: Plan; z: number; h: number }
  | { kind: "extrude"; ring: Plane[]; z: number; h: number }
  | { kind: "cylinder"; cx: number; cy: number; r: number; z: number; h: number }
  | { kind: "box"; min: Point3; max: Point3 };
export interface Part {
  id: string;
  group: PartGroup;
  shape: Shape;
  tone: Tone;
  moves?: "tape";
}

const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Shape => ({ kind: "box", min: [x0, y0, z0], max: [x1, y1, z1] });
const cyl = (cx: number, cy: number, r: number, z0: number, z1: number): Shape => ({ kind: "cylinder", cx, cy, r, z: z0, h: z1 - z0 });
const part = (id: string, group: PartGroup, shape: Shape, tone: Tone, moves?: "tape"): Part => (moves ? { id, group, shape, tone, moves } : { id, group, shape, tone });

const BACK = TAPE_X - TAPE_T;
const FACE = TAPE_X + INK;
const corner = [
  [-1, 1],
  [1, 1],
  [-1, -1],
  [1, -1],
] as const;

export const PARTS: readonly Part[] = [
  // base
  part("table", "base", { kind: "slab", plan: TABLE, z: 0, h: TOP }, "lo"),
  ...corner.map(([sx, sy], i) => part(`foot-${i + 1}`, "base", box(sx * 70 - 10, sx * 70 + 10, sy * 330 - 10, sy * 330 + 10, -FOOT_H, 0), "lo")),
  ...corner.map(([sx, sy], i) => part(`screw-${i + 1}`, "base", cyl(sx * 71, sy * 340, 2.5, TOP, TOP + 1.5), "mid")),
  part("label-plate", "base", box(50, 70, 240, 320, TOP, TOP + 1), "lo"),
  part("ruler", "base", box(64, 74, -180, 220, TOP, TOP + 1), "lo"),
  // structure
  part("post-1", "structure", box(-14, HEAD_X0, 245, 257, TOP, HEAD_TOP), "mid"),
  part("post-2", "structure", box(-14, HEAD_X0, -17, -5, TOP, HEAD_TOP), "mid"),
  part("axle-1", "structure", cyl(REEL_X, REEL_Y, 4.5, TOP, REEL_Z), "mid"),
  part("axle-2", "structure", cyl(REEL_X, -REEL_Y, 4.5, TOP, REEL_Z), "mid"),
  part("bridge", "structure", box(-14, HEAD_X0, -5, 245, TAPE_Z1, HEAD_TOP), "mid"),
  ...HEADS_Y.slice(0, 4).map((y, i) => part(`bracket-${i + 1}`, "structure", box(-6, 6, y - 5, y + 5, HEAD_TOP, HEAD_TOP + 2), "mid")),
  part("bracket-5", "structure", box(HEAD_X0, 14, BRAKE_Y[0], BRAKE_Y[1], 94, 116), "mid"),
  part("dust-cover", "structure", box(-24, -14, -17, 257, TOP, 70), "lo"),
  // mechanism
  part("reel-supply", "mechanism", cyl(REEL_X, REEL_Y, REEL_R, REEL_Z, REEL_TOP), "mid"),
  part("reel-takeup", "mechanism", cyl(REEL_X, -REEL_Y, REEL_R, REEL_Z, REEL_TOP), "mid"),
  part("guide-1", "mechanism", cyl(BACK - 6, 262, 6, TOP, REEL_TOP), "mid"),
  part("guide-2", "mechanism", cyl(BACK - 6, -262, 6, TOP, REEL_TOP), "mid"),
  part("guide-3", "mechanism", cyl(BACK - 4, -40, 4, TOP, REEL_TOP), "mid"),
  part("guide-4", "mechanism", cyl(BACK - 4, -130, 4, TOP, REEL_TOP), "mid"),
  part("capstan", "mechanism", cyl(BACK - 8, -200, 8, TOP, 108), "mid"),
  part("pinch-roller", "mechanism", cyl(TAPE_X + 6, -200, 6, TOP, REEL_TOP), "mid"),
  ...HEADS_Y.map((y, i) => part(`head-${i + 1}`, "mechanism", box(HEAD_X0, BACK, y - HEAD_HALF, y + HEAD_HALF, TOP, HEAD_TOP), "hi")),
  ...HEADS_Y.map((y, i) => part(`lens-${i + 1}`, "mechanism", box(BACK, BACK + 3, y - 6, y + 6, TAPE_Z1 + 3, TAPE_Z1 + 9), "hi")),
  part("brake", "mechanism", box(14, 24, BRAKE_Y[0], BRAKE_Y[1], BRAKE_Z, BRAKE_Z + 8), "mid"),
  part("brake-spring", "mechanism", cyl(19, (BRAKE_Y[0] + BRAKE_Y[1]) / 2, 3, BRAKE_Z + 8, BRAKE_Z + 14), "mid"),
  ...DRUMS_Y.map((y, i) => part(`drum-${i + 1}`, "mechanism", box(DRUM_X[0], DRUM_X[1], y - 7, y + 7, TOP, DRUM_Z), "mid")),
  // controls
  part("tension-knob", "controls", cyl(40, 300, 9, TOP, TOP + 12), "mid"),
  part("direction-switch", "controls", box(30, 46, 210, 226, TOP, TOP + 8), "mid"),
  part("stamper", "controls", box(22, 34, -100, -76, TOP, TAPE_Z0), "mid"),
  ...HEADS_Y.map((y, i) => part(`lamp-${i + 1}`, "controls", box(9, 15, y - 3, y + 3, HEAD_TOP, HEAD_TOP + 5), "mid")),
  // subject: the tape strip is window + run long, so the window is always full whatever tapeX is
  part("tape", "subject", box(BACK, TAPE_X, -WINDOW, WINDOW + TAPE_RUN, TAPE_Z0, TAPE_Z1), "hi", "tape"),
  ...ROWS_Z.map((z, i) => part(`marker-${i + 1}`, "subject", box(TAPE_X, FACE, LINES_Y - LINE_LEN / 2, LINES_Y + LINE_LEN / 2, z, z + ROW_H), "mid", "tape")),
  part("stamp-mark", "subject", box(TAPE_X, FACE, STAMP_Y - STAMP_LEN / 2, STAMP_Y + STAMP_LEN / 2, STAMP_Z, STAMP_Z + STAMP_H), "mid", "tape"),
];

/** Back to front; art.tsx paints in this order and scripts/hero-tape/audit.ts proves it per pose. */
export const PAINT_ORDER: readonly string[] = [
  ...["foot-1", "foot-2", "foot-3", "foot-4", "table", "screw-1", "screw-2", "screw-3", "screw-4", "label-plate", "ruler"],
  ...["axle-1", "axle-2", "dust-cover", "post-2", "bridge", "post-1", "reel-supply", "reel-takeup"],
  ...["guide-1", "guide-2", "guide-3", "guide-4", "capstan"],
  ...["head-1", "bracket-1", "head-2", "bracket-2", "head-3", "bracket-3", "head-5", "bracket-5", "head-4", "bracket-4"],
  ...["lens-1", "lens-2", "lens-3", "lens-4", "lens-5", "tension-knob", "direction-switch", "stamper"],
  ...["lamp-1", "lamp-2", "lamp-3", "lamp-4", "lamp-5"],
  // the tape riders stay together: art.tsx moves them as one group
  ...["tape", "marker-1", "marker-2", "marker-3", "stamp-mark"],
  ...["brake", "brake-spring", "pinch-roller", "drum-3", "drum-2", "drum-1"],
];
