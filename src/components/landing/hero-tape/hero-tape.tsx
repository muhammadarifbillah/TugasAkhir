import "@/components/iso/iso.css";
import "./hero-tape.css";
import { fmt } from "@/lib/format";
import { HeroTapeFigure } from "./figure/art";
import { FindingsTable, type HeroTapeCopy } from "./findings-table";
import { POSTER_POSE, severityTally } from "./model";

export function HeroTape({ copy }: { copy: HeroTapeCopy }) {
  return (
    <div className="hero-tape">
      {/* Server-rendered poster SVG; M2c moves it by writing the same attributes. Aria-hidden: its information is in the table. */}
      <div className="hero-tape-stage iso hero-tape-figure" data-hero-stage="" data-pose="poster" aria-hidden="true">
        <HeroTapeFigure pose={POSTER_POSE} />
      </div>
      <p className="mt-4 text-center text-muted-foreground">{fmt(copy.steps[POSTER_POSE.step], severityTally())}</p>
      <FindingsTable copy={copy} />
    </div>
  );
}
