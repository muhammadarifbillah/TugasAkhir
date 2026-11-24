import Image from "next/image";

export interface PreviewShot {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

function Frame({ shot, label }: { shot: PreviewShot; label: string }) {
  return (
    <figure>
      <div className="card-elevated overflow-hidden rounded-xl border bg-card">
        <Image src={shot.src} width={shot.width} height={shot.height} alt={shot.alt} sizes="(min-width: 1024px) 900px, 100vw" className="block h-auto w-full" />
      </div>
      <figcaption className="mt-2 text-sm">
        <span className="font-narrow me-2 text-muted-foreground">{label}</span>
        {shot.caption}
      </figcaption>
    </figure>
  );
}

/** §7: three real studio screenshots as numbered figures (no overlap, no parallax). */
export function ProductPreview({ shots, figureLabels }: { shots: [PreviewShot, PreviewShot, PreviewShot]; figureLabels: [string, string, string] }) {
  return (
    <div className="grid gap-8">
      <Frame shot={shots[0]} label={figureLabels[0]} />
      <div className="grid max-w-3xl gap-8 sm:grid-cols-2">
        <Frame shot={shots[1]} label={figureLabels[1]} />
        <Frame shot={shots[2]} label={figureLabels[2]} />
      </div>
    </div>
  );
}
