/** Shared landing easing (expo-out; the curve most reference sites use for entrances). */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Stagger delay for item `i`, capped so long lists never lag. */
export const stagger = (i: number, step = 0.06) => Math.min(i * step, 0.4);
