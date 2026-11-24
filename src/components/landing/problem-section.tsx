/** §1: one cited figure (when enabled) beside the three problems as a ruled list. */
export function ProblemSection({
  stat,
  items,
}: {
  stat: { show: boolean; text: string; source: string; url: string; newTab: string };
  items: string[];
}) {
  const figure = stat.text.match(/\d+\s?%/)?.[0];
  return (
    <div className="grid gap-10 lg:grid-cols-10 lg:gap-8">
      {stat.show && (
        <figure className="lg:col-span-5">
          {figure && (
            <p className="font-wide text-7xl tabular-nums md:text-8xl" aria-hidden="true">
              {figure}
            </p>
          )}
          <blockquote className="mt-3 max-w-[36ch] text-lg leading-snug">{stat.text}</blockquote>
          <figcaption className="mt-3 text-sm text-muted-foreground">
            <cite className="not-italic">
              <a href={stat.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
                {stat.source}
              </a>
              <span className="sr-only"> {stat.newTab}</span>
            </cite>
          </figcaption>
        </figure>
      )}
      <ul className={`divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)] ${stat.show ? "lg:col-span-5" : "lg:col-span-10"}`}>
        {items.map((item) => (
          <li key={item} className="py-4 leading-relaxed">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
