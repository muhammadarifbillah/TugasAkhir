/** The five FUSE "Colors Ideas" colours; landing and dashboard use only these, their alpha and gradients between them. */
export const PALETTE = { ink: "#0A1931", deep: "#1A3D63", steel: "#4A7FA7", mist: "#B3CFE5", snow: "#F6FAFD" } as const;
export type PaletteName = keyof typeof PALETTE;

const HEX = new Set(Object.values(PALETTE).map((h) => h.slice(1).toLowerCase()));
const RGB = new Set(
  Object.values(PALETTE).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(" ")),
);

const TW_HUES = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";

/** CSS named colours (none/currentColor/transparent/inherit are keywords, not colours, so they pass). */
const NAMED = new Set(
  (
    "aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue " +
    "chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey " +
    "darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray " +
    "darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen " +
    "fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender " +
    "lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey " +
    "lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen " +
    "magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen " +
    "mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange " +
    "orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple " +
    "rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray " +
    "slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen"
  ).split(" "),
);

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
  [/(?<![\w-])(?:[a-z0-9-]+:)*(?:bg|text|border|ring|ring-offset|fill|stroke|from|via|to|outline|decoration|divide|shadow)-(?:white|black)\b/gi, () => true],
  [/(?:fill|stroke|stop-?color|color|background)\s*[=:]\s*\{?\s*["']?(?:white|black)\b/gi, () => true],
  // Tailwind's default shadow scale is black alpha; arbitrary shadow-[…] with palette rgb is the allowed form.
  [/(?<![\w-])(?:[a-z0-9-]+:)*shadow(?:-(?:2xs|xs|sm|md|lg|xl|2xl|inner))?(?![\w[/-])/gi, () => true],
  [/(?<![\w-])(?:[a-z0-9-]+:)*[a-z-]+-\[([a-z]+)\]/gi, (m) => NAMED.has(m[1].toLowerCase())],
  [/(?:fill|stroke|stop-?color|color|background)\s*[=:]\s*\{?\s*["']?([a-z]+)\b/gi, (m) => NAMED.has(m[1].toLowerCase())],
];

/** Every colour in `text` outside the palette (hex, rgb, other colour functions, opaque color-mix, Tailwind colours, white/black). */
export function findOffPalette(text: string): { index: number; match: string }[] {
  const out: { index: number; match: string }[] = [];
  for (const [re, off] of RULES) for (const m of text.matchAll(re)) if (off(m)) out.push({ index: m.index, match: m[0] });
  return out.sort((a, b) => a.index - b.index);
}
