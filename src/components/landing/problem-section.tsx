import { TriangleAlert } from "lucide-react";

/** The problem: one cited figure in a clay panel beside the three problems. */
export function ProblemSection({
  stat,
  items,
}: {
  stat: { show: boolean; text: string; source: string; url: string; newTab: string };
  items: string[];
}) {
  const figure = stat.text.match(/\d+\s?%/)?.[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      {stat.show && (
        <figure className="clay-card p-8">
          {figure && (
            <p className="font-wide bg-gradient-to-b from-white to-[#b9a8ff] bg-clip-text text-7xl tabular-nums text-transparent md:text-8xl" aria-hidden="true">
              {figure}
            </p>
          )}
          <blockquote className="mt-4 text-lg leading-snug">{stat.text}</blockquote>
          <figcaption className="mt-4 text-sm text-muted-foreground">
            <cite className="not-italic">
              <a href={stat.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground">
                {stat.source}
              </a>
              <span className="sr-only"> {stat.newTab}</span>
            </cite>
          </figcaption>
        </figure>
      )}
      <ul className={`grid gap-4 ${stat.show ? "" : "lg:col-span-2"}`}>
        {items.map((item) => (
          <li key={item} className="clay-card flex gap-4 p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(244,63,94,0.14)] text-[#fda4af]">
              <TriangleAlert className="size-5" aria-hidden="true" />
            </span>
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
