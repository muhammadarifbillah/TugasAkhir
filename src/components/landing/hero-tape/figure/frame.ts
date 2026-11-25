import { translateAlong } from "@/components/iso/iso-kit";
import { HERO_FINDINGS, type Pose } from "../model";
import { BRAKE_LIFT, P } from "./view";

export function tapeLines(): string[] {
  return HERO_FINDINGS.map((f) => `${(f.filePath ?? "").split("/").pop()}:${f.line} ${f.ruleId}`);
}

export interface Frame {
  tape: string;
  lamps: boolean[];
  brake: "clamp" | "open";
  caught: boolean[];
  fixed: boolean;
  odometer: string;
  stamp: boolean;
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

type Attributes = Record<string, Record<string, string | undefined>>;

// M2c writes these same attributes per frame, so the poster and the timeline cannot drift apart.
export function frameAttributes(frame: Frame): Attributes {
  const out: Attributes = {};
  const shoe = translateAlong(P, [0, 0, frame.brake === "open" ? BRAKE_LIFT : 0]);
  frame.lamps.forEach((lit, i) => (out[`lamp-${i + 1}`] = { "data-lit": lit ? "" : undefined }));
  out.brake = { "data-state": frame.brake, transform: shoe };
  out["brake-spring"] = { transform: shoe };
  frame.caught.forEach(
    (caught, i) => (out[`marker-${i + 1}`] = { "data-caught": caught ? "" : undefined, "data-fixed": frame.fixed ? "" : undefined }),
  );
  out["stamp-mark"] = { opacity: frame.stamp ? "1" : "0" };
  for (let i = 0; i < 3; i++) out[`drum-${i + 1}`] = { "data-digit": frame.odometer[i] };
  return out;
}
