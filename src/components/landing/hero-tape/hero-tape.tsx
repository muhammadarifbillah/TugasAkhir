import "@/components/iso/iso.css";
import "./hero-tape.css";
import { fmt } from "@/lib/format";
import { HeroTapeFigure } from "./figure/art";
import { FindingsTable, type HeroTapeCopy } from "./findings-table";
import { POSTER_POSE, severityTally } from "./model";

export function HeroTape({ copy }: { copy: HeroTapeCopy }) {
  const steps = copy.steps.map((s) => fmt(s, severityTally()));
  return (
    <div className="hero-tape">
      <div data-hero-pin="">
        {/* Server-rendered poster SVG; on desktop hero-tape-live writes the same attributes per frame. Aria-hidden: its information is in the table. */}
        <div className="hero-tape-stage iso hero-tape-figure" data-hero-stage="" data-pose="poster" aria-hidden="true">
          <HeroTapeFigure pose={POSTER_POSE} />
        </div>
        <p className="mt-4 text-center text-muted-foreground" data-hero-step="" data-steps={JSON.stringify(steps)}>
          {steps[POSTER_POSE.step]}
        </p>
      </div>
      <FindingsTable copy={copy} />
    </div>
  );
}
