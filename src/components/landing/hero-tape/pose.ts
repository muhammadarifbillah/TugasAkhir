// No runtime imports: the gated live chunk bundles this file, so it must not pull server data.

/** [progress, world px] keyframes of the tape. */
export const TAPE_KEYS: readonly (readonly [number, number])[] = [
  [0, 0],
  [0.25, 220],
  [0.5, 330],
  [0.6, 330],
  [0.75, 400],
  [1, 560],
];
/** Heads 1..5 light up (cumulative). */
export const HEAD_AT = [1 / 12, 2 / 12, 3 / 12, 0.4, 0.9] as const;
/** Findings 1..3 are caught by head 4. */
export const CATCH_AT = [0.4, 0.45, 0.5] as const;
/** The brake clamps in [0.40, 0.60). */
export const BRAKE = [0.4, 0.6] as const;
export const FIXED_AT = 0.6;
export const STAMP_AT = 0.7;
/** Copy step index 0..4. */
export const STEP_AT = [0.125, 0.375, 0.625, 0.875] as const;

export interface PoseCore {
  progress: number;
  tapeX: number;
  headsLit: number;
  caught: number;
  brake: boolean;
  fixed: boolean;
  stamp: boolean;
  step: number;
}

export const countReached = (marks: readonly number[], p: number) => marks.filter((m) => m <= p).length;

export function tapeXAt(p: number): number {
  for (let i = 1; i < TAPE_KEYS.length; i++) {
    const [p1, x1] = TAPE_KEYS[i];
    if (p <= p1) {
      const [p0, x0] = TAPE_KEYS[i - 1];
      return x0 + ((x1 - x0) * (p - p0)) / (p1 - p0);
    }
  }
  return TAPE_KEYS[TAPE_KEYS.length - 1][1];
}

export function poseCore(progress: number): PoseCore {
  const p = Math.min(1, Math.max(0, progress));
  return {
    progress: p,
    tapeX: tapeXAt(p),
    headsLit: countReached(HEAD_AT, p),
    caught: countReached(CATCH_AT, p),
    brake: BRAKE[0] <= p && p < BRAKE[1],
    fixed: p >= FIXED_AT,
    stamp: p >= STAMP_AT,
    step: countReached(STEP_AT, p),
  };
}
