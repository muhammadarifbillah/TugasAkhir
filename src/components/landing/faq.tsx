import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/landing/reveal";

/** Native <details> disclosures: keyboard and screen-reader friendly, smooth open via CSS. */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <Reveal className="soft-card mx-auto mt-10 max-w-3xl divide-y">
      {items.map((item) => (
        <details key={item.q} className="faq-item group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p className="px-6 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
        </details>
      ))}
    </Reveal>
  );
}
