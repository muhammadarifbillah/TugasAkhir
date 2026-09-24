"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { DesignScreen as DesignScreenType } from "@/lib/design";

/** Logical viewport each mockup is authored against. */
const LOGICAL: Record<DesignScreenType["device"], { w: number; h: number }> = {
  desktop: { w: 1280, h: 800 },
  tablet: { w: 834, h: 1112 },
  mobile: { w: 390, h: 844 },
};

interface DesignScreenProps {
  html: string;
  title: string;
  device?: DesignScreenType["device"];
  /** Render at 1:1 (used inside the fullscreen viewer). Defaults to scaling to fit. */
  scaleToFit?: boolean;
  /** Card height when scaled to fit. */
  viewportHeight?: number;
  className?: string;
}

/**
 * Renders an AI-generated UI mockup in a locked-down iframe (`sandbox=""` gives
 * it an opaque origin and disables scripts). When `scaleToFit` is on, the mockup
 * is laid out at its logical device width and scaled down to fit the card, so
 * the whole screen is visible instead of being cropped.
 */
export function DesignScreen({
  html,
  title,
  device = "desktop",
  scaleToFit = true,
  viewportHeight = 240,
  className,
}: DesignScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { w, h } = LOGICAL[device] ?? LOGICAL.desktop;
  const [scale, setScale] = useState(0.3);
  const [left, setLeft] = useState(0);

  useEffect(() => {
    if (!scaleToFit) return;
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const cw = el.clientWidth;
      if (cw <= 0) return;
      const s = Math.min(cw / w, viewportHeight / h);
      const l = Math.max(0, (cw - w * s) / 2);
      setScale((prev) => (Math.abs(prev - s) < 0.001 ? prev : s));
      setLeft((prev) => (Math.abs(prev - l) < 0.5 ? prev : l));
    };
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const raf = requestAnimationFrame(update);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [scaleToFit, w, h, viewportHeight]);

  if (!scaleToFit) {
    return (
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        loading="lazy"
        style={{ width: w, height: h }}
        className={cn("border-0 bg-white", className)}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden bg-white", className)}
      style={{ height: viewportHeight }}
    >
      <iframe
        title={title}
        srcDoc={html}
        sandbox=""
        loading="lazy"
        style={{
          width: w,
          height: h,
          transform: `translateX(${left}px) scale(${scale})`,
          transformOrigin: "top left",
        }}
        className="pointer-events-none border-0 bg-white"
      />
    </div>
  );
}
