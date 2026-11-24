/**
 * A numbered section of the landing "report": the § index sits in a margin
 * rail on desktop (a real document index, not an eyebrow label), the content
 * takes the remaining ten columns, and sections are separated by a hairline.
 */
export function LedgerSection({
  n,
  id,
  title,
  lede,
  children,
}: {
  n: number;
  id: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 border-t border-[var(--ledger-rule)] py-20 md:py-28">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
        <div className="lg:col-span-2">
          <p className="font-narrow text-sm tabular-nums text-muted-foreground lg:sticky lg:top-24" aria-hidden="true">
            §{n}
          </p>
        </div>
        <div className="mt-2 min-w-0 lg:col-span-10 lg:mt-0">
          <h2 id={`${id}-title`} className="font-wide text-balance text-3xl md:text-4xl">
            {title}
          </h2>
          {lede && <p className="mt-4 max-w-[62ch] leading-relaxed text-muted-foreground">{lede}</p>}
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </section>
  );
}
