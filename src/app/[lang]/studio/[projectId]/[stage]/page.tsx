import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";
import { STAGE_DEFINITIONS, completionGaps } from "@/lib/stages";

interface StudioPageProps {
  params: Promise<{ lang: string; projectId: string; stage: string }>;
}

export default async function StudioPage(props: StudioPageProps) {
  const { lang, projectId, stage } = await props.params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { revisions: { orderBy: { createdAt: "desc" } } },
  });
  if (!project || project.userId !== session.user.id) notFound();

  const stages = await prisma.projectStage.findMany({
    where: { projectId },
    include: { stage: true, recommendations: { include: { nistControl: true } } },
    orderBy: { stage: { orderIndex: "asc" } },
  });

  const stageDef = STAGE_DEFINITIONS.find((s) => s.code === stage);
  if (!stageDef) notFound();

  const firstIncomplete = stages.find((ps) => ps.status !== "completed");
  const requested = stages.find((ps) => ps.stage.code === stage);
  if (!requested) notFound();

  // Gate: a stage is reachable only when all of its predecessors are completed.
  const predecessorsCompleted = stages
    .filter((ps) => ps.stage.orderIndex < stageDef.orderIndex)
    .every((ps) => ps.status === "completed");
  if (!predecessorsCompleted && firstIncomplete) {
    redirect(`/${lang}/studio/${projectId}/${firstIncomplete.stage.code}`);
  }

  const current = requested;
  const chat = await prisma.chat.findFirst({
    where: { projectStageId: current.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });

  const globalSpec = (project.globalSpec as Record<string, unknown> | null) ?? {};
  const codeArtifacts = (globalSpec.codeArtifacts as Record<string, string> | null) ?? null;
  const design = (globalSpec.design as Record<string, unknown> | null) ?? null;
  const analysis = (globalSpec.analysis as Record<string, unknown> | null) ?? null;
  const testing = (globalSpec.testing as Record<string, unknown> | null) ?? null;
  // The background recommendation (Workstream A) lands in languagePlan;
  // prefer it so the studio shows the stack without waiting for a chat turn.
  const languagePlan = (project.languagePlan as Record<string, unknown> | null) ?? null;
  const analysisStackInfo =
    (languagePlan?.recommendedStack as Record<string, unknown> | null) ?? null;
  const analysisRequirements = Array.isArray(languagePlan?.securityRequirements)
    ? (languagePlan.securityRequirements as string[])
    : (analysis?.securityRequirements as string[] | undefined) ?? [];

  const snapshots = await prisma.websiteSnapshot.findMany({
    where: { projectStage: { projectId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, version: true, diffSummary: true, createdAt: true, codeArtifacts: true },
  });

  const securityScore =
    typeof testing?.securityScore === "number"
      ? Math.max(0, Math.min(100, Math.round(testing.securityScore)))
      : null;

  const deliverableCount = await prisma.deliverable.count({ where: { projectId } });

  const stageGaps = completionGaps(stageDef.code, globalSpec, {
    recommendationCount: current.recommendations.length,
    deliverableCount,
  });

  return (
    <StudioWorkspace
      lang={lang}
      dict={dict}
      project={{
        id: project.id,
        name: project.name,
        version: project.currentVersion,
        outputLanguage: project.outputLanguage,
        status: project.status,
        badgePublic: project.badgePublic,
      }}
      stage={{
        code: stageDef.code,
        name: stageDef.name,
        description: stageDef.description,
        orderIndex: stageDef.orderIndex,
        nistGroups: stageDef.nistGroups,
        nistTasks: stageDef.nistTasks,
        isoControls: stageDef.isoControls,
        secureParams: stageDef.secureParams,
        steps: stageDef.steps.map((s) => ({
          id: s.id,
          nistTasks: s.nistTasks,
          isoControls: s.isoControls,
        })),
        projectStageId: current.id,
      }}
      completionGaps={stageGaps}
      nextStageName={(() => {
        const next = stages.find((ps) => ps.stage.orderIndex === stageDef.orderIndex + 1);
        return next?.stage.name ?? null;
      })()}
      stages={stages.map((ps) => ({
        code: ps.stage.code,
        name: ps.stage.name,
        orderIndex: ps.stage.orderIndex,
        status: ps.status,
        id: ps.stageId,
      }))}
      messages={
        chat?.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt.toISOString(),
        })) ?? []
      }
      recommendations={current.recommendations.map((r) => ({
        id: r.id,
        category: r.category,
        severity: r.severity,
        title: r.title,
        content: r.content,
        suggestedCode: r.suggestedCode,
        filePath: r.filePath,
        isApplied: r.isApplied,
        nistControl: r.nistControl
          ? {
              taskCode: r.nistControl.taskCode,
              iso27001Mapping: r.nistControl.iso27001Mapping as string[],
            }
          : null,
      }))}
      codeArtifacts={codeArtifacts}
      securityScore={securityScore}
      latestRevision={
        project.revisions.find((r) => r.status === "in_progress") ?? project.revisions[0] ?? null
      }
      designDiagrams={(design?.mermaid as string[] | undefined) ?? []}
      designArchitecture={(design?.architecture as string[] | undefined) ?? []}
      designThreatModel={(design?.threatModel as Record<string, unknown>[] | undefined) ?? []}
      designUiDesign={(design?.uiDesign as string[] | undefined) ?? []}
      analysisDataClassification={
        (analysis?.dataClassification as string[] | undefined) ?? []
      }
      analysisStack={
        analysis || analysisStackInfo
          ? {
              recommendedStack: analysisStackInfo ?? (analysis?.recommendedStack as Record<string, unknown> | null) ?? null,
              securityRequirements: analysisRequirements,
              summary: (analysis?.summary as string | undefined) ?? "",
            }
          : null
      }
      designDatabaseSchema={(design?.databaseSchema as string[] | undefined) ?? []}
      designErdDiagram={(design?.erdDiagram as string | undefined) ?? ""}
      designAuthFlowDiagram={(design?.authFlowDiagram as string | undefined) ?? ""}
      testingFindings={(testing?.findings as Record<string, unknown>[] | undefined) ?? []}
      testingFixedArtifacts={(testing?.fixedArtifacts as Record<string, string> | null) ?? null}
      handoverManualBook={(globalSpec.handover as Record<string, unknown> | null)?.manualBook as string ?? ""}
      handoverComplianceReport={(globalSpec.handover as Record<string, unknown> | null)?.complianceReport as string ?? ""}
      handoverReleaseChecklist={Array.isArray((globalSpec.handover as Record<string, unknown> | null)?.releaseChecklist) ? ((globalSpec.handover as Record<string, unknown>).releaseChecklist as string[]) : []}
      snapshots={snapshots.map((s) => ({
        id: s.id,
        version: s.version,
        diffSummary: s.diffSummary,
        createdAt: s.createdAt.toISOString(),
        fileCount: Object.keys((s.codeArtifacts as Record<string, string>) ?? {}).length,
      }))}
    />
  );
}
