"use client";

import { useRef } from "react";
import { useInView } from "motion/react";
import { cn } from "@/lib/utils";

const TEMPER_RINGS = ["var(--stage-1)", "var(--stage-2)", "var(--stage-3)", "var(--stage-4)", "var(--stage-5)"];

// Face outline: a heraldic shield, top corners at y=112, point at y=362.
const SHIELD =
  "M320 70 L432 112 C436 114 438 117 438 121 L438 214 C438 286 390 336 320 362 C250 336 202 286 202 214 L202 121 C202 117 204 114 208 112 Z";
const CHECK = "M268 214 L304 250 L374 178";
const PLATE_TOP = "M90 392 C90 426 194 444 320 444 C446 444 550 426 550 392";

/**
 * Hero object: a clay shield standing on a forge platform, built from layered
 * SVG so it is crisp, theme-aware and costs no image bytes. The extrusion,
 * platform wall and ground shadow fake the third dimension; the neon and the
 * five temper rings (one per gate) tie it to the stage colours. Its entrance is
 * CSS so the shield is painted before (and without) hydration: it rises in once
 * on desktop, then floats slowly while visible (paused offscreen; off on mobile;
 * reduced motion keeps only the fade).
 */
export function HeroShield({ size = "lg" }: { size?: "lg" | "sm" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const big = size === "lg";
  const u = size; // gradient/clip id suffix, unique per instance size

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
      <svg viewBox="0 0 640 500" className="block h-auto w-full" focusable="false">
        <defs>
          <radialGradient id={`glow-${u}`} cx="50%" cy="52%" r="55%">
            <stop offset="0" stopColor="var(--clay-halo-1)" />
            <stop offset="0.55" stopColor="var(--clay-halo-2)" />
            <stop offset="1" stopColor="var(--clay-halo-2)" stopOpacity="0" />
          </radialGradient>
          {/* Face: lit from the top-left. */}
          <linearGradient id={`face-${u}`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" stopColor="#b9a2ff" />
            <stop offset="0.42" stopColor="#7c3aed" />
            <stop offset="1" stopColor="#3b1d8f" />
          </linearGradient>
          {/* Thickness: the same outline offset down, in a darker violet. */}
          <linearGradient id={`edge-${u}`} x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0" style={{ stopColor: "var(--clay-shield-edge)" }} />
            <stop offset="1" style={{ stopColor: "var(--clay-shield-edge)" }} stopOpacity="0.72" />
          </linearGradient>
          <radialGradient id={`spec-${u}`} cx="35%" cy="25%" r="60%">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.34" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id={`inner-${u}`} cx="50%" cy="95%" r="70%">
            <stop offset="0" stopColor="#2a1266" stopOpacity="0.55" />
            <stop offset="1" stopColor="#2a1266" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`rim-${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`plate-${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--clay-plate-1)" }} />
            <stop offset="1" style={{ stopColor: "var(--clay-plate-2)" }} />
          </linearGradient>
          <linearGradient id={`wall-${u}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--clay-plate-2)" }} />
            <stop offset="1" style={{ stopColor: "var(--clay-plate-3)" }} />
          </linearGradient>
          <filter id={`soft-${u}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="20"
              stdDeviation="18"
              style={{ floodColor: "var(--clay-drop)", floodOpacity: "var(--clay-drop-opacity)" }}
            />
          </filter>
          <clipPath id={`clip-${u}`}>
            <path d={SHIELD} />
          </clipPath>
        </defs>

        <ellipse cx="320" cy="280" rx="320" ry="210" fill={`url(#glow-${u})`} />

        {/* Forge platform: a clay puck (wall + top) with neon and temper rings. */}
        <g>
          <ellipse cx="320" cy="474" rx="196" ry="15" fill="var(--clay-drop)" opacity="0.35" />
          <path d={`${PLATE_TOP} L550 416 C550 450 446 468 320 468 C194 468 90 450 90 416 Z`} fill={`url(#wall-${u})`} />
          <path d={PLATE_TOP} fill="none" stroke="var(--clay-edge)" strokeWidth="1.5" />
          <ellipse cx="320" cy="392" rx="230" ry="52" fill={`url(#plate-${u})`} stroke="var(--clay-edge)" />
          <ellipse cx="320" cy="392" rx="230" ry="52" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.2" strokeDasharray="260 460" transform="rotate(180 320 392)" />
          <ellipse cx="320" cy="390" rx="246" ry="58" fill="none" stroke="#8b5cf6" strokeOpacity="0.3" strokeWidth="1.5" />
          <ellipse cx="320" cy="390" rx="210" ry="44" fill="none" stroke="#8b5cf6" strokeOpacity="0.9" strokeWidth="2.5" />
          {TEMPER_RINGS.map((c, i) => (
            <ellipse
              key={c}
              cx="320"
              cy="389"
              rx={150 - i * 22}
              ry={30 - i * 4.5}
              fill="none"
              stroke={c}
              strokeOpacity="0.8"
              strokeWidth="1.6"
            />
          ))}
        </g>

        {/* Shield: thickness, face, shading, rim light, embossed check. */}
        <g className={big ? "hero-float" : undefined} data-paused={!inView} filter={`url(#soft-${u})`}>
          <path d={SHIELD} transform="translate(0 20)" fill={`url(#edge-${u})`} />
          <path d={SHIELD} fill={`url(#face-${u})`} stroke="rgba(255,255,255,0.22)" strokeWidth="2" />
          <g clipPath={`url(#clip-${u})`}>
            <ellipse cx="262" cy="140" rx="96" ry="70" fill={`url(#spec-${u})`} />
            <ellipse cx="320" cy="360" rx="230" ry="170" fill={`url(#inner-${u})`} />
          </g>
          <path
            d="M320 92 L222 128 L222 214 C222 266 256 306 302 330"
            fill="none"
            stroke={`url(#rim-${u})`}
            strokeWidth="5"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path d={CHECK} transform="translate(0 7)" fill="none" stroke="var(--clay-shield-edge)" strokeOpacity="0.55" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          <path d={CHECK} fill="none" stroke="#ffffff" strokeWidth="18" strokeLinecap="round" strokeLinejoin="round" />
          <path d={CHECK} transform="translate(0 -4)" fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    </div>
  );
}
