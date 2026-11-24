import { Bot, ShieldCheck } from "lucide-react";

/** §2: what ShieldForge is — the AI's work beside what the gates guard, then who it is for. */
export function AboutSection({
  aiTitle,
  ai,
  gateTitle,
  gate,
  forTitle,
  forItems,
}: {
  aiTitle: string;
  ai: string[];
  gateTitle: string;
  gate: string[];
  forTitle: string;
  forItems: string[];
}) {
  return (
    <>
      <div className="grid gap-10 md:grid-cols-2 md:gap-8">
        <div>
          <h3 className="font-narrow text-base">{aiTitle}</h3>
          <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
            {ai.map((x) => (
              <li key={x} className="flex gap-3 py-3">
                <Bot className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-narrow text-base">{gateTitle}</h3>
          <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
            {gate.map((x) => (
              <li key={x} className="flex gap-3 py-3">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-12 max-w-3xl">
        <h3 className="font-narrow text-base">{forTitle}</h3>
        <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
          {forItems.map((x) => (
            <li key={x} className="py-3">
              {x}
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
