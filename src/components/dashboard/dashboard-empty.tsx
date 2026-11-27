import "./dashboard.css";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";
import { SITE_TEMPLATES } from "@/lib/site-templates";

const COLLAGE = (["company", "ecommerce", "lms"] as const).map((id) => SITE_TEMPLATES[id][0]);

export function DashboardEmpty({ dict, lang }: { dict: Dictionary; lang: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="dashboard-collage" aria-hidden="true">
          {COLLAGE.map((t, i) => (
            <span
              key={t.slug}
              className={`relative block aspect-[16/10] overflow-hidden rounded-xl shadow-[var(--fuse-shadow-soft,none)] ${i === 1 ? "-translate-y-3" : ""}`}
            >
              <Image src={t.pages[0].thumb} alt="" fill sizes="12rem" draggable={false} className="object-cover object-top" />
            </span>
          ))}
        </div>
        <h2 className="text-lg font-semibold">{dict.dashboard.emptyTitle}</h2>
        <p className="max-w-prose text-sm text-muted-foreground">{dict.dashboard.emptyLede}</p>
        <ol className="list-decimal space-y-1 pl-5 text-left text-sm text-muted-foreground">
          <li>{dict.dashboard.onboardingStep1}</li>
          <li>{dict.dashboard.onboardingStep2}</li>
          <li>{dict.dashboard.onboardingStep3}</li>
        </ol>
        <Button asChild>
          <Link href={`/${lang}/projects/new`}>{dict.dashboard.newProject}</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
