import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, History } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";

interface HistoryPageProps {
  params: Promise<{ lang: string }>;
}

/** Read-only view of every project and its stage/session history. */
export default async function HistoryPage({ params }: HistoryPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      currentVersion: true,
      createdAt: true,
      projectStages: {
        orderBy: { stage: { orderIndex: "asc" } },
        select: {
          id: true,
          status: true,
          completedAt: true,
          stage: { select: { code: true, name: true } },
        },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          version: true,
          revisionSummary: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  const date = (value: Date) =>
    new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(value);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${lang}/settings`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {dict.history.back}
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <History className="size-6 text-primary" /> {dict.history.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.history.subtitle}</p>
      </div>

      {projects.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {dict.history.empty}
        </p>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const status =
              project.status === "completed"
                ? { variant: "success" as const, text: dict.dashboard.statusCompleted }
                : project.status === "in_revision"
                  ? { variant: "warning" as const, text: dict.dashboard.statusInRevision }
                  : project.status === "draft"
                    ? { variant: "default" as const, text: dict.dashboard.statusDraft }
                    : { variant: "muted" as const, text: dict.dashboard.statusInProgress };
            const done = project.projectStages.filter((s) => s.status === "completed").length;
            return (
              <Card key={project.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    <span className="min-w-0 truncate">{project.name}</span>
                    <Badge variant={status.variant}>{status.text}</Badge>
                    <span className="text-xs font-normal text-muted-foreground">
                      {project.currentVersion}
                    </span>
                    <span className="ms-auto text-xs font-normal text-muted-foreground">
                      {dict.history.createdAt}: {date(project.createdAt)}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {dict.history.stages} ({done}/{project.projectStages.length})
                    </p>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {project.projectStages.map((stage) => (
                        <li key={stage.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`size-1.5 shrink-0 rounded-full ${
                              stage.status === "completed" ? "bg-success" : "bg-muted-foreground/40"
                            }`}
                            aria-hidden="true"
                          />
                          <Link
                            href={`/${lang}/studio/${project.id}/${stage.stage.code}`}
                            className="truncate hover:underline"
                          >
                            {stage.stage.name}
                          </Link>
                          {stage.completedAt && (
                            <span className="ms-auto shrink-0 text-muted-foreground">
                              {date(stage.completedAt)}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {dict.history.revisions}
                    </p>
                    {project.revisions.length === 0 ? (
                      <p className="text-xs text-muted-foreground">{dict.history.noRevisions}</p>
                    ) : (
                      <ul className="space-y-1">
                        {project.revisions.map((revision) => (
                          <li key={revision.id} className="flex items-center gap-2 text-xs">
                            <span className="font-mono">{revision.version}</span>
                            <span className="min-w-0 truncate">{revision.revisionSummary}</span>
                            <span className="ms-auto shrink-0 text-muted-foreground">
                              {date(revision.createdAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Link
                    href={`/${lang}/studio/${project.id}/${project.projectStages[0]?.stage.code ?? "analysis"}`}
                    className="inline-flex text-xs text-primary hover:underline"
                  >
                    {dict.history.open}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
