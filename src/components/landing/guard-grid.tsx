import { Check, Database, FileCode2, PackageCheck, ScanSearch, Waypoints } from "lucide-react";
import { HeroShield } from "@/components/landing/hero-shield";

const ICONS = [Database, Waypoints, FileCode2, ScanSearch, PackageCheck];

/**
 * "What ShieldForge guards": five clay cards around the shield emblem (the
 * emblem takes the centre of the second row on desktop, as in the reference).
 */
export function GuardGrid({ cards }: { cards: { title: string; bullets: string[] }[] }) {
  const items = cards.map((c, i) => ({ ...c, Icon: ICONS[i % ICONS.length] }));
  const card = (c: (typeof items)[number]) => (
    <li key={c.title} className="clay-card clay-hover p-6">
      <span className="flex size-11 items-center justify-center rounded-2xl bg-[rgba(124,58,237,0.18)] text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
        <c.Icon className="size-5" aria-hidden="true" />
      </span>
      <h3 className="mt-5 text-lg font-semibold">{c.title}</h3>
      <ul className="mt-3 space-y-2">
        {c.bullets.map((b) => (
          <li key={b} className="flex gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            {b}
          </li>
        ))}
      </ul>
    </li>
  );
  return (
    <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {items.slice(0, 3).map(card)}
      {items[3] && card(items[3])}
      <li className="hidden items-center justify-center lg:flex" aria-hidden="true">
        <HeroShield size="sm" />
      </li>
      {items.slice(4).map(card)}
    </ul>
  );
}
