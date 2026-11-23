import { redirect } from "next/navigation";
import { Plus, Rocket } from "lucide-react";
import { auth } from "@/auth";
import { ProjectList } from "@/components/project-list";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getActiveStageCode, getProjectStack, getScoreInfo, getStageProgress } from "@/lib/project-stats";

interface DashboardProps {
  params: Promise<{ lang: string }>;
}

export default async function DashboardPage({ params }: DashboardProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    include: {
      projectStages: { include: { stage: { select: { code: true, orderIndex: true } } } },
      revisions: { select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const cards = projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    status: p.status,
    version: p.currentVersion,
    stack: getProjectStack(p),
    ...(() => {
      const info = getScoreInfo(p.globalSpec);
      return { score: info.score, scoreSource: info.source, scoreStale: info.stale };
    })(),
    activeStage:
      getActiveStageCode(
        p.projectStages.map((ps) => ({ status: ps.status, code: ps.stage.code, orderIndex: ps.stage.orderIndex })),
      ) ?? "analysis",
    stageProgress: getStageProgress(p),
    revisionCount: p.revisions.length,
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{dict.dashboard.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{dict.dashboard.subtitle}</p>
        </div>
        <Button asChild>
          <a href={`/${lang}/projects/new`}>
            <Plus /> {dict.dashboard.newProject}
          </a>
        </Button>
      </div>

      {projects.length === 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="size-4 text-primary" /> {dict.dashboard.onboardingTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm sm:grid-cols-3">
              {[dict.dashboard.onboardingStep1, dict.dashboard.onboardingStep2, dict.dashboard.onboardingStep3].map(
                (step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ),
              )}
            </ol>
          </CardContent>
        </Card>
      )}

      <ProjectList projects={cards} dict={dict} lang={lang} />
    </div>
  );
}