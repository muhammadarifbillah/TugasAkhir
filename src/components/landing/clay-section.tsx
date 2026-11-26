import { cn } from "@/lib/utils";

/** Landing section with a centred pill label (names the content), H2 and optional lede. */
export function ClaySection({
  id,
  pill,
  title,
  lede,
  children,
  band = false,
}: {
  id: string;
  pill: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
  band?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn("scroll-mt-20 py-24 md:py-32", band && "bg-[var(--clay-bg-2)]/60")}
    >
      <div className="mx-auto w-full max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <span className="clay-pill">{pill}</span>
          <h2 id={`${id}-title`} data-entrance="" className="font-wide mt-5 text-balance text-3xl md:text-[2.75rem]">
            {title}
          </h2>
          {lede && <p className="mx-auto mt-5 max-w-[60ch] leading-relaxed text-muted-foreground">{lede}</p>}
        </div>
        <div className="mt-14">{children}</div>
      </div>
    </section>
  );
}
