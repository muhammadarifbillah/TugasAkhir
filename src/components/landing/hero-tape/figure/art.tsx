import * as React from "react";
import { FaceText, Line, Solid } from "./draw-server";
import { GATE4_STAMP, type Pose } from "../model";
import { frameAttributes, frameOf, tapeLines } from "./frame";
import {
  DIGIT_AT,
  HEAD_SEAMS,
  KNOB_KNURL,
  LINE_AT,
  PATHS,
  PLATE_RULES,
  REEL_DETAIL,
  RULER_TICKS,
  STAMP_AT,
  TABLE_HALO,
  TAPE_WINDOW,
} from "./geometry";
import { PAINT_ORDER, PARTS, type Part } from "./parts";
import { HEIGHT, LINE_SIZE, STAMP_SIZE, WIDTH } from "./view";

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));
const LINES = tapeLines();
// Inlays no thicker than 1.5 units are drawn flat (kit rule); creases are left out to keep the poster within 40 kB,
// except on the knob, whose knurl lines end on its top edge.
const FLAT = new Set(["label-plate", "ruler", "screw-1", "screw-2", "screw-3", "screw-4", "marker-1", "marker-2", "marker-3", "stamp-mark"]);

function detailOf(id: string, odometer: string): React.ReactNode {
  if (id === "ruler")
    return (
      <>
        <Line d={RULER_TICKS.minor} tone="lo" />
        <Line d={RULER_TICKS.major} tone="mid" />
      </>
    );
  if (id === "label-plate") return <Line d={PLATE_RULES} tone="lo" free />;
  if (id === "tension-knob") return <Line d={KNOB_KNURL} tone="lo" />;
  if (id === "reel-supply" || id === "reel-takeup") {
    const reel = REEL_DETAIL[id === "reel-supply" ? 0 : 1]!;
    return (
      <>
        <Line d={reel.seams} tone="lo" />
        <Line d={reel.pack} tone="lo" />
      </>
    );
  }
  if (id.startsWith("head-")) return <Line d={HEAD_SEAMS[Number(id.slice(5)) - 1]!} tone="mid" />;
  if (id.startsWith("marker-")) {
    const i = Number(id.slice(7)) - 1;
    return (
      <FaceText transform={LINE_AT[i]!} size={LINE_SIZE}>
        {LINES[i]}
      </FaceText>
    );
  }
  if (id === "stamp-mark")
    return (
      <FaceText transform={STAMP_AT} size={STAMP_SIZE} anchor="middle">
        {GATE4_STAMP}
      </FaceText>
    );
  if (id.startsWith("drum-")) {
    const i = Number(id.slice(5)) - 1;
    return (
      <FaceText transform={DIGIT_AT[i]!} size={14} anchor="middle">
        {odometer[i]}
      </FaceText>
    );
  }
  return null;
}

export function HeroTapeFigure({ pose }: { pose: Pose }) {
  const frame = frameOf(pose);
  const attrs = frameAttributes(frame);
  const draw = (p: Part) => (
    <g key={p.id} data-part={p.id} data-stage={p.id.startsWith("lamp-") ? p.id.slice(5) : undefined} {...attrs[p.id]}>
      {p.id === "table" ? <path className="iso-halo" d={TABLE_HALO} /> : null}
      <Solid paths={PATHS[p.id]!} tone={p.tone} crease={p.id === "tension-knob" ? "faint" : "none"} flat={FLAT.has(p.id)}>
        {detailOf(p.id, frame.odometer)}
      </Solid>
    </g>
  );
  // Parts that ride the tape, and the odometer drums, are each painted as one group at their first slot.
  const riders = PAINT_ORDER.map((m) => BY_ID.get(m)!).filter((m) => m.moves);
  const drums = PAINT_ORDER.filter((m) => m.startsWith("drum-")).map((m) => BY_ID.get(m)!);
  const body = PAINT_ORDER.map((id) => {
    const p = BY_ID.get(id)!;
    if (p.moves)
      return p === riders[0] ? (
        <g key="tape-run" clipPath="url(#hero-tape-window)">
          <g data-group="tape-run" transform={frame.tape}>
            {riders.map(draw)}
          </g>
        </g>
      ) : null;
    if (id.startsWith("drum-"))
      return p === drums[0] ? (
        <g key="odometer" data-odometer={frame.odometer}>
          {drums.map(draw)}
        </g>
      ) : null;
    return draw(p);
  });
  return (
    <svg className="iso-svg" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id="hero-tape-window">
          <path d={TAPE_WINDOW} />
        </clipPath>
      </defs>
      {body}
    </svg>
  );
}
