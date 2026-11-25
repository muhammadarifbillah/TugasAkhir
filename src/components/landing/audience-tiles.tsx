import { GraduationCap, Presentation, Store } from "lucide-react";

const ICONS = [GraduationCap, Store, Presentation];

/** Who ShieldForge is for: three clay tiles. */
export function AudienceTiles({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {items.map((it, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <li key={it.title} className="clay-card clay-hover p-7 text-center">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--clay-info-tint)] text-[var(--clay-info)] shadow-[inset_0_1px_0_var(--clay-hl)]">
              <Icon className="size-6" aria-hidden="true" />
            </span>
            <h3 className="mt-5 text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">{it.desc}</p>
          </li>
        );
      })}
    </ul>
  );
}
