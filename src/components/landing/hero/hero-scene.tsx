import { useId, type ReactNode } from "react";
import type { BlockKind, SiteCategory } from "@/lib/site-categories";
import { HERO_MOODS, type HeroMood } from "./moods";

const W = 200;
const H = 300;
const HORIZON = 190;
const WHITE = "#ffffff";
const INK = "#0b0f19";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A pine: stacked triangles, optional snow caps. */
const pine = (x: number, base: number, h: number, fill: string, snow?: string) => {
  const w = h * 0.42;
  const tiers = [0, 0.3, 0.55].map((t, i) => {
    const top = base - h + t * h;
    const bottom = base - h * (0.35 - t * 0.35) - (i === 2 ? 0 : h * 0.15);
    const half = (w / 2) * (0.6 + t);
    return `M${x} ${top} L${x + half} ${bottom} L${x - half} ${bottom} Z`;
  });
  return (
    <g key={`${x}-${base}`}>
      <rect x={x - 1.2} y={base - h * 0.2} width={2.4} height={h * 0.2} fill={fill} />
      <path d={tiers.join(" ")} fill={fill} />
      {snow && <path d={`M${x} ${base - h} L${x + w * 0.18} ${base - h * 0.78} L${x - w * 0.18} ${base - h * 0.78} Z`} fill={snow} />}
    </g>
  );
};

/** A round-canopy tree. */
const roundTree = (x: number, base: number, r: number, fill: string) => (
  <g key={`${x}-${base}`}>
    <rect x={x - 1.5} y={base - r * 1.6} width={3} height={r * 1.6} fill={fill} />
    <circle cx={x} cy={base - r * 1.8} r={r} fill={fill} />
    <circle cx={x - r * 0.7} cy={base - r * 1.4} r={r * 0.7} fill={fill} />
    <circle cx={x + r * 0.7} cy={base - r * 1.45} r={r * 0.75} fill={fill} />
  </g>
);

/** A leaning palm with five fronds. */
const palm = (x: number, base: number, h: number, lean: number, fill: string) => {
  const tx = x + lean;
  const ty = base - h;
  const fronds = [-150, -115, -70, -30, 10].map((a) => {
    const r = (a * Math.PI) / 180;
    const ex = tx + Math.cos(r) * 26;
    const ey = ty + Math.sin(r) * 14 + 10;
    return `M${tx} ${ty} Q${(tx + ex) / 2} ${ty - 8} ${ex.toFixed(1)} ${ey.toFixed(1)}`;
  });
  return (
    <g key={`${x}-${base}`} fill="none" stroke={fill} strokeLinecap="round">
      <path d={`M${x} ${base} Q${x + lean * 0.2} ${base - h * 0.6} ${tx} ${ty}`} strokeWidth={3} />
      <path d={fronds.join(" ")} strokeWidth={4} />
    </g>
  );
};

/** A flat-topped acacia. */
const acacia = (x: number, base: number, s: number, fill: string) => (
  <g key={`${x}-${base}`} fill={fill}>
    <path d={`M${x - 1.5} ${base} L${x - 1} ${base - 30 * s} L${x - 14 * s} ${base - 44 * s} L${x - 12 * s} ${base - 45 * s} L${x} ${base - 34 * s} L${x + 12 * s} ${base - 46 * s} L${x + 14 * s} ${base - 45 * s} L${x + 2} ${base - 30 * s} L${x + 1.5} ${base} Z`} />
    <ellipse cx={x} cy={base - 48 * s} rx={38 * s} ry={7 * s} />
    <ellipse cx={x - 10 * s} cy={base - 52 * s} rx={20 * s} ry={5 * s} />
  </g>
);

const hills = (y: number, amp: number, fill: string, phase = 0) => {
  const pts = Array.from({ length: 6 }, (_, i) => `Q${i * 40 + 20} ${y - amp * (((i + phase) % 2) ? 1 : -0.4)} ${(i + 1) * 40} ${y}`);
  return <path d={`M0 ${H} L0 ${y} ${pts.join(" ")} L${W} ${H} Z`} fill={fill} />;
};

function Scenery({ m, ids }: { m: HeroMood; ids: { light: string } }): ReactNode {
  const sun = (cx: number, cy: number, r: number) => (
    <>
      <circle cx={cx} cy={cy} r={r * 3.2} fill={`url(#${ids.light})`} />
      <circle cx={cx} cy={cy} r={r} fill={m.light} />
    </>
  );
  switch (m.scenery) {
    case "waterfall":
      return (
        <>
          <path d={`M0 0 L62 0 L70 90 L64 200 L0 230 Z`} fill={m.silhouette} />
          <path d={`M200 0 L118 0 L112 110 L120 210 L200 230 Z`} fill={m.silhouette} />
          <rect x={68} y={30} width={46} height={180} fill={m.water} opacity={0.92} />
          <rect x={76} y={30} width={6} height={180} fill={WHITE} opacity={0.7} />
          <rect x={96} y={30} width={4} height={180} fill={WHITE} opacity={0.6} />
          <ellipse cx={92} cy={212} rx={70} ry={16} fill={WHITE} opacity={0.55} />
          <polyline points="150,20 140,62 152,64 136,118 146,120 128,170" fill="none" stroke={WHITE} strokeWidth={2} strokeLinejoin="round" />
          <rect x={0} y={222} width={W} height={H - 222} fill={m.ground} />
          <ellipse cx={20} cy={40} rx={40} ry={26} fill={m.silhouette} />
          <ellipse cx={186} cy={30} rx={34} ry={24} fill={m.silhouette} />
        </>
      );
    case "beach":
      return (
        <>
          {sun(150, 60, 10)}
          <rect x={0} y={HORIZON - 25} width={W} height={60} fill={m.water} />
          <rect x={0} y={HORIZON - 25} width={W} height={4} fill={WHITE} opacity={0.35} />
          <path d={`M0 ${HORIZON + 30} Q100 ${HORIZON + 10} ${W} ${HORIZON + 35} L${W} ${H} L0 ${H} Z`} fill={m.ground} />
          {palm(36, 250, 150, 18, m.silhouette)}
          {palm(64, 240, 110, -10, m.silhouette)}
          {palm(176, 245, 130, -16, m.silhouette)}
        </>
      );
    case "meadow":
      return (
        <>
          {sun(46, 58, 9)}
          {hills(HORIZON - 10, 18, m.water, 1)}
          {hills(HORIZON + 20, 14, m.ground)}
          {roundTree(150, HORIZON + 6, 14, m.silhouette)}
          {roundTree(176, HORIZON + 10, 10, m.silhouette)}
          {roundTree(28, HORIZON + 14, 9, m.silhouette)}
        </>
      );
    case "savanna":
      return (
        <>
          {sun(120, HORIZON - 30, 16)}
          <rect x={0} y={HORIZON + 15} width={W} height={H} fill={m.ground} />
          <rect x={0} y={HORIZON + 12} width={W} height={5} fill={m.water} />
          {acacia(70, HORIZON + 16, 1.3, m.silhouette)}
          {acacia(168, HORIZON + 16, 0.6, m.silhouette)}
        </>
      );
    case "underwater":
      return (
        <>
          {[20, 60, 110, 150].map((x, i) => (
            <path key={x} d={`M${x} 0 L${x + 22} 0 L${x + 50 + i * 6} ${H} L${x + 20} ${H} Z`} fill={m.light} opacity={0.12} />
          ))}
          <circle cx={100} cy={-20} r={90} fill={`url(#${ids.light})`} />
          <path d="M60 120 Q100 92 142 112 Q150 104 160 100 Q156 112 158 124 Q148 118 140 120 Q120 140 92 136 L88 146 L82 134 Q70 132 60 120 Z" fill={m.silhouette} opacity={0.85} />
          <path d={`M0 ${H} L0 250 Q60 230 110 252 Q160 238 ${W} 248 L${W} ${H} Z`} fill={m.ground} />
          {[30, 48, 150].map((x) => (
            <path key={x} d={`M${x} 252 q-6 -20 2 -40 q6 18 -2 40`} fill={m.silhouette} />
          ))}
        </>
      );
    case "forest":
      return (
        <>
          {sun(100, HORIZON - 10, 18)}
          {[8, 28, 44, 64, 84, 118, 138, 156, 176, 194].map((x, i) => (
            <rect key={x} x={x - 3} y={20 + (i % 3) * 10} width={6 + (i % 2) * 3} height={H} fill={m.silhouette} opacity={0.75 + (i % 2) * 0.25} />
          ))}
          {[16, 52, 96, 134, 170].map((x, i) => pine(x, HORIZON + 30, 70 + (i % 2) * 20, m.silhouette))}
          <rect x={0} y={HORIZON + 28} width={W} height={H} fill={m.ground} />
        </>
      );
    case "dawn":
      return (
        <>
          {sun(80, HORIZON - 20, 12)}
          {hills(HORIZON, 22, m.water, 1)}
          {hills(HORIZON + 26, 12, m.ground)}
          {roundTree(140, HORIZON + 2, 18, m.silhouette)}
          {roundTree(172, HORIZON + 8, 12, m.silhouette)}
          {roundTree(30, HORIZON + 12, 11, m.silhouette)}
        </>
      );
    case "winter":
      return (
        <>
          {sun(60, 50, 8)}
          {hills(HORIZON - 5, 16, m.water, 1)}
          {[30, 58, 150, 178].map((x, i) => pine(x, HORIZON + 10 + (i % 2) * 8, 60 + (i % 2) * 18, m.silhouette, WHITE))}
          {hills(HORIZON + 22, 10, m.ground)}
          {[12, 40, 74, 120, 160, 188, 96, 132].map((x, i) => (
            <circle key={x} cx={x} cy={30 + ((i * 37) % 140)} r={1.4} fill={WHITE} opacity={0.9} />
          ))}
        </>
      );
  }
}

/** Translucent white placeholder for one content block: no copy, only bars and boxes. */
function block(kind: BlockKind, b: Box, accent: string): ReactNode {
  const panel = <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={WHITE} opacity={0.7} />;
  const line = (x: number, y: number, w: number, o = 0.4) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={2.4} rx={1.2} fill={INK} opacity={o} />;
  const rows = (n: number, w = 0.8) => Array.from({ length: n }, (_, i) => line(b.x + 5, b.y + 6 + i * ((b.h - 10) / n), b.w * w - (i % 2) * 14));
  switch (kind) {
    case "cards": {
      const cw = (b.w - 8) / 3;
      return [0, 1, 2].map((i) => (
        <g key={i}>
          <rect x={b.x + i * (cw + 4)} y={b.y} width={cw} height={b.h} rx={3} fill={WHITE} opacity={0.7} />
          <rect x={b.x + i * (cw + 4) + 3} y={b.y + 3} width={cw - 6} height={b.h * 0.5} rx={2} fill={i === 1 ? accent : INK} opacity={i === 1 ? 0.8 : 0.18} />
          {line(b.x + i * (cw + 4) + 4, b.y + b.h * 0.5 + 8, cw * 0.6)}
        </g>
      ));
    }
    case "chart":
      return (
        <>
          {panel}
          {[0.5, 0.8, 0.4, 0.95, 0.65, 0.75].map((v, i) => (
            <rect key={i} x={b.x + 6 + i * ((b.w - 12) / 6)} y={b.y + b.h - 4 - (b.h - 10) * v} width={(b.w - 12) / 6 - 3} height={(b.h - 10) * v} rx={1} fill={accent} opacity={0.85} />
          ))}
        </>
      );
    case "table":
      return (
        <>
          {panel}
          {Array.from({ length: 4 }, (_, i) => (
            <rect key={i} x={b.x + 4} y={b.y + 4 + i * ((b.h - 8) / 4)} width={b.w - 8} height={(b.h - 8) / 4 - 2} fill={INK} opacity={i === 0 ? 0.3 : 0.1} />
          ))}
        </>
      );
    case "form":
    case "cart":
      return (
        <>
          {panel}
          <rect x={b.x + 5} y={b.y + 5} width={b.w - 10} height={b.h * 0.22} rx={2} fill={INK} opacity={0.12} />
          <rect x={b.x + 5} y={b.y + 8 + b.h * 0.22} width={b.w - 10} height={b.h * 0.22} rx={2} fill={INK} opacity={0.12} />
          <rect x={b.x + b.w - 40} y={b.y + b.h - 12} width={35} height={8} rx={4} fill={accent} />
        </>
      );
    case "player":
      return (
        <>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={INK} opacity={0.75} />
          <path d={`M${b.x + b.w / 2 - 6} ${b.y + b.h / 2 - 8} l14 8 l-14 8 Z`} fill={WHITE} />
        </>
      );
    case "schedule":
      return (
        <>
          {panel}
          {Array.from({ length: 10 }, (_, i) => (
            <rect key={i} x={b.x + 4 + (i % 5) * ((b.w - 8) / 5)} y={b.y + 4 + Math.floor(i / 5) * ((b.h - 8) / 2)} width={(b.w - 8) / 5 - 3} height={(b.h - 8) / 2 - 3} rx={1.5} fill={i % 3 === 0 ? accent : INK} opacity={i % 3 === 0 ? 0.8 : 0.15} />
          ))}
        </>
      );
    case "code":
      return (
        <>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={3} fill={INK} opacity={0.8} />
          {Array.from({ length: 5 }, (_, i) => (
            <rect key={i} x={b.x + 6 + (i % 2) * 8} y={b.y + 6 + i * ((b.h - 10) / 5)} width={b.w * (0.3 + ((i * 7) % 5) / 10)} height={2.4} rx={1.2} fill={i % 2 ? accent : WHITE} opacity={0.8} />
          ))}
        </>
      );
    default:
      return (
        <>
          {panel}
          {rows(4)}
        </>
      );
  }
}

/** One hero wall panel: the mood landscape as the site's banner, a thin website skeleton on top. No text, no raster. */
export function HeroScene({ category, mood, className }: { category: SiteCategory; mood: number; className?: string }) {
  const m = HERO_MOODS[(mood - 1 + HERO_MOODS.length) % HERO_MOODS.length];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const ids = { sky: `hs-sky-${uid}`, light: `hs-light-${uid}` };
  const blocks = category.pages[0].blocks;
  const sidebar = blocks.includes("sidebar");
  const x0 = sidebar ? 48 : 10;
  const content = blocks.filter((k) => k !== "nav" && k !== "hero" && k !== "sidebar");
  const top = 214;
  const each = (H - 10 - top - (content.length - 1) * 5) / Math.max(content.length, 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      data-mood={mood}
      className={className}
    >
      <defs>
        <linearGradient id={ids.sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={m.sky[0]} />
          <stop offset="0.65" stopColor={m.sky[1]} />
        </linearGradient>
        <radialGradient id={ids.light}>
          <stop offset="0" stopColor={m.light} stopOpacity="0.7" />
          <stop offset="1" stopColor={m.light} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill={`url(#${ids.sky})`} />
      <Scenery m={m} ids={ids} />

      <g data-scene-nav="">
        <rect x={6} y={8} width={W - 12} height={16} rx={3} fill={WHITE} opacity={0.85} />
        <rect x={12} y={13} width={20} height={6} rx={1.5} fill={m.accent} />
        {[96, 118, 140].map((x) => (
          <rect key={x} x={x} y={15} width={16} height={2.4} rx={1.2} fill={INK} opacity={0.45} />
        ))}
        <rect x={164} y={12} width={24} height={8} rx={4} fill={m.accent} />
      </g>
      {sidebar && (
        <g>
          <rect x={6} y={30} width={36} height={H - 40} rx={3} fill={WHITE} opacity={0.7} />
          {[40, 52, 64, 76, 88].map((y, i) => (
            <rect key={y} x={11} y={y} width={i === 0 ? 26 : 20} height={2.4} rx={1.2} fill={i === 0 ? m.accent : INK} opacity={i === 0 ? 1 : 0.4} />
          ))}
        </g>
      )}
      <g data-scene-cta="">
        <rect x={x0 + 4} y={blocks.includes("hero") ? 70 : 52} width={(W - x0) * 0.66} height={8} rx={4} fill={WHITE} opacity={0.95} />
        <rect x={x0 + 4} y={blocks.includes("hero") ? 84 : 66} width={(W - x0) * 0.44} height={8} rx={4} fill={WHITE} opacity={0.95} />
        <rect x={x0 + 4} y={blocks.includes("hero") ? 104 : 82} width={44} height={13} rx={6.5} fill={WHITE} />
      </g>
      {content.map((k, i) => (
        <g key={k}>{block(k, { x: x0, y: top + i * (each + 5), w: W - x0 - 8, h: each }, m.accent)}</g>
      ))}
    </svg>
  );
}
