/** Shared landing easing (expo-out; the curve most reference sites use for entrances). */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Stagger delay for item `i`, capped so long lists never lag. */
export const stagger = (i: number, step = 0.06) => Math.min(i * step, 0.4);

/** Outside this query the gsap/lenis modules are never downloaded (PRD bab 24a). */
export const LANDING_MOTION_QUERY =
  "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

export function shouldLoadLandingMotion(
  matchMedia?: (query: string) => { matches: boolean },
): boolean {
  if (!matchMedia) return false;
  return matchMedia(LANDING_MOTION_QUERY).matches;
}
