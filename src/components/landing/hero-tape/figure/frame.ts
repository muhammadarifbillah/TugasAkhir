import { axisVector, translateAlong } from "@/components/iso/iso-kit";
import { computeSecurityScore } from "@/lib/scanner/score";
import { HERO_FINDINGS, type Pose } from "../model";
import { domAttributes, writeFrame, type Frame, type FrameNode, type Timeline } from "./frame-dom";
import { BRAKE_LIFT, P } from "./view";

export type { Frame, FrameNode } from "./frame-dom";

export function tapeLines(): string[] {
  return HERO_FINDINGS.map((f) => `${(f.filePath ?? "").split("/").pop()}:${f.line} ${f.ruleId}`);
}

export function frameOf(pose: Pose): Frame {
  return {
    // The tape runs along -y: screen left to right.
    tape: translateAlong(P, [0, -pose.tapeX, 0]),
    lamps: [0, 1, 2, 3, 4].map((i) => i < pose.headsLit),
    brake: pose.brake ? "clamp" : "open",
    caught: [0, 1, 2].map((i) => i < pose.caught),
    fixed: pose.fixed,
    odometer: String(pose.odometer).padStart(3, "0"),
    stamp: pose.stamp,
  };
}

const SHOE: Timeline["shoe"] = { open: translateAlong(P, [0, 0, BRAKE_LIFT]), clamp: translateAlong(P, [0, 0, 0]) };

// M2c writes these same attributes per frame, so the poster and the timeline cannot drift apart.
export function frameAttributes(frame: Frame) {
  return domAttributes(frame, SHOE);
}

/** Writes a frame onto the server-rendered poster SVG under root. */
export function applyFrame(root: Pick<FrameNode, "querySelector">, frame: Frame): void {
  writeFrame(root, frame, SHOE);
}

/** Server-only values the live module needs, serialised on the stage as data-timeline. */
export function heroTimeline(): Timeline {
  return {
    odometer: [0, 1, 2, 3].map((i) => String(computeSecurityScore(HERO_FINDINGS.slice(0, i))).padStart(3, "0")),
    axis: axisVector(P, [0, -1, 0]),
    shoe: SHOE,
  };
}
