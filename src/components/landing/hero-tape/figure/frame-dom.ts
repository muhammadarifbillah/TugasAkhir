// No runtime imports: the gated live chunk bundles this file; server-only values arrive as the SSR Timeline.
import type { PoseCore } from "../pose";

export interface Frame {
  tape: string;
  lamps: boolean[];
  brake: "clamp" | "open";
  caught: boolean[];
  fixed: boolean;
  odometer: string;
  stamp: boolean;
}

/** The part of a DOM element writeFrame needs; real elements satisfy it. */
export interface FrameNode {
  setAttribute(n: string, v: string): void;
  removeAttribute(n: string): void;
  querySelector(s: string): FrameNode | null;
  textContent: string | null;
}

/** Values only the server can compute, serialised on the stage as data-timeline. */
export interface Timeline {
  odometer: string[];
  axis: [number, number];
  shoe: { open: string; clamp: string };
}

type Attributes = Record<string, Record<string, string | undefined>>;

export function domAttributes(frame: Frame, shoe: Timeline["shoe"]): Attributes {
  const out: Attributes = {};
  const transform = frame.brake === "open" ? shoe.open : shoe.clamp;
  frame.lamps.forEach((lit, i) => (out[`lamp-${i + 1}`] = { "data-lit": lit ? "" : undefined }));
  out.brake = { "data-state": frame.brake, transform };
  out["brake-spring"] = { transform };
  frame.caught.forEach(
    (caught, i) => (out[`marker-${i + 1}`] = { "data-caught": caught ? "" : undefined, "data-fixed": frame.fixed ? "" : undefined }),
  );
  out["stamp-mark"] = { opacity: frame.stamp ? "1" : "0" };
  for (let i = 0; i < 3; i++) out[`drum-${i + 1}`] = { "data-digit": frame.odometer[i] };
  return out;
}

/** Writes a frame onto the server-rendered poster SVG under root. */
export function writeFrame(root: Pick<FrameNode, "querySelector">, frame: Frame, shoe: Timeline["shoe"]): void {
  for (const [id, attrs] of Object.entries(domAttributes(frame, shoe))) {
    const el = root.querySelector(`[data-part="${id}"]`);
    if (!el) continue;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined) el.removeAttribute(k);
      else el.setAttribute(k, v);
    }
    if (id.startsWith("drum-")) {
      const text = el.querySelector("text");
      if (text) text.textContent = frame.odometer[Number(id.slice(5)) - 1]!;
    }
  }
  root.querySelector('[data-group="tape-run"]')?.setAttribute("transform", frame.tape);
  root.querySelector("[data-odometer]")?.setAttribute("data-odometer", frame.odometer);
}

const fine = (v: number) => Math.round(v * 100) / 100;

export function frameFromCore(core: PoseCore, timeline: Timeline): Frame {
  const [ax, ay] = timeline.axis;
  return {
    // The tape runs along -y; axis is the projected unit step of [0, -1, 0].
    tape: `translate(${fine(core.tapeX * ax)} ${fine(core.tapeX * ay)})`,
    lamps: [0, 1, 2, 3, 4].map((i) => i < core.headsLit),
    brake: core.brake ? "clamp" : "open",
    caught: [0, 1, 2].map((i) => i < core.caught),
    fixed: core.fixed,
    odometer: timeline.odometer[core.caught]!,
    stamp: core.stamp,
  };
}
