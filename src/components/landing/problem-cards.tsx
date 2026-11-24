"use client";

import { m } from "motion/react";
import { Bot, ClipboardX, FileSearch } from "lucide-react";
import { EASE, reveal, stagger } from "@/components/landing/motion";

const ICONS = [Bot, ClipboardX, FileSearch];
const TINTS = ["var(--stage-1)", "var(--stage-3)", "var(--stage-4)"];

export function ProblemCards({ items }: { items: { title: string; desc: string }[] }) {
  return (
    <ul className="mt-10 grid gap-4 md:grid-cols-3">
      {items.map((item, i) => {
        const Icon = ICONS[i % ICONS.length];
        return (
          <m.li key={item.title} className="soft-card soft-card-hover p-6" {...reveal(stagger(i, 0.08))}>
            <m.span
              className="stage-tint flex size-10 items-center justify-center rounded-xl border"
              style={{ "--tint": TINTS[i % TINTS.length] } as React.CSSProperties}
              initial={{ scale: 0.8 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, ease: EASE, delay: stagger(i, 0.08) }}
            >
              <Icon className="size-5" style={{ color: TINTS[i % TINTS.length] }} aria-hidden="true" />
            </m.span>
            <h3 className="mt-4 font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
          </m.li>
        );
      })}
    </ul>
  );
}
