/** Half the width of a station's text column, in viewBox units; the return lane bends around it. */
export const LOOP_LABEL_HALF = 80;
/** How far the return lane's control points reach past the end stations (the drawn curve reaches 3/4 of it). */
const BEND = 150;

export const LOOP_VIEW = { width: 1000, height: 520, margin: 165, yTop: 110, yBottom: 230, yReturn: 470 } as const;

export interface LoopLayout {
  stations: { x: number; y: number }[];
  /** Path d through every station in order. */
  forward: string;
  /** Path d from the last station, round below, back to the first. */
  back: string;
  arrows: { x: number; y: number; angle: number; dir: "forward" | "back" }[];
  returnLabel: { x: number; y: number };
}

const r = (v: number) => Math.round(v * 10) / 10;
const pt = (x: number, y: number) => `${r(x)} ${r(y)}`;

/** Winding left-to-right path through `n` (>= 2) gate stations with a return lane underneath. */
export function loopLayout(n: number, view: typeof LOOP_VIEW = LOOP_VIEW): LoopLayout {
  const { width, margin, yTop, yBottom, yReturn } = view;
  const stations = Array.from({ length: n }, (_, i) => ({
    x: margin + (i * (width - 2 * margin)) / (n - 1),
    y: i % 2 === 0 ? yTop : yBottom,
  }));

  let forward = `M${pt(stations[0].x, stations[0].y)}`;
  const arrows: LoopLayout["arrows"] = [];
  for (let i = 0; i + 1 < n; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    const xm = (a.x + b.x) / 2;
    forward += ` C${pt(xm, a.y)}, ${pt(xm, b.y)}, ${pt(b.x, b.y)}`;
    // Derivative of this cubic at t = 0.5.
    const angle = (Math.atan2(1.5 * (b.y - a.y), 0.75 * (b.x - a.x)) * 180) / Math.PI;
    arrows.push({ x: r(xm), y: r((a.y + b.y) / 2), angle: r(angle), dir: "forward" });
  }

  const first = stations[0];
  const last = stations[n - 1];
  const back =
    `M${pt(last.x, last.y)} C${pt(last.x + BEND, last.y)}, ${pt(last.x + BEND, yReturn)}, ${pt(last.x, yReturn)}` +
    ` L${pt(first.x, yReturn)} C${pt(first.x - BEND, yReturn)}, ${pt(first.x - BEND, first.y)}, ${pt(first.x, first.y)}`;
  arrows.push({ x: width / 2, y: yReturn, angle: 180, dir: "back" });

  return { stations, forward, back, arrows, returnLabel: { x: width / 2, y: yReturn + 28 } };
}
