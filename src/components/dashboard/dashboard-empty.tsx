import "@/components/iso/iso.css";
import "@/components/landing/hero-tape/hero-tape.css";
import "./dashboard.css";
import Link from "next/link";
import { HeroTapeFigure } from "@/components/landing/hero-tape/figure/art";
import { POSTER_POSE } from "@/components/landing/hero-tape/model";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";

// Server component on purpose: model.ts pulls in stages.ts, which must not reach the client bundle.
export function DashboardEmpty({ dict, lang }: { dict: Dictionary; lang: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="dashboard-poster iso hero-tape-figure" aria-hidden="true">
          <HeroTapeFigure pose={POSTER_POSE} />
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
