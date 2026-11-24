"use client";

import { useEffect, useState } from "react";
import { animate, m, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Check, FileCode2, Folder, ShieldCheck } from "lucide-react";
import { EASE, stagger } from "@/components/landing/motion";

/**
 * Small product-look vignettes for "How it works". Each one plays a short
 * animation when it mounts (i.e. when its step becomes active).
 */

export interface VignetteCopy {
  prompt: string;
  plan: string[];
  planTitle: string;
  approve: string;
  verified: string;
  finding: string;
  fixed: string;
  exports: string[];
}

const frame = "flex h-full flex-col gap-3 p-5 text-sm";
const enter = (i: number) =>
  ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: EASE, delay: stagger(i, 0.08) },
  }) as const;

function PromptVignette({ text }: { text: string }) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);
  useEffect(() => {
    // Starts empty on server and client alike; reduced motion fills it in one step.
    const step = reduce ? text.length : 1;
    const id = setInterval(() => setCount((n) => Math.min(text.length, n + step)), 30);
    return () => clearInterval(id);
  }, [reduce, text.length]);
  return (
    <div className={frame}>
      <div className="flex gap-1.5">
        <span className="rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground">Plan</span>
        <span className="rounded-md px-2.5 py-1 text-xs text-muted-foreground">Build</span>
      </div>
      <div className="min-h-24 rounded-lg border bg-background p-3 font-mono text-xs leading-relaxed">
        {text.slice(0, count)}
        <span className="ms-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-primary" aria-hidden="true" />
      </div>
    </div>
  );
}

function PlanVignette({ title, actions, approve }: { title: string; actions: string[]; approve: string }) {
  return (
    <div className={frame}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ol className="flex flex-col gap-2">
        {actions.map((a, i) => (
          <m.li key={a} {...enter(i)} className="flex items-start gap-2 rounded-lg border bg-background p-3 text-xs">
            <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
              {i + 1}
            </span>
            {a}
          </m.li>
        ))}
      </ol>
      <m.span {...enter(actions.length)} className="self-end rounded-md bg-success px-3 py-1.5 text-xs font-medium text-success-foreground">
        {approve}
      </m.span>
    </div>
  );
}

function BuildVignette() {
  const files = ["app/page.tsx", "app/login/page.tsx", "lib/auth.ts"];
  const lines = [70, 92, 54, 80, 62, 88, 46];
  return (
    <div className="grid h-full grid-cols-[9rem_1fr] text-xs">
      <ul className="flex flex-col gap-1 border-e p-3">
        <li className="flex items-center gap-1.5 text-muted-foreground">
          <Folder className="size-3.5" aria-hidden="true" /> src
        </li>
        {files.map((f, i) => (
          <m.li key={f} {...enter(i)} className="flex items-center gap-1.5 truncate ps-3 font-mono">
            <FileCode2 className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {f.split("/").pop()}
          </m.li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 p-4" aria-hidden="true">
        {lines.map((w, i) => (
          <m.span
            key={i}
            className="h-2 origin-left rounded-full bg-muted-foreground/25"
            style={{ width: `${w}%` }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.1 + i * 0.05 }}
          />
        ))}
      </div>
    </div>
  );
}

function ScanVignette({ verified, finding }: { verified: string; finding: string }) {
  const mv = useMotionValue(0);
  const shown = useTransform(mv, (v) => Math.round(v));
  useEffect(() => {
    const c = animate(mv, 100, { duration: 1.2, ease: EASE });
    return () => c.stop();
  }, [mv]);
  return (
    <div className={frame}>
      <div className="rounded-lg border bg-background p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Score</span>
          <span className="rounded-md bg-success/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-success">
            <m.span>{shown}</m.span> / 100
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
          <m.div
            className="h-full origin-left rounded-full bg-success"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.2, ease: EASE }}
          />
        </div>
        <m.span
          className="mt-3 inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1.2, type: "spring", stiffness: 400, damping: 20 }}
        >
          <ShieldCheck className="size-3" aria-hidden="true" /> {verified}
        </m.span>
      </div>
      <m.div {...enter(2)} className="flex items-center justify-between rounded-lg border bg-background p-3 text-xs">
        <span className="truncate">{finding}</span>
        <span className="font-mono text-muted-foreground">Semgrep</span>
      </m.div>
    </div>
  );
}

function FixVignette({ finding, fixed }: { finding: string; fixed: string }) {
  return (
    <div className={`${frame} font-mono text-xs`}>
      <p className="font-sans text-muted-foreground">lib/bookings.ts:42</p>
      <div className="overflow-hidden rounded-lg border bg-background">
        <m.p {...enter(0)} className="bg-danger/10 px-3 py-2 text-danger">
          - db.query(`SELECT * FROM bookings WHERE id = {"${id}"}`)
        </m.p>
        <m.p
          className="px-3 py-2 text-success"
          initial={{ opacity: 0, backgroundColor: "color-mix(in oklab, var(--success) 30%, transparent)" }}
          animate={{ opacity: 1, backgroundColor: "color-mix(in oklab, var(--success) 10%, transparent)" }}
          transition={{ duration: 0.6, ease: EASE, delay: 0.3 }}
        >
          + db.query(&quot;SELECT * FROM bookings WHERE id = $1&quot;, [id])
        </m.p>
      </div>
      <div className="flex flex-wrap gap-2 font-sans">
        <span className="rounded-md border px-2 py-0.5 text-danger">{finding}</span>
        <span className="rounded-md border px-2 py-0.5 text-success">{fixed}</span>
      </div>
    </div>
  );
}

function ExportVignette({ items }: { items: string[] }) {
  return (
    <ul className={frame}>
      {items.map((item, i) => (
        <m.li key={item} {...enter(i)} className="flex items-center gap-2 rounded-lg border bg-background p-2.5 text-xs">
          <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-3" aria-hidden="true" />
          </span>
          {item}
        </m.li>
      ))}
    </ul>
  );
}

export function HowVignette({ step, copy }: { step: number; copy: VignetteCopy }) {
  switch (step) {
    case 0:
      return <PromptVignette text={copy.prompt} />;
    case 1:
      return <PlanVignette title={copy.planTitle} actions={copy.plan} approve={copy.approve} />;
    case 2:
      return <BuildVignette />;
    case 3:
      return <ScanVignette verified={copy.verified} finding={copy.finding} />;
    case 4:
      return <FixVignette finding={copy.finding} fixed={copy.fixed} />;
    default:
      return <ExportVignette items={copy.exports} />;
  }
}
