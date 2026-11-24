"use client";

import { m } from "motion/react";
import {
  Boxes,
  Database,
  GitPullRequestArrow,
  KeyRound,
  Lock,
  MessageSquareText,
  ShieldHalf,
  Workflow,
} from "lucide-react";
import { EASE, reveal, stagger } from "@/components/landing/motion";
import { cn } from "@/lib/utils";

export type FeatureKey = "sdlc" | "iso" | "byok" | "github" | "docker" | "db" | "secure" | "prompt";

export interface FeatureTile {
  key: FeatureKey;
  title: string;
  desc: string;
}

const ICON: Record<FeatureKey, typeof Workflow> = {
  sdlc: Workflow,
  iso: ShieldHalf,
  byok: KeyRound,
  github: GitPullRequestArrow,
  docker: Boxes,
  db: Database,
  secure: Lock,
  prompt: MessageSquareText,
};

const SPAN: Record<FeatureKey, string> = {
  sdlc: "md:col-span-2 lg:row-span-2",
  iso: "md:col-span-2",
  byok: "",
  github: "",
  docker: "",
  db: "",
  secure: "md:col-span-2",
  prompt: "md:col-span-2",
};

const pop = (i: number) =>
  ({
    initial: { opacity: 0, scale: 0.85 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true },
    transition: { duration: 0.3, ease: EASE, delay: 0.2 + i * 0.05 },
  }) as const;

function MiniVisual({ k, stages, providers }: { k: FeatureKey; stages: string[]; providers: readonly string[] }) {
  const chip = "rounded-full border bg-background px-2.5 py-1 text-[11px]";
  switch (k) {
    case "sdlc":
      return (
        <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
          {stages.map((s, i) => (
            <m.span key={s} {...pop(i)} className={chip} style={{ borderColor: `var(--stage-${i + 1})` }}>
              <span className="font-semibold" style={{ color: `var(--stage-${i + 1})` }}>
                {i + 1}
              </span>{" "}
              {s}
            </m.span>
          ))}
        </div>
      );
    case "iso":
      return (
        <m.span {...pop(0)} className={cn(chip, "mt-auto self-start font-mono")}>
          PW.5.1 → A.8.28
        </m.span>
      );
    case "byok":
      return (
        <div className="mt-auto flex flex-wrap gap-1 pt-4">
          {providers.map((p, i) => (
            <m.span key={p} {...pop(i)} className={cn(chip, "px-2 py-0.5")}>
              {p}
            </m.span>
          ))}
        </div>
      );
    case "docker":
      return (
        <m.span {...pop(0)} className={cn(chip, "mt-auto inline-flex items-center gap-1.5 self-start")}>
          <span className="size-2 rounded-full bg-success" aria-hidden="true" /> Running · :3000
        </m.span>
      );
    case "db":
      return (
        <m.span {...pop(0)} className={cn(chip, "mt-auto self-start font-mono")}>
          postgres :5433
        </m.span>
      );
    case "github":
      return (
        <m.span {...pop(0)} className={cn(chip, "mt-auto self-start font-mono")}>
          release/v1.1 → main
        </m.span>
      );
    case "secure":
      return (
        <div className="mt-auto flex gap-1 pt-4 font-mono" aria-hidden="true">
          {"STRIDE".split("").map((l, i) => (
            <m.span key={l + i} {...pop(i)} className="flex size-7 items-center justify-center rounded-md border bg-background text-xs font-bold">
              {l}
            </m.span>
          ))}
        </div>
      );
    case "prompt":
      return (
        <div className="relative mt-auto flex w-36 rounded-lg border bg-background p-0.5 text-[11px]" aria-hidden="true">
          <m.span
            className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-md bg-primary"
            initial={{ x: 0 }}
            whileInView={{ x: "100%" }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, type: "spring", stiffness: 300, damping: 28 }}
          />
          <span className="relative z-10 flex-1 py-1 text-center">Plan</span>
          <span className="relative z-10 flex-1 py-1 text-center">Build</span>
        </div>
      );
  }
}

/** Eight feature tiles. Hover: lift + a spotlight that follows the pointer (CSS vars, no state). */
export function FeatureBento({
  tiles,
  stages,
  providers,
}: {
  tiles: FeatureTile[];
  stages: string[];
  providers: readonly string[];
}) {
  return (
    <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:auto-rows-[minmax(11rem,auto)] lg:grid-cols-4">
      {tiles.map((t, i) => {
        const Icon = ICON[t.key];
        return (
          <m.li
            key={t.key}
            {...reveal(stagger(i, 0.05))}
            whileHover={{ y: -3 }}
            onPointerMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              e.currentTarget.style.setProperty("--x", `${e.clientX - r.left}px`);
              e.currentTarget.style.setProperty("--y", `${e.clientY - r.top}px`);
            }}
            className={cn("soft-card soft-card-hover spotlight flex flex-col p-6", SPAN[t.key])}
          >
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h3 className={cn("mt-4 font-semibold", t.key === "sdlc" && "text-lg")}>{t.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{t.desc}</p>
            <MiniVisual k={t.key} stages={stages} providers={providers} />
          </m.li>
        );
      })}
    </ul>
  );
}
