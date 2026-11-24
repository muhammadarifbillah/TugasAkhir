"use client";

import { m } from "motion/react";
import { Info } from "lucide-react";
import { EASE, stagger } from "@/components/landing/motion";

/**
 * §9: what a finished project leaves behind beside what ShieldForge does not
 * promise. The ticks draw in once (desktop; static on mobile).
 */
export function Deliverables({
  resultsTitle,
  items,
  limitsTitle,
  limits,
}: {
  resultsTitle: string;
  items: { title: string; desc: string }[];
  limitsTitle: string;
  limits: string[];
}) {
  return (
    <div className="grid gap-10 md:grid-cols-2 md:gap-8">
      <div>
        <h3 className="font-narrow text-base">{resultsTitle}</h3>
        <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
          {items.map((item, i) => (
            <li key={item.title} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
                  <m.path
                    d="M5 12.5l4.5 4.5L19 7.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, ease: EASE, delay: 0.1 + stagger(i, 0.1) }}
                  />
                </svg>
              </span>
              <div>
                <p className="font-medium">{item.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="font-narrow text-base">{limitsTitle}</h3>
        <ul className="mt-3 divide-y divide-[var(--ledger-rule)] border-y border-[var(--ledger-rule)]">
          {limits.map((l) => (
            <li key={l} className="flex items-start gap-3 py-3">
              <Info className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="leading-relaxed">{l}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
