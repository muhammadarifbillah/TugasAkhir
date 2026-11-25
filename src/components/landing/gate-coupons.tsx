"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView } from "motion/react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useGateLink } from "@/components/landing/gate-link";
import { Hallmark } from "@/components/landing/hallmark";
import { useDesktopMotion } from "@/components/landing/landing-motion";
import { Ledger, LedgerRow } from "@/components/landing/ledger";
import { EASE } from "@/components/landing/motion";
import { tabKeyNav } from "@/components/studio/tab-key-nav";
import { nextIndex } from "@/lib/carousel";

const SLIDE_MS = 4500;

export interface CouponGate {
  title: string;
  why: string;
  artifact: string;
  celsius: string;
  colourName: string;
  nist: string[];
  iso: string[];
}

/**
 * The five gates as temper coupons (the reference samples a smith compares
 * against). On desktop they auto-advance; the selected coupon's bottom edge is
 * a CSS fill whose end advances the carousel, so pausing the animation pauses
 * it exactly. Pauses on hover, focus inside, offscreen, hidden tab and via the
 * button (WCAG 2.2.2). Mobile: manual only. Page scroll is never captured.
 */
export function GateCoupons({
  gates,
  labels,
}: {
  gates: CouponGate[];
  labels: { tabs: string; prev: string; next: string; pause: string; play: string; artifact: string; nist: string; iso: string };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const desktop = useDesktopMotion();
  const { setActive } = useGateLink();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const running = desktop && !userPaused && !hover && !focusWithin && inView && !docHidden;
  const ids = gates.map((_, i) => String(i));

  useEffect(() => {
    const onVis = () => setDocHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const go = (to: number, d: 1 | -1) => {
    setDir(d);
    setIndex(to);
  };
  const step = (d: 1 | -1) => go(nextIndex(index, gates.length, d), d);
  const g = gates[index];
  const tint = `var(--stage-${index + 1})`;

  return (
    <div
      ref={ref}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerLeave={() => setHover(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocusWithin(false);
      }}
    >
      <div
        role="tablist"
        aria-label={labels.tabs}
        className="grid grid-cols-5 gap-2 md:gap-3"
        onKeyDown={(e) => tabKeyNav(e, ids, String(index), (v) => go(Number(v), Number(v) >= index ? 1 : -1))}
      >
        {gates.map((c, i) => {
          const selected = i === index;
          const stage = (i + 1) as 1 | 2 | 3 | 4 | 5;
          return (
            <button
              key={c.title}
              type="button"
              role="tab"
              id={`gate-tab-${i}`}
              aria-selected={selected}
              aria-controls="gate-panel"
              tabIndex={selected ? 0 : -1}
              data-selected={selected}
              onClick={() => go(i, i >= index ? 1 : -1)}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="coupon relative flex min-h-11 min-w-0 flex-col items-start gap-1 overflow-hidden p-3 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)] max-sm:items-center max-sm:px-1.5 md:p-4"
              style={{ "--tint": `var(--stage-${stage})` } as React.CSSProperties}
            >
              {/* Stacked on phones: the coupon is ~60px wide there, too narrow for mark + "205 °C" in a row. */}
              <span className="flex flex-col items-center gap-1 sm:flex-row sm:gap-1.5">
                <Hallmark stage={stage} className="size-4 md:size-5" />
                <span className="font-narrow whitespace-nowrap text-xs tabular-nums md:text-sm">{c.celsius}</span>
              </span>
              <span className="font-narrow hidden text-xs text-muted-foreground lg:block">{c.colourName}</span>
              <span className="hidden w-full text-sm font-medium leading-snug lg:line-clamp-2">{c.title}</span>
              {selected && (
                <span
                  key={`fill-${index}`}
                  aria-hidden="true"
                  className="gate-progress absolute inset-x-0 bottom-0 h-0.5"
                  data-paused={!running}
                  style={{ background: `var(--stage-${stage})`, "--gate-ms": `${SLIDE_MS}ms` } as React.CSSProperties}
                  onAnimationEnd={() => step(1)}
                />
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false} custom={dir}>
        <m.div
          key={index}
          id="gate-panel"
          role="tabpanel"
          aria-labelledby={`gate-tab-${index}`}
          custom={dir}
          variants={{
            enter: (d: number) => ({ opacity: 0, x: 24 * d }),
            center: { opacity: 1, x: 0, transition: { duration: 0.35, ease: EASE } },
            exit: (d: number) => ({ opacity: 0, x: -24 * d, transition: { duration: 0.2, ease: EASE } }),
          }}
          initial="enter"
          animate="center"
          exit="exit"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) step(1);
            else if (info.offset.x > 60) step(-1);
          }}
          className="clay-card mt-8 grid touch-pan-y gap-8 p-7 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-9"
          style={{ boxShadow: `var(--clay-shadow), inset 0 3px 0 ${tint}` }}
        >
          <div>
            <p className="flex items-center gap-2">
              <Hallmark stage={(index + 1) as 1 | 2 | 3 | 4 | 5} />
              <span className="font-wide text-4xl tabular-nums" style={{ color: tint }}>
                {index + 1}
              </span>
            </p>
            <h3 className="mt-3 text-xl font-semibold md:text-2xl">{g.title}</h3>
            <p className="mt-2 max-w-[48ch] leading-relaxed text-muted-foreground">{g.why}</p>
          </div>
          <Ledger>
            <LedgerRow label={labels.artifact} value={g.artifact} />
            <LedgerRow label={labels.nist} value={<span className="font-mono text-xs">{g.nist.join(", ")}</span>} />
            <LedgerRow label={labels.iso} value={<span className="font-mono text-xs">{g.iso.join(", ")}</span>} />
          </Ledger>
        </m.div>
      </AnimatePresence>

      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={labels.prev}
          className="clay-chip inline-flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-12 text-center text-sm tabular-nums text-muted-foreground" aria-live={running ? "off" : "polite"}>
          {index + 1} / {gates.length}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={labels.next}
          className="clay-chip inline-flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? labels.play : labels.pause}
          title={userPaused ? labels.play : labels.pause}
          className="clay-chip ms-2 inline-flex size-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-lg:hidden"
        >
          {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
