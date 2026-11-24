/** §10: plain-language definitions, always visible (no hover-only tooltips). */
export function Glossary({ items }: { items: { term: string; definition: string }[] }) {
  return (
    <dl className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <div key={it.term} className="clay-card p-5">
          <dt className="font-medium">{it.term}</dt>
          <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">{it.definition}</dd>
        </div>
      ))}
    </dl>
  );
}
