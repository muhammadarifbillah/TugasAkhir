import { Reveal } from "@/components/landing/reveal";
import { cn } from "@/lib/utils";

/** Eyebrow + H2 + lede used by every landing section. */
export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  align = "start",
}: {
  id?: string;
  eyebrow: string;
  title: string;
  lede?: string;
  align?: "start" | "center";
}) {
  return (
    <Reveal className={cn("max-w-3xl", align === "center" && "mx-auto text-center")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h2 id={id} className="display-type mt-3 text-balance text-2xl md:text-4xl">
        {title}
      </h2>
      {lede && (
        <p className={cn("mt-4 max-w-[62ch] text-sm leading-relaxed text-muted-foreground md:text-base", align === "center" && "mx-auto")}>
          {lede}
        </p>
      )}
    </Reveal>
  );
}
