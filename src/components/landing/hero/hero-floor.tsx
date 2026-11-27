const W = 1440;
const H = 360;

/** Floating orbs: [cx, cy, r, kind]. */
const ORBS = [
  [420, 150, 16, "warm"],
  [720, 96, 20, "blue"],
  [560, 250, 22, "glass"],
  [1010, 190, 18, "glass"],
] as const;

const GLINTS = [
  [180, 120, 220], [930, 80, 160], [300, 230, 260], [1120, 260, 200], [640, 300, 180], [1260, 150, 120],
] as const;

/**
 * The water floor under the wall: the #hero-ripple filter the panel reflections use (rendered once),
 * a blue burst under the centre panels, floating orbs and thin glints.
 */
export function HeroFloor({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      data-hero-floor=""
      className={className}
    >
      <defs>
        <filter id="hero-ripple" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.006 0.09" numOctaves={2} seed={7} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={16} xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <radialGradient id="hero-burst">
          <stop offset="0" stopColor="#bfe6ff" stopOpacity="0.95" />
          <stop offset="0.25" stopColor="#2f8cff" stopOpacity="0.6" />
          <stop offset="1" stopColor="#2f8cff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-orb-warm" cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#fff6dc" />
          <stop offset="0.5" stopColor="#ffd27a" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-orb-blue" cx="0.4" cy="0.35">
          <stop offset="0" stopColor="#e6f7ff" />
          <stop offset="0.5" stopColor="#7fd0ff" />
          <stop offset="1" stopColor="#7fd0ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hero-orb-glass" cx="0.35" cy="0.3">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.4" stopColor="#9ab4c8" stopOpacity="0.12" />
          <stop offset="1" stopColor="#9ab4c8" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <ellipse cx={W / 2} cy={70} rx={260} ry={70} fill="url(#hero-burst)" />
      {[-60, -30, 0, 30, 60].map((a) => (
        <rect key={a} x={W / 2 - 1} y={-30} width={2} height={120} fill="#7fd0ff" opacity={0.35} transform={`rotate(${a} ${W / 2} 70)`} />
      ))}
      {GLINTS.map(([x, y, w], i) => (
        <rect key={i} className="hero-glint" x={x} y={y} width={w} height={1.2} rx={0.6} fill="#cfe7ff" opacity={0.18} />
      ))}
      {ORBS.map(([cx, cy, r, kind], i) => (
        <g key={i} className="hero-orb">
          <circle cx={cx} cy={cy} r={kind === "glass" ? r : r * 2.2} fill={`url(#hero-orb-${kind})`} />
          {kind === "glass" && <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeOpacity={0.35} strokeWidth={1} />}
        </g>
      ))}
    </svg>
  );
}
