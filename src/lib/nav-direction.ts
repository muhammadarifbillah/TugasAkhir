/** View-transition types for route changes; the CSS lives in globals.css. */
export type NavType = "nav-forward" | "nav-back";

/** Direction of a stage-to-stage navigation, from the stages' order indexes. */
export function navDirection(fromOrder: number, toOrder: number): NavType {
  return toOrder < fromOrder ? "nav-back" : "nav-forward";
}
