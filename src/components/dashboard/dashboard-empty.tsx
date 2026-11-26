import "./dashboard.css";
import Link from "next/link";
import { SiteArt } from "@/components/site-art/site-art";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n";
import { SITE_CATEGORIES } from "@/lib/site-categories";

const COLLAGE = (["company", "ecommerce", "lms"] as const).map((id) => SITE_CATEGORIES.find((c) => c.id === id)!);

export function DashboardEmpty({ dict, lang }: { dict: Dictionary; lang: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
        <div className="dashboard-collage" aria-hidden="true">
          {COLLAGE.map((c) => (
            <SiteArt key={c.id} category={c} pageIndex={0} labels={dict.categories} />
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
