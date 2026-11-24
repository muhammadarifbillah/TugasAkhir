import { ChevronDown } from "lucide-react";
import { Hallmark } from "@/components/landing/hallmark";

export interface SubStepGate {
  title: string;
  count: string;
  steps: { label: string; nist: string[]; iso: string[] }[];
}

/**
 * All 26 sub-steps, one native <details> per gate: a single level of
 * disclosure, several may be open at once, readable without JS, and found by
 * the browser's find-in-page.
 */
export function SubStepsDisclosure({
  summary,
  gates,
  labels,
}: {
  summary: string;
  gates: SubStepGate[];
  labels: { subStep: string; nist: string; iso: string };
}) {
  return (
    <div className="mt-12">
      <h3 className="font-narrow text-center text-base text-muted-foreground">{summary}</h3>
      <div className="clay-card mt-4 divide-y divide-[var(--border)] px-5 md:px-7">
        {gates.map((g, i) => (
          <details key={g.title} className="faq-item group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
              <Hallmark stage={(i + 1) as 1 | 2 | 3 | 4 | 5} />
              <span className="font-medium">{g.title}</span>
              <span className="font-narrow text-sm text-muted-foreground">{g.count}</span>
              <ChevronDown
                className="ms-auto size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="overflow-x-auto pb-4">
              <table className="w-full min-w-[34rem] border-collapse text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th scope="col" className="font-narrow py-2 pe-4 font-medium">
                      {labels.subStep}
                    </th>
                    <th scope="col" className="font-narrow py-2 pe-4 font-medium">
                      {labels.nist}
                    </th>
                    <th scope="col" className="font-narrow py-2 font-medium">
                      {labels.iso}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {g.steps.map((s) => (
                    <tr key={s.label} className="border-t border-[var(--border)]">
                      <td className="py-2 pe-4">{s.label}</td>
                      <td className="py-2 pe-4 font-mono text-xs">{s.nist.join(", ")}</td>
                      <td className="py-2 font-mono text-xs">{s.iso.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
