/** Standards and tools the product maps to or runs: text badges, not partner logos. */
export function StandardsStrip({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4">
      <div className="clay-card flex flex-col items-center gap-4 px-6 py-6 md:flex-row md:justify-center md:gap-6">
        <p className="font-narrow shrink-0 text-sm text-muted-foreground">{label}</p>
        <ul className="flex flex-wrap justify-center gap-2">
          {items.map((it) => (
            <li key={it} className="clay-chip px-3.5 py-1.5 font-mono text-xs text-foreground">
              {it}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
