"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, m, useInView } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { EASE } from "@/components/landing/motion";
import { tabKeyNav } from "@/components/studio/tab-key-nav";
import { nextIndex } from "@/lib/carousel";
import { cn } from "@/lib/utils";

const SLIDE_MS = 4500;

export interface StageCarouselProps {
  steps: { title: string; artifact: string; why: string }[];
  codes: readonly { nist: string; iso: string }[];
  labels: {
    tabs: string;
    prev: string;
    next: string;
    pause: string;
    play: string;
    artifact: string;
    nist: string;
    iso: string;
  };
}

/**
 * Five gates as an auto-advancing carousel. Page scroll is never captured.
 * The active segment's CSS fill drives the timing (onAnimationEnd advances),
 * so pausing the animation pauses the carousel exactly. It pauses on hover,
 * on focus inside, when offscreen, when the tab is hidden, and via the button
 * (WCAG 2.2.2). Under reduced motion slides crossfade instead of sliding.
 */
export function StageCarousel({ steps, codes, labels }: StageCarouselProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [userPaused, setUserPaused] = useState(false);
  const [hover, setHover] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [docHidden, setDocHidden] = useState(false);
  const running = !userPaused && !hover && !focusWithin && inView && !docHidden;
  const ids = steps.map((_, i) => String(i));

  useEffect(() => {
    const onVis = () => setDocHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const go = (to: number, d: 1 | -1) => {
    setDir(d);
    setIndex(to);
  };
  const step = (d: 1 | -1) => go(nextIndex(index, steps.length, d), d);

  const s = steps[index];
  const tint = `var(--stage-${index + 1})`;

  return (
    <div
      ref={ref}
      className="mt-10"
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
        className="grid grid-cols-5 gap-2"
        onKeyDown={(e) =>
          tabKeyNav(e, ids, String(index), (v) => go(Number(v), Number(v) >= index ? 1 : -1))
        }
      >
        {steps.map((st, i) => {
          const active = i === index;
          const passed = i < index;
          return (
            <button
              key={st.title}
              type="button"
              role="tab"
              id={`gate-tab-${i}`}
              aria-selected={active}
              aria-controls="gate-panel"
              tabIndex={active ? 0 : -1}
              onClick={() => go(i, i >= index ? 1 : -1)}
              className="group flex min-w-0 flex-col items-start gap-2 rounded-lg p-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex min-w-0 max-w-full items-center gap-2">
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold tabular-nums transition-colors duration-300",
                    active ? "text-white" : "bg-card",
                  )}
                  style={{
                    background: active || passed ? `var(--stage-${i + 1})` : undefined,
                    borderColor: `var(--stage-${i + 1})`,
                    color: active || passed ? "#fff" : `var(--stage-${i + 1})`,
                  }}
                >
                  {active && (
                    <m.span
                      layoutId="gate-dot-ring"
                      className="absolute -inset-1 rounded-full border-2"
                      style={{ borderColor: `var(--stage-${i + 1})` }}
                      transition={{ type: "spring", stiffness: 400, damping: 30 }}
                      aria-hidden="true"
                    />
                  )}
                  {passed ? <Check className="size-3.5" aria-hidden="true" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "hidden min-w-0 truncate text-xs font-medium lg:block",
                    active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  {st.title}
                </span>
              </span>
              <span className="relative h-1 w-full overflow-hidden rounded-full bg-muted" aria-hidden="true">
                {passed && <span className="absolute inset-0" style={{ background: `var(--stage-${i + 1})` }} />}
                {active && (
                  <span
                    key={`fill-${index}`}
                    className="gate-progress absolute inset-0"
                    data-paused={!running}
                    style={{ background: `var(--stage-${i + 1})`, "--gate-ms": `${SLIDE_MS}ms` } as React.CSSProperties}
                    onAnimationEnd={() => step(1)}
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-6">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <m.div
            key={index}
            id="gate-panel"
            role="tabpanel"
            aria-labelledby={`gate-tab-${index}`}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: 40 * d }),
              center: { opacity: 1, x: 0, transition: { duration: 0.45, ease: EASE } },
              exit: (d: number) => ({ opacity: 0, x: -40 * d, transition: { duration: 0.25, ease: EASE } }),
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
            className="soft-card stage-tint grid min-h-[18rem] touch-pan-y gap-8 p-8 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:p-10"
            style={{ "--tint": tint } as React.CSSProperties}
          >
            <div>
              <span className="display-type block text-6xl tabular-nums md:text-7xl" style={{ color: tint }}>
                {index + 1}
              </span>
              <h3 className="mt-4 text-xl font-semibold md:text-2xl">{s.title}</h3>
              <p className="mt-2 max-w-[48ch] text-sm leading-relaxed text-muted-foreground md:text-base">{s.why}</p>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{labels.artifact}</p>
              <p className="mt-1 text-sm">{s.artifact}</p>
            </div>
            <dl className="flex flex-col justify-center gap-5 border-t pt-6 md:border-s md:border-t-0 md:ps-8 md:pt-0">
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{labels.nist}</dt>
                <dd className="mt-1 font-mono text-xl font-semibold">{codes[index].nist}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground">{labels.iso}</dt>
                <dd className="mt-2 flex flex-wrap gap-1.5">
                  {codes[index].iso.split(", ").map((iso) => (
                    <span key={iso} className="rounded-full border bg-card px-3 py-1 font-mono text-sm">
                      {iso}
                    </span>
                  ))}
                </dd>
              </div>
            </dl>
          </m.div>
        </AnimatePresence>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label={labels.prev}
          className="rounded-full border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <span className="min-w-12 text-center text-sm tabular-nums text-muted-foreground" aria-live={running ? "off" : "polite"}>
          {index + 1} / {steps.length}
        </span>
        <button
          type="button"
          onClick={() => step(1)}
          aria-label={labels.next}
          className="rounded-full border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setUserPaused((p) => !p)}
          aria-label={userPaused ? labels.play : labels.pause}
          title={userPaused ? labels.play : labels.pause}
          className="ms-2 rounded-full border bg-card p-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {userPaused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
