import { fmt } from "@/lib/format";
import { FindingsTable, type HeroTapeCopy } from "./findings-table";
import { POSTER_POSE, severityTally } from "./model";

export function HeroTape({ copy }: { copy: HeroTapeCopy }) {
  return (
    <div className="hero-tape">
      {/* Stage slot gets the poster SVG in M2b; the figure is aria-hidden, its information is in the table. */}
      <div className="hero-tape-stage" data-hero-stage="" data-pose="poster" aria-hidden="true" />
      <p className="mt-4 text-center text-muted-foreground">{fmt(copy.steps[POSTER_POSE.step], severityTally())}</p>
      <FindingsTable copy={copy} />
    </div>
  );
}
