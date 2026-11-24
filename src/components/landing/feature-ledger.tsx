/** §8: features grouped Build / Verify / Deliver as ruled spec columns (no card grid). */
export function FeatureLedger({ groups }: { groups: { title: string; rows: string[] }[] }) {
  return (
    <div className="grid gap-10 md:grid-cols-3 md:gap-8">
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3 className="font-narrow text-base">{g.title}</h3>
          <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
            {g.rows.map((r) => (
              <li key={r} className="py-3 leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
