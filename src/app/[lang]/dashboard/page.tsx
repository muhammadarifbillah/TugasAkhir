import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { auth } from "@/auth";
import { ProjectList } from "@/components/project-list";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { getProjectScore, getProjectStack, getStageProgress } from "@/lib/project-stats";

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
      projectStages: true,
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
    score: getProjectScore(p),
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

      <ProjectList projects={cards} dict={dict} lang={lang} />
    </div>
  );
}