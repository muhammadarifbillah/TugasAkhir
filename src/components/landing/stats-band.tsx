import { CountUp } from "@/components/landing/count-up";
import { Reveal } from "@/components/landing/reveal";

export function StatsBand({ items, caption }: { items: { value: number; label: string }[]; caption: string }) {
  return (
    <Reveal className="mt-10">
      <dl className="soft-card grid grid-cols-2 divide-border md:grid-cols-5 md:divide-x">
        {items.map((item, i) => (
          <div key={item.label} className="flex flex-col gap-1 border-b p-6 last:border-b-0 md:border-b-0">
            <dt className="order-2 text-sm text-muted-foreground">{item.label}</dt>
            <dd
              className="display-type order-1 text-4xl tabular-nums md:text-5xl"
              style={{ color: `var(--stage-${(i % 5) + 1})` }}
            >
              <CountUp value={item.value} />
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
    </Reveal>
  );
}
