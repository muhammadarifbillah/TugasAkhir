import { fitProjection, type Point3 } from "@/components/iso/iso-kit";

// World units: x toward the viewer's right-front, y along the deck (the tape runs toward -y,
// screen left to right), z up. The table top is z = TOP.
export const WIDTH = 760;
export const HEIGHT = 590;

export const TABLE = { x: -80, y: -350, w: 160, d: 700, r: 6 };
export const TOP = 12;
export const FOOT_H = 6;

/** The tape stands in the plane x = TAPE_X (front face), between z TAPE_Z0 and TAPE_Z1. */
export const TAPE_X = 20;
export const TAPE_T = 1.5;
export const TAPE_Z0 = 36;
export const TAPE_Z1 = 100;
/** The tape is seen between y = -WINDOW and y = WINDOW (guide rollers at both ends). */
export const WINDOW = 256;
/** Longest run of the tape in the model (TAPE_KEYS ends at 560). */
export const TAPE_RUN = 560;

/** Ink rides 0.4 proud of the tape face. */
export const INK = 0.4;
export const LINE_SIZE = 13.5;
export const LINE_LEN = 290;
/** Centre (y at tapeX = 0) of the printed findings; under head 4 at the poster's tapeX 330. */
export const LINES_Y = 410;
/** Bottom z of finding rows 1..3. */
export const ROWS_Z = [84, 69, 54] as const;
export const ROW_H = 14;
export const STAMP_Y = 270;
export const STAMP_LEN = 96;
export const STAMP_Z = 39;
export const STAMP_H = 12;
export const STAMP_SIZE = 9;

/** Heads 1..5 (y centres), standing behind the tape. */
export const HEADS_Y = [225, 175, 125, 70, 15] as const;
export const HEAD_HALF = 14;
export const HEAD_X0 = 2;
export const HEAD_TOP = 112;

export const BRAKE_Y = [36, 50] as const;
export const BRAKE_Z = 100;
export const BRAKE_LIFT = 6;

export const REEL_R = 40;
export const REEL_Y = 300;
export const REEL_X = TAPE_X - TAPE_T - REEL_R;
export const REEL_Z = 30;
export const REEL_TOP = 104;

/** Drum 1 (hundreds) is leftmost on screen, so it has the largest y. */
export const DRUMS_Y = [-190, -206, -222] as const;
export const DRUM_X = [44, 60] as const;
export const DRUM_Z = 34;

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number): Point3[] {
  const out: Point3[] = [];
  for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push([x, y, z]);
  return out;
}

// Fit to what is really there: the table, the reel tops and the head row, so the figure sits centred.
export const P = fitProjection(
  [
    ...box(TABLE.x, TABLE.x + TABLE.w, TABLE.y, TABLE.y + TABLE.d, -FOOT_H, TOP),
    ...box(REEL_X - REEL_R, REEL_X + REEL_R, -REEL_Y - REEL_R, REEL_Y + REEL_R, REEL_TOP, REEL_TOP),
    ...box(-24, 24, -17, 257, HEAD_TOP + 5, HEAD_TOP + 5),
  ],
  WIDTH,
  HEIGHT,
  { pad: 16, azimuth: 35, elevation: 32 },
);
