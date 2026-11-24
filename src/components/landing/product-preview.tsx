import Image from "next/image";

export interface PreviewShot {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

/** Inside the studio: three real screenshots as project-style clay cards (no testimonials). */
export function ProductPreview({ shots, figureLabels }: { shots: PreviewShot[]; figureLabels: string[] }) {
  return (
    <ul className="grid gap-6 md:grid-cols-3">
      {shots.map((s, i) => (
        <li key={s.src} className="clay-card clay-hover flex flex-col overflow-hidden p-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem] bg-[var(--clay-bg)]">
            <Image src={s.src} fill alt={s.alt} sizes="(min-width: 768px) 33vw, 100vw" className="object-cover object-top" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-4">
            <span className="font-medium">{s.caption}</span>
            <span className="clay-chip font-narrow shrink-0 px-2.5 py-0.5 text-xs text-muted-foreground">{figureLabels[i]}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
