import { ChevronDown } from "lucide-react";

/** Native <details> disclosures on hairlines: keyboard and screen-reader friendly. */
export function Faq({ items, defaultOpen }: { items: { q: string; a: string }[]; defaultOpen?: number }) {
  return (
    <div className="clay-card mx-auto max-w-3xl divide-y divide-[var(--border)] px-6">
      {items.map((item, i) => (
        <details key={item.q} open={i === defaultOpen} className="faq-item group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="pb-5 leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
