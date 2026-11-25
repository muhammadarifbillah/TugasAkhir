import Image from "next/image";
import { Bot, Check, Database, FileCode2, PackageCheck, ScanSearch, ShieldCheck, Waypoints } from "lucide-react";
import { CountUp } from "@/components/landing/count-up";

const GUARD_ICONS = [Database, Waypoints, FileCode2, ScanSearch, PackageCheck];

/**
 * "What is ShieldForge": the AI's work beside what the gates guard, the five
 * guarded areas, then a facts card (real numbers from landing-facts) next to a
 * real studio screenshot.
 */
export function AboutSection({
  aiTitle,
  ai,
  gateTitle,
  gate,
  guardTitle,
  guardLede,
  guardCards,
  factsTitle,
  facts,
  shot,
}: {
  aiTitle: string;
  ai: string[];
  gateTitle: string;
  gate: string[];
  guardTitle: string;
  guardLede: string;
  guardCards: { title: string; bullets: string[] }[];
  factsTitle: string;
  facts: { label: string; value: number }[];
  shot: { src: string; width: number; height: number; alt: string };
}) {
  const list = (title: string, items: string[], Icon: typeof Bot, tone: string) => (
    <div className="clay-card p-7">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="mt-4 space-y-3">
        {items.map((x) => (
          <li key={x} className="flex gap-3 leading-relaxed text-muted-foreground">
            <Icon className={`mt-1 size-4 shrink-0 ${tone}`} aria-hidden="true" />
            <span>{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div className="space-y-10">
      <div className="grid gap-6 md:grid-cols-2">
        {list(aiTitle, ai, Bot, "text-[var(--clay-info)]")}
        {list(gateTitle, gate, ShieldCheck, "text-success")}
      </div>
      <div>
        <h3 className="font-wide text-center text-2xl md:text-3xl">{guardTitle}</h3>
        <p className="mx-auto mt-3 max-w-[60ch] text-center text-muted-foreground">{guardLede}</p>
        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guardCards.map((c, i) => {
            const Icon = GUARD_ICONS[i % GUARD_ICONS.length];
            return (
              <li key={c.title} className="clay-card clay-hover p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-[var(--clay-tint)] text-primary shadow-[inset_0_1px_0_var(--clay-hl)]">
                  <Icon className="size-5" aria-hidden="true" />
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
          })}
        </ul>
      </div>
      <div className="grid items-center gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <div className="clay-card p-7">
          <h3 className="font-narrow text-base text-muted-foreground">{factsTitle}</h3>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-5">
            {facts.map((f) => (
              <div key={f.label}>
                <dd className="font-wide text-4xl tabular-nums text-foreground">
                  <CountUp value={f.value} />
                </dd>
                <dt className="mt-1 text-sm text-muted-foreground">{f.label}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="clay-card overflow-hidden p-2">
          <Image src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} sizes="(min-width: 1024px) 760px, 100vw" className="block h-auto w-full rounded-[1.1rem]" />
        </div>
      </div>
    </div>
  );
}
