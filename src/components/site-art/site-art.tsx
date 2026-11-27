import { useId, type ReactNode } from "react";
import type { Dictionary } from "@/lib/i18n";
import { fmt } from "@/lib/format";
import { PALETTE } from "@/lib/palette";
import type { BlockKind, SiteCategory } from "@/lib/site-categories";

const W = 320;
const H = 200;
const PAD = 8;
const GAP = 6;
const INK = PALETTE.ink;
const FONT = "ui-sans-serif, system-ui, sans-serif";

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface Paint {
  accent: string;
  soft: string;
  hero: string;
  /** Card, table, chart, cart, sidebar and form-field fill: the palette light that is not the page field. */
  surface: string;
}
type Primitive = (b: Box, p: Paint) => ReactNode;

/** A text-line placeholder: an ink bar, never real copy. */
const bar = (x: number, y: number, w: number, opacity = 0.35, h = 4) => (
  <rect x={x} y={y} width={Math.max(w, 0)} height={h} rx={h / 2} fill={INK} opacity={opacity} />
);

const hero: Primitive = (b, p) => (
  <>
    <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={p.hero} />
    <rect x={b.x + 12} y={b.y + b.h * 0.25} width={b.w * 0.5} height={7} rx={3.5} fill={PALETTE.snow} opacity={0.95} />
    <rect x={b.x + 12} y={b.y + b.h * 0.25 + 12} width={b.w * 0.34} height={4} rx={2} fill={PALETTE.snow} opacity={0.7} />
    <rect x={b.x + 12} y={b.y + b.h - 18} width={44} height={11} rx={5.5} fill={PALETTE.snow} />
  </>
);

const cards: Primitive = (b, p) => {
  const n = 3;
  const cw = (b.w - GAP * (n - 1)) / n;
  const img = b.h * 0.55;
  return Array.from({ length: n }, (_, i) => {
    const x = b.x + i * (cw + GAP);
    return (
      <g key={i}>
        <rect x={x} y={b.y} width={cw} height={b.h} rx={5} fill={p.surface} />
        <rect x={x + 3} y={b.y + 3} width={cw - 6} height={img - 3} rx={3} fill={i === 1 ? p.accent : p.soft} />
        {bar(x + 5, b.y + img + 5, cw * 0.6, 0.5)}
        {b.h - img > 18 && bar(x + 5, b.y + img + 12, cw * 0.35, 0.2)}
      </g>
    );
  });
};

const list: Primitive = (b, p) => {
  const rows = Math.max(1, Math.floor((b.h + 4) / 14));
  return Array.from({ length: rows }, (_, i) => {
    const y = b.y + i * 14;
    return (
      <g key={i}>
        <circle cx={b.x + 5} cy={y + 5} r={4} fill={i === 0 ? p.accent : p.soft} />
        {bar(b.x + 14, y + 3, b.w * (i % 2 ? 0.55 : 0.75), i === 0 ? 0.6 : 0.3)}
      </g>
    );
  });
};

const form: Primitive = (b, p) => {
  const fields = Math.max(1, Math.min(3, Math.floor((b.h - 14) / 18)));
  return (
    <>
      {Array.from({ length: fields }, (_, i) => {
        const y = b.y + i * 18;
        return (
          <g key={i}>
            {bar(b.x, y, 30, 0.45, 3)}
            <rect x={b.x} y={y + 5} width={b.w} height={10} rx={3} fill={p.surface} stroke={INK} strokeOpacity={0.15} />
          </g>
        );
      })}
      <rect x={b.x} y={b.y + fields * 18} width={52} height={11} rx={5.5} fill={p.accent} />
    </>
  );
};

const table: Primitive = (b, p) => {
  const rows = Math.max(2, Math.floor(b.h / 11));
  const cols = 4;
  const cw = b.w / cols;
  return (
    <>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={4} fill={p.surface} />
      <rect x={b.x} y={b.y} width={b.w} height={10} rx={4} fill={p.soft} />
      {Array.from({ length: rows - 1 }, (_, r) =>
        Array.from({ length: cols }, (_, c) => (
          <g key={`${r}-${c}`}>
            {c === cols - 1 && r % 3 === 0 ? (
              <rect x={b.x + c * cw + 5} y={b.y + 13 + r * 11} width={cw * 0.5} height={6} rx={3} fill={p.accent} />
            ) : (
              bar(b.x + c * cw + 5, b.y + 14 + r * 11, cw * (c === 0 ? 0.7 : 0.45), 0.25)
            )}
          </g>
        )),
      )}
    </>
  );
};

const chart: Primitive = (b, p) => {
  const n = 7;
  const bw = (b.w - 12 - GAP * (n - 1)) / n;
  return (
    <>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill={p.surface} />
      {Array.from({ length: n }, (_, i) => {
        const h = (b.h - 12) * (0.3 + (0.7 * ((i * 37) % 10)) / 10);
        return (
          <rect
            key={i}
            x={b.x + 6 + i * (bw + GAP)}
            y={b.y + b.h - 6 - h}
            width={bw}
            height={h}
            rx={2}
            fill={p.accent}
            opacity={0.4 + (0.6 * i) / (n - 1)}
          />
        );
      })}
    </>
  );
};

const cart: Primitive = (b, p) => {
  const items = Math.max(1, Math.min(3, Math.floor((b.h - 30) / 20)));
  return (
    <>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={5} fill={p.surface} />
      {Array.from({ length: items }, (_, i) => {
        const y = b.y + 6 + i * 20;
        return (
          <g key={i}>
            <rect x={b.x + 6} y={y} width={14} height={14} rx={3} fill={i % 2 ? p.soft : p.accent} />
            {bar(b.x + 24, y + 2, b.w * 0.4, 0.5)}
            {bar(b.x + 24, y + 9, b.w * 0.22, 0.2)}
          </g>
        );
      })}
      <line x1={b.x + 6} x2={b.x + b.w - 6} y1={b.y + b.h - 26} y2={b.y + b.h - 26} stroke={INK} strokeOpacity={0.15} />
      {bar(b.x + 6, b.y + b.h - 21, b.w * 0.3, 0.6)}
      <rect x={b.x + 6} y={b.y + b.h - 14} width={b.w - 12} height={10} rx={5} fill={p.accent} />
    </>
  );
};

const player: Primitive = (b) => {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2 - 3;
  return (
    <>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={INK} />
      <circle cx={cx} cy={cy} r={12} fill={PALETTE.mist} />
      <path d={`M ${cx - 4} ${cy - 6} L ${cx + 6} ${cy} L ${cx - 4} ${cy + 6} Z`} fill={INK} />
      <rect x={b.x + 8} y={b.y + b.h - 9} width={b.w - 16} height={3} rx={1.5} fill={PALETTE.snow} opacity={0.2} />
      <rect x={b.x + 8} y={b.y + b.h - 9} width={(b.w - 16) * 0.4} height={3} rx={1.5} fill={PALETTE.mist} />
    </>
  );
};

const schedule: Primitive = (b, p) => {
  const cols = 5;
  const rows = 3;
  const sw = (b.w - 4 * (cols - 1)) / cols;
  const sh = (b.h - 4 * (rows - 1)) / rows;
  return Array.from({ length: rows * cols }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const busy = (i * 7) % 5 === 0;
    return (
      <rect key={i} x={b.x + c * (sw + 4)} y={b.y + r * (sh + 4)} width={sw} height={sh} rx={3} fill={busy ? p.accent : i % 2 ? p.soft : p.surface} />
    );
  });
};

// Light palette tones only: the code block is ink, so ink-coloured tokens would vanish.
const CODE_COLORS = [PALETTE.mist, PALETTE.steel, PALETTE.snow];
const code: Primitive = (b) => {
  const lines = Math.max(1, Math.floor((b.h - 8) / 9));
  return (
    <>
      <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={6} fill={INK} />
      {Array.from({ length: lines }, (_, i) => {
        const y = b.y + 7 + i * 9;
        const indent = (i % 3) * 8;
        return (
          <g key={i}>
            <rect x={b.x + 8 + indent} y={y} width={18} height={4} rx={2} fill={CODE_COLORS[i % 3]} />
            <rect x={b.x + 30 + indent} y={y} width={b.w * (0.15 + ((i * 13) % 5) / 20)} height={4} rx={2} fill={CODE_COLORS[(i + 2) % 3]} opacity={0.8} />
          </g>
        );
      })}
    </>
  );
};

const STACKED: Partial<Record<BlockKind, Primitive>> = { hero, cards, list, form, table, chart, cart, player, schedule, code };

const textProps = { fontFamily: FONT, fontWeight: 700, fill: INK } as const;

export function SiteArt({
  category,
  pageIndex,
  labels,
  className,
}: {
  category: SiteCategory;
  pageIndex: 0 | 1 | 2;
  labels: Dictionary["categories"];
  className?: string;
}) {
  const id = useId();
  const page = category.pages[pageIndex];
  const item = labels.items[category.id] as { name: string; pages: Record<string, string> };
  const name = item.name;
  const pageName = item.pages[page.id];
  const { tone } = category;
  const field = PALETTE[tone.field];
  const paint: Paint = {
    accent: PALETTE[tone.accent],
    soft: PALETTE[tone.soft],
    hero: `url(#${id}-hero)`,
    surface: tone.field === "mist" ? PALETTE.snow : PALETTE.mist,
  };

  const hasNav = page.blocks.includes("nav");
  const hasSidebar = page.blocks.includes("sidebar");
  const left = hasSidebar ? 64 : 0;
  const top = hasNav ? 24 : 0;
  const content = page.blocks.filter((b) => b !== "nav" && b !== "sidebar");
  const cartSide = content.includes("cart") && content.includes("form");
  const stack = cartSide ? content.filter((b) => b !== "cart") : content;

  const x = left + PAD;
  const titleY = top + PAD + 9;
  const y = titleY + 7;
  const w = W - x - PAD - (cartSide ? 96 + GAP : 0);
  const h = (H - PAD - y - GAP * (stack.length - 1)) / stack.length;
  // Sidebar brand has 48 units; long names are fitted rather than clipped.
  const sidebarFit = name.length * 4.2 > 48 ? { textLength: 48, lengthAdjust: "spacingAndGlyphs" as const } : {};

  return (
    <svg
      role="img"
      aria-label={fmt(labels.artLabel, { page: pageName, category: name })}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      className={className}
      data-category={category.id}
    >
      <defs>
        <linearGradient id={`${id}-hero`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={PALETTE[tone.hero[0]]} />
          <stop offset="1" stopColor={PALETTE[tone.hero[1]]} />
        </linearGradient>
      </defs>
      <rect width={W} height={H} rx={8} fill={field} />
      {hasSidebar && (
        <g>
          <rect x={0} y={0} width={64} height={H} rx={8} fill={paint.surface} />
          {!hasNav && (
            <text x={8} y={18} fontSize={7} {...sidebarFit} {...textProps}>
              {name}
            </text>
          )}
          {Array.from({ length: 5 }, (_, i) =>
            i === 1 ? (
              <rect key={i} x={6} y={top + 30 + i * 14} width={52} height={10} rx={3} fill={paint.accent} />
            ) : (
              <g key={i}>{bar(10, top + 33 + i * 14, 36 - (i % 2) * 10, 0.3)}</g>
            ),
          )}
        </g>
      )}
      {hasNav && (
        <g>
          <rect x={left} y={0} width={W - left} height={24} fill={field} />
          <line x1={left} x2={W} y1={24} y2={24} stroke={INK} strokeOpacity={0.08} />
          <text x={left + 10} y={15.5} fontSize={9} {...textProps}>
            {name}
          </text>
          {bar(W - 130, 10, 18, 0.3)}
          {bar(W - 104, 10, 18, 0.3)}
          {bar(W - 78, 10, 18, 0.3)}
          <rect x={W - 50} y={6} width={40} height={12} rx={6} fill={paint.accent} />
        </g>
      )}
      <text x={x} y={titleY} fontSize={9} {...textProps} opacity={0.8}>
        {pageName}
      </text>
      {stack.map((kind, i) => (
        <g key={kind}>{STACKED[kind]?.({ x, y: y + i * (h + GAP), w, h }, paint)}</g>
      ))}
      {cartSide && <g>{cart({ x: W - PAD - 96, y, w: 96, h: H - PAD - y }, paint)}</g>}
    </svg>
  );
}
