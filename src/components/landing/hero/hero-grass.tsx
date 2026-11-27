const W = 1440;
const H = 80;

/** Blades on a fixed hash so SSR and client match; taller in the middle like the reference. */
const BLADES = Array.from({ length: 160 }, (_, i) => {
  const x = i * 9 + ((i * 37) % 7);
  const centre = 1 - Math.min(1, Math.abs(x - W / 2) / (W / 2));
  const h = 18 + ((i * 53) % 29) + centre * 30;
  const lean = ((i * 29) % 13) - 6;
  return `M${x - 3} ${H} Q${x + lean * 0.3} ${H - h * 0.6} ${x + lean} ${H - h} Q${x + 1} ${H - h * 0.5} ${x + 3} ${H} Z`;
}).join(" ");

/** Black grass silhouette across the front of the hero. */
export function HeroGrass({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" focusable="false" data-hero-grass="" className={className}>
      <path d={BLADES} fill="#000" />
      <rect y={H - 6} width={W} height={6} fill="#000" />
    </svg>
  );
}
