import { CountUp } from "@/components/landing/count-up";

/** Standards and tools the product maps to or runs: text badges, not partner logos; optional key numbers below. */
export function StandardsStrip({
  label,
  items,
  facts,
}: {
  label: string;
  items: string[];
  facts?: { label: string; value: number }[];
}) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4">
      <div className="clay-card px-6 py-6">
        <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-6">
          <p className="font-narrow shrink-0 text-sm text-muted-foreground">{label}</p>
          <ul className="flex flex-wrap justify-center gap-2">
            {items.map((it) => (
              <li key={it} className="clay-chip px-3.5 py-1.5 font-mono text-xs text-foreground">
                {it}
              </li>
            ))}
          </ul>
        </div>
        {facts && (
          <ul className="mt-5 flex flex-wrap items-baseline justify-center gap-x-5 gap-y-3 border-t border-[var(--border)] pt-5">
            {facts.map((f, i) => (
              <li key={f.label} className="flex items-baseline gap-2">
                {i > 0 && (
                  <span aria-hidden="true" className="me-3 text-muted-foreground">
                    ·
                  </span>
                )}
                <CountUp value={f.value} className="font-wide text-2xl" />
                <span className="text-xs text-muted-foreground">{f.label}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
