import {
  circleRing,
  cylinder,
  extrude,
  knurl,
  lineOnTop,
  ring,
  ringSeam,
  sideMatrix,
  sideSeam,
  slabOf,
  topTicks,
  type SolidPaths,
} from "@/components/iso/iso-kit";
import { PARTS, type Shape } from "./parts";
import {
  DRUM_X,
  DRUMS_Y,
  HEAD_HALF,
  HEAD_X0,
  HEADS_Y,
  INK,
  LINE_LEN,
  LINES_Y,
  P,
  REEL_R,
  REEL_TOP,
  REEL_X,
  REEL_Y,
  ROWS_Z,
  STAMP_H,
  STAMP_SIZE,
  STAMP_Y,
  STAMP_Z,
  TAPE_T,
  TAPE_X,
  TAPE_Z0,
  TAPE_Z1,
  TOP,
  WINDOW,
} from "./view";

export const stepsFor = (r: number) => (r >= 20 ? 12 : r >= 7 ? 8 : 6);
/** Corner steps of rounded slabs; the audit records the same. */
export const SLAB_STEPS = 1;

export function pathsOf(shape: Shape): SolidPaths {
  switch (shape.kind) {
    case "slab":
      return slabOf(shape.plan, shape.z, shape.h, P, SLAB_STEPS);
    case "extrude":
      return extrude(shape.ring, shape.z, shape.h, P);
    case "cylinder":
      return cylinder(shape.cx, shape.cy, shape.r, shape.z, shape.h, P, stepsFor(shape.r));
    case "box": {
      const [x0, y0, z0] = shape.min;
      const [x1, y1, z1] = shape.max;
      return slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r: 0 }, z0, z1 - z0, P);
    }
  }
}

/** Static paths of every part at rest, built once when the module loads. */
export const PATHS: Readonly<Record<string, SolidPaths>> = Object.fromEntries(PARTS.map((p) => [p.id, pathsOf(p.shape)]));

const table = PARTS[0]!.shape;
export const TABLE_HALO = table.kind === "slab" ? slabOf(table.plan, -2, 2, P, SLAB_STEPS).fill : "";

/** Ruler ticks hang from the ruler's back edge (x = 64). */
export const RULER_TICKS = topTicks(-175, 215, 25, 4, 64, TOP + 1, [3, 6], P, "y");

/** Three engraved rule lines on the label plate stand for its printed text. */
export const PLATE_RULES = [256, 270, 284].map((y) => lineOnTop([56, y], [56, y + 28], TOP + 1, P)).join("");

export const KNOB_KNURL = knurl(40, 300, 9, TOP, TOP + 12, stepsFor(9), P);

/** Flange seams round each reel and the tape pack ring on its top. */
export const REEL_DETAIL = [REEL_Y, -REEL_Y].map((y) => {
  const rim = circleRing(REEL_X, y, REEL_R, stepsFor(REEL_R));
  return { seams: ringSeam(rim, REEL_TOP - 5, P), pack: ring(REEL_X, y, REEL_R * 0.4, REEL_TOP, P, 12) };
});

/** A seam round each head just below the tape, where the pole piece meets the body. */
export const HEAD_SEAMS = HEADS_Y.map((y) =>
  sideSeam({ x: HEAD_X0, y: y - HEAD_HALF, w: TAPE_X - TAPE_T - HEAD_X0, d: HEAD_HALF * 2, r: 0 }, TAPE_Z0 - 8, P),
);

// Printed text runs along -y on the tape's front face (x = TAPE_X + INK).
const FACE = TAPE_X + INK;
export const LINE_AT = ROWS_Z.map((z) => sideMatrix([FACE, LINES_Y + LINE_LEN / 2 - 6], z + 3.5, P, "right"));
// Baseline sits so the cap height (~0.7 em) is centred in the plate.
export const STAMP_AT = sideMatrix([FACE, STAMP_Y], STAMP_Z + (STAMP_H - 0.7 * STAMP_SIZE) / 2, P, "right");
export const DIGIT_AT = DRUMS_Y.map((y) => sideMatrix([DRUM_X[1], y], TOP + 6, P, "right"));

/** The window the tape is seen through, from guide to guide. */
export const TAPE_WINDOW = slabOf({ x: TAPE_X - TAPE_T, y: -WINDOW, w: TAPE_T + INK + 0.2, d: WINDOW * 2, r: 0 }, TAPE_Z0, TAPE_Z1 - TAPE_Z0, P).fill;
