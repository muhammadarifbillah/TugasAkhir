/** The five FUSE "Colors Ideas" colours; landing and dashboard use only these, their alpha and gradients between them. */
export const PALETTE = { ink: "#0A1931", deep: "#1A3D63", steel: "#4A7FA7", mist: "#B3CFE5", snow: "#F6FAFD" } as const;
export type PaletteName = keyof typeof PALETTE;

const HEX = new Set(Object.values(PALETTE).map((h) => h.slice(1).toLowerCase()));
const RGB = new Set(
  Object.values(PALETTE).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ")),
);

const TW_HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/** Each rule returns true when its match is off-palette. */
const RULES: [RegExp, (m: RegExpMatchArray) => boolean][] = [
  [
    /(?<![\w&])#([0-9a-f]{3,8})\b/gi,
    (m) => {
      const hex = m[1].toLowerCase();
      if (hex.length === 5 || hex.length === 7) return false;
      if (hex.length <= 4) return true;
      return !HEX.has(hex.slice(0, 6));
    },
  ],
  [
    /rgba?\(([^)]*)\)/gi,
    (m) => {
      const parts = m[1].trim().split(/[\s,_/]+/).slice(0, 3);
      return !(parts.length === 3 && parts.every((p) => /^\d+$/.test(p)) && RGB.has(parts.map(Number).join(" ")));
    },
  ],
  [/\b(hsla?|oklch|oklab|lab|lch|hwb)\(/gi, () => true],
  [/color-mix\((?:[^()]|\([^()]*\))*\)/gi, (m) => !/transparent/i.test(m[0])],
  [
    new RegExp(
      `(?<![\\w-])(?:[a-z0-9-]+:)*(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow|divide|placeholder|caret|accent)-(?:${TW_HUES})-\\d{2,3}\\b`,
      "gi",
    ),
    () => true,
  ],
  [/(?<![\w-])(?:[a-z0-9-]+:)*(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|divide)-(?:white|black)\b/gi, () => true],
  [/(?:fill|stroke|stop-?color|color|background)\s*[=:]\s*\{?\s*["']?(?:white|black)\b/gi, () => true],
];

/** Every colour in `text` outside the palette (hex, rgb, other colour functions, opaque color-mix, Tailwind colours, white/black). */
export function findOffPalette(text: string): { index: number; match: string }[] {
  const out: { index: number; match: string }[] = [];
  for (const [re, off] of RULES) for (const m of text.matchAll(re)) if (off(m)) out.push({ index: m.index, match: m[0] });
  return out.sort((a, b) => a.index - b.index);
}
