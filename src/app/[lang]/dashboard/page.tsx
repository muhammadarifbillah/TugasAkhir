import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { PageTransition } from "@/components/page-transition";
import { ProjectList } from "@/components/project-list";
import { Button } from "@/components/ui/button";
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
      return { score: info.score, scoreSource: info.source, scoreStale: info.stale, scannedAt: info.scannedAt };
    })(),
    activeStage:
      getActiveStageCode(
        p.projectStages.map((ps) => ({ status: ps.status, code: ps.stage.code, orderIndex: ps.stage.orderIndex })),
      ) ?? "analysis",
    stageProgress: getStageProgress(p),
    revisionCount: p.revisions.length,
    updatedAt: p.updatedAt.toISOString(),
    template: p.template,
  }));

  return (
    <PageTransition>
      <div className="dashboard-surface mx-auto max-w-7xl px-4 py-8">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{dict.dashboard.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{dict.dashboard.subtitle}</p>
          </div>
          <Button asChild>
            <a href={`/${lang}/projects/new`}>
              <Plus /> {dict.dashboard.newProject}
            </a>
          </Button>
        </div>

        {cards.length > 0 ? (
          <>
            <DashboardStats cards={cards} dict={dict} />
            <ProjectList projects={cards} dict={dict} lang={lang} />
          </>
        ) : (
          <DashboardEmpty dict={dict} lang={lang} />
        )}
      </div>
    </PageTransition>
  );
}
