"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

const TEMPER_RINGS = ["var(--stage-1)", "var(--stage-2)", "var(--stage-3)", "var(--stage-4)", "var(--stage-5)"];

/**
 * Hero object: a clay shield on a forge platform ringed in neon violet and the
 * five temper colours (one ring per gate). Pure SVG, so it is crisp and costs
 * no image bytes. The entrance is CSS so the shield is painted before (and
 * without) hydration: it rises in once on desktop, then floats slowly while
 * visible (paused offscreen; off on mobile; reduced motion keeps only the fade).
 */
export function HeroShield({ size = "lg" }: { size?: "lg" | "sm" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const big = size === "lg";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        "relative mx-auto w-full",
        big && "animate-in fade-in-0 slide-in-from-bottom-6 fill-mode-both duration-[600ms] ease-out max-lg:animate-none",
      )}
      style={{ maxWidth: big ? 640 : 220 }}
    >
      <svg viewBox="0 0 640 480" className="block h-auto w-full">
        <defs>
          <radialGradient id={`glow-${size}`} cx="50%" cy="58%" r="55%">
            <stop offset="0" stopColor="#8b5cf6" stopOpacity="0.55" />
            <stop offset="0.55" stopColor="#3b82f6" stopOpacity="0.12" />
            <stop offset="1" stopColor="#0b0d1a" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`shield-${size}`} x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#a78bfa" />
            <stop offset="0.45" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#3b1d8f" />
          </linearGradient>
          <linearGradient id={`rim-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`plate-${size}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--clay-plate-1)" }} />
            <stop offset="1" style={{ stopColor: "var(--clay-plate-2)" }} />
          </linearGradient>
          <filter id={`soft-${size}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" style={{ floodColor: "var(--clay-drop)", floodOpacity: "var(--clay-drop-opacity)" }} />
          </filter>
        </defs>

        <ellipse cx="320" cy="290" rx="320" ry="200" fill={`url(#glow-${size})`} />

        {/* Forge platform: clay plate with neon and temper rings. */}
        <g>
          <ellipse cx="320" cy="392" rx="230" ry="52" fill={`url(#plate-${size})`} stroke="var(--clay-edge)" />
          <ellipse cx="320" cy="384" rx="210" ry="44" fill="none" stroke="#8b5cf6" strokeOpacity="0.85" strokeWidth="2.5" />
          <ellipse cx="320" cy="384" rx="246" ry="58" fill="none" stroke="#8b5cf6" strokeOpacity="0.35" strokeWidth="1.5" />
          {TEMPER_RINGS.map((c, i) => (
            <ellipse key={c} cx="320" cy="384" rx={150 - i * 22} ry={30 - i * 4.5} fill="none" stroke={c} strokeOpacity="0.8" strokeWidth="1.6" />
          ))}
        </g>

        {/* Clay shield with a soft rim highlight and an embossed check. */}
        <g className={big ? "hero-float" : undefined} data-paused={!inView} filter={`url(#soft-${size})`}>
          <path
            d="M320 70 L432 112 C436 114 438 117 438 121 L438 214 C438 286 390 336 320 362 C250 336 202 286 202 214 L202 121 C202 117 204 114 208 112 Z"
            fill={`url(#shield-${size})`}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
          />
          <path
            d="M320 92 L416 128 L416 214 C416 274 376 316 320 338"
            fill="none"
            stroke={`url(#rim-${size})`}
            strokeWidth="6"
            strokeLinecap="round"
            opacity="0.55"
          />
          <path d="M268 214 L304 250 L374 178" fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M268 214 L304 250 L374 178" fill="none" stroke="#3b1d8f" strokeOpacity="0.25" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 4)" />
        </g>
      </svg>
    </div>
  );
}
