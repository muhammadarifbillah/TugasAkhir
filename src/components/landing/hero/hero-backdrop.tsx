const W = 1440;
const H = 520;

/** 64 stars on a fixed hash so server and client render the same sky. */
const STARS = Array.from({ length: 64 }, (_, i) => ({
  x: (i * 367 + 53) % W,
  y: (i * 211 + i * i * 13) % H,
  r: 0.6 + ((i * 7) % 5) * 0.25,
  o: 0.35 + ((i * 11) % 6) / 10,
}));

const LEAF = "M0 0 C18 -9 44 -9 64 0 C44 9 18 9 0 0 Z";

/** Leaf sprays hanging from the top corners: [x, y, angle, scale]. */
const SPRAY: readonly (readonly [number, number, number, number])[] = [
  [0, 10, 20, 1.4], [20, 40, 40, 1.2], [60, 0, 60, 1.3], [10, 80, 10, 1.1], [90, 30, 75, 1], [40, 110, 30, 0.9],
  [130, 0, 95, 1], [0, 150, 5, 0.9], [150, 40, 110, 0.8], [70, 70, 50, 1.1], [180, 10, 120, 0.7], [110, 90, 70, 0.8],
];

const spray = (mirror: boolean) => (
  <g transform={mirror ? `translate(${W} 0) scale(-1 1)` : undefined} fill="#000">
    <path d="M0 0 Q120 40 200 0 L200 0 L0 0 Z" />
    {SPRAY.map(([x, y, a, s], i) => (
      <path key={i} d={LEAF} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`} />
    ))}
    <path d="M0 0 Q60 60 150 70 M20 0 Q90 30 190 40" stroke="#000" strokeWidth={3} fill="none" />
  </g>
);

/** The night sky over the hero: a moon cut by the top edge, stars, a blue halo and leaf silhouettes. */
export function HeroBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMin slice"
      aria-hidden="true"
      focusable="false"
      data-hero-backdrop=""
      className={className}
    >
      <defs>
        <radialGradient id="hero-moon-fill" cx="0.42" cy="0.7" r="0.75">
          <stop offset="0" stopColor="#e3e9f0" />
          <stop offset="0.6" stopColor="#a9b5c3" />
          <stop offset="1" stopColor="#7d8a99" />
        </radialGradient>
        <radialGradient id="hero-moon-halo">
          <stop offset="0.6" stopColor="#3d7bd9" stopOpacity="0.35" />
          <stop offset="1" stopColor="#3d7bd9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hero-moon-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {STARS.map((s, i) => (
        <circle key={i} className="hero-star" cx={s.x} cy={s.y} r={s.r} fill="#fff" opacity={s.o} />
      ))}
      <g data-hero-moon="">
        <circle cx={W / 2} cy={-40} r={250} fill="url(#hero-moon-halo)" />
        <circle cx={W / 2} cy={-40} r={150} fill="url(#hero-moon-fill)" />
        <circle cx={W / 2 - 40} cy={20} r={22} fill="#7d8a99" opacity={0.35} />
        <circle cx={W / 2 + 50} cy={60} r={14} fill="#7d8a99" opacity={0.3} />
        <circle cx={W / 2 + 10} cy={-10} r={30} fill="#7d8a99" opacity={0.2} />
        <circle cx={W / 2} cy={-40} r={150} fill="url(#hero-moon-shade)" />
      </g>
      <g data-hero-leaves="">
        {spray(false)}
        {spray(true)}
        <g transform={`translate(${W / 2 + 120} 0)`} fill="#000">
          {SPRAY.slice(0, 6).map(([x, y, a, s], i) => (
            <path key={i} d={LEAF} transform={`translate(${x * 0.6} ${y * 0.5}) rotate(${a}) scale(${s * 0.7})`} />
          ))}
        </g>
      </g>
    </svg>
  );
}
