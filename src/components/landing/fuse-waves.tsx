import { PALETTE } from "@/lib/palette";

/** Layered ink waves from the Colors Ideas reference; decorative only, painted behind content. */
export function FuseWaves({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 1440 320" preserveAspectRatio="xMidYMax slice" className={className}>
      <path
        d="M0 150 C 180 90 360 90 540 140 C 720 190 900 200 1080 150 C 1260 100 1350 100 1440 120 L 1440 320 L 0 320 Z"
        fill={PALETTE.steel}
        fillOpacity={0.35}
      />
      <path
        d="M0 190 C 200 140 380 150 560 190 C 740 230 920 230 1100 190 C 1280 150 1360 160 1440 175 L 1440 320 L 0 320 Z"
        fill={PALETTE.mist}
        fillOpacity={0.25}
      />
      <path
        d="M0 230 C 220 190 420 200 620 235 C 820 270 1020 265 1220 230 C 1320 212 1390 210 1440 215 L 1440 320 L 0 320 Z"
        fill={PALETTE.deep}
        fillOpacity={0.9}
      />
      <path
        d="M0 275 C 240 245 460 250 700 275 C 940 300 1160 295 1440 265 L 1440 320 L 0 320 Z"
        fill={PALETTE.ink}
      />
      <path
        d="M0 170 C 200 120 380 125 560 168 C 740 210 920 215 1100 172 C 1280 130 1360 135 1440 150"
        fill="none"
        stroke={PALETTE.mist}
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
      <path
        d="M0 212 C 220 170 420 178 620 214 C 820 250 1020 248 1220 212 C 1320 194 1390 192 1440 196"
        fill="none"
        stroke={PALETTE.mist}
        strokeOpacity={0.3}
        strokeWidth={1.5}
      />
    </svg>
  );
}
