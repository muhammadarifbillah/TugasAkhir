"use client";

import { m } from "motion/react";
import { EASE, reveal, stagger } from "@/components/landing/motion";

/** Checklist of what a finished project leaves behind; each tick draws in. */
export function Deliverables({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <m.ul className="soft-card divide-y" {...reveal()}>
      {items.map((item, i) => (
        <li key={item.title} className="flex items-start gap-4 p-5">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
              <m.path
                d="M5 12.5l4.5 4.5L19 7.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, ease: EASE, delay: 0.2 + stagger(i, 0.12) }}
              />
            </svg>
          </span>
          <m.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 + stagger(i, 0.12) }}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">{item.desc}</p>
          </m.div>
        </li>
      ))}
    </m.ul>
  );
}
