import Image from "next/image";
import { Bot, ShieldCheck } from "lucide-react";
import { CountUp } from "@/components/landing/count-up";

/**
 * "What is ShieldForge": the AI's work beside what the gates guard, then a
 * facts card (real numbers from landing-facts) next to a real studio screenshot.
 */
export function AboutSection({
  aiTitle,
  ai,
  gateTitle,
  gate,
  factsTitle,
  facts,
  shot,
}: {
  aiTitle: string;
  ai: string[];
  gateTitle: string;
  gate: string[];
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
        {list(aiTitle, ai, Bot, "text-[#93b4ff]")}
        {list(gateTitle, gate, ShieldCheck, "text-success")}
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
