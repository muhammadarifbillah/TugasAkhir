import type { Dictionary } from "@/lib/i18n";
import { computeSecurityScore } from "@/lib/scanner/score";
import { GATE4_STAMP, HERO_SCORE, findingRows } from "./model";

export type HeroTapeCopy = Dictionary["landing"]["heroTape"];

export function FindingsTable({ copy }: { copy: HeroTapeCopy }) {
  const rows = findingRows();
  return (
    <div className="clay-card mt-6 overflow-x-auto rounded-2xl">
      <table className="hero-tape-table w-full min-w-[40rem] text-left text-sm">
        <caption className="px-4 pt-4 text-left text-muted-foreground">{copy.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col" className="px-4 py-2">{copy.cols.finding}</th>
            <th scope="col" className="px-4 py-2">{copy.cols.tool}</th>
            <th scope="col" className="px-4 py-2">{copy.cols.severity}</th>
            <th scope="col" className="px-4 py-2">{copy.cols.penalty}</th>
            <th scope="col" className="px-4 py-2">{copy.cols.score}</th>
            <th scope="col" className="px-4 py-2">{copy.cols.mapping}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row" colSpan={4} className="px-4 py-2 font-normal text-muted-foreground">
              {copy.start}
            </th>
            <td className="px-4 py-2 font-mono">{computeSecurityScore([])}</td>
            <td />
          </tr>
          {rows.map((row, i) => (
            <tr key={i} data-finding={i} data-severity={row.severity}>
              <th scope="row" className="px-4 py-2 font-normal">{copy.findings[i]}</th>
              <td className="px-4 py-2">{row.tool}</td>
              <td className="px-4 py-2">
                <span className="hero-tape-sev">{copy.severity[row.severity as keyof HeroTapeCopy["severity"]]}</span>
              </td>
              <td className="px-4 py-2 font-mono">{"\u2212" + row.penalty}</td>
              <td className="px-4 py-2 font-mono">{row.scoreAfter}</td>
              <td className="px-4 py-2 font-mono">{row.mapping}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={4} className="px-4 py-2">{copy.final}</th>
            <td className="px-4 py-2 font-mono font-semibold">{HERO_SCORE}</td>
            <td />
          </tr>
          <tr>
            <th scope="row" colSpan={5} className="px-4 pb-4 pt-2 font-normal text-muted-foreground">
              {copy.stamp}
            </th>
            <td className="px-4 pb-4 pt-2 font-mono">{GATE4_STAMP}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
