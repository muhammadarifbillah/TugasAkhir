"use client";

import { Download } from "lucide-react";
import { CountUp } from "@/components/landing/count-up";
import { useGateLink } from "@/components/landing/gate-link";
import { Hallmark } from "@/components/landing/hallmark";
import { Ledger, LedgerRow } from "@/components/landing/ledger";
import { buildMatrixCsv, type MatrixRow } from "@/lib/matrix-csv";
import { cn } from "@/lib/utils";

export interface MappingRow {
  title: string;
  nist: string[];
  iso: string[];
  artifact: string;
}

/**
 * §6 proof: the facts ledger, the score formula, the gate → standards table
 * (linked to the §3 coupons) and a CSV of all sub-steps built in the browser.
 */
export function ProofSection({
  facts,
  formulaTitle,
  formula,
  rows,
  matrix,
  labels,
}: {
  facts: { label: string; value: number }[];
  formulaTitle: string;
  formula: string;
  rows: MappingRow[];
  matrix: MatrixRow[];
  labels: { stage: string; nist: string; iso: string; artifact: string; download: string };
}) {
  const { active, setActive } = useGateLink();

  const download = () => {
    const blob = new Blob(["\uFEFF" + buildMatrixCsv(matrix)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shieldforge-matriks-nist-iso.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-10 lg:grid-cols-10 lg:gap-8">
      <div className="clay-card p-7 lg:col-span-4">
        <Ledger>
          {facts.map((f) => (
            <LedgerRow key={f.label} label={f.label} value={<CountUp value={f.value} className="font-wide text-xl" />} />
          ))}
        </Ledger>
        <div className="mt-6 rounded-2xl bg-[rgba(124,58,237,0.12)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <h3 className="font-narrow text-base">{formulaTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed">{formula}</p>
        </div>
      </div>
      <div className="clay-card min-w-0 p-5 md:p-7 lg:col-span-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs text-muted-foreground">
                <th scope="col" className="font-narrow py-2.5 pe-4 font-medium">{labels.stage}</th>
                <th scope="col" className="font-narrow py-2.5 pe-4 font-medium">{labels.nist}</th>
                <th scope="col" className="font-narrow py-2.5 pe-4 font-medium">{labels.iso}</th>
                <th scope="col" className="font-narrow py-2.5 font-medium">{labels.artifact}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr
                  key={r.title}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  className={cn("border-b border-[var(--border)] transition-colors duration-150 last:border-b-0")}
                  style={active === i ? { background: `color-mix(in oklab, var(--stage-${i + 1}) 8%, transparent)` } : undefined}
                >
                  <td className="py-3 pe-4">
                    <span className="flex items-center gap-2 font-medium">
                      <Hallmark stage={(i + 1) as 1 | 2 | 3 | 4 | 5} className="size-4" />
                      {r.title}
                    </span>
                  </td>
                  <td className="py-3 pe-4 font-mono text-xs">{r.nist.join(", ")}</td>
                  <td className="py-3 pe-4 font-mono text-xs">{r.iso.join(", ")}</td>
                  <td className="py-3 text-muted-foreground">{r.artifact}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" className="clay-btn mt-6" onClick={download}>
          <Download className="size-4" aria-hidden="true" />
          {labels.download}
        </button>
      </div>
    </div>
  );
}
