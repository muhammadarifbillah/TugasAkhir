import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { completionGaps } from "@/lib/stages";

const bodySchema = z.object({
  projectStageId: z.string().min(1),
});

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/stages/complete");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`stage:${session.user.id}`, 30)) {
    return NextResponse.json({ error: "Too many stage updates. Slow down." }, { status: 429 });
  }

  let parsed: z.infer<typeof bodySchema>;
  try {
    const check = bodySchema.safeParse(await request.json());
    if (!check.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    parsed = check.data;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const projectStage = await prisma.projectStage.findUnique({
      where: { id: parsed.projectStageId },
      include: { project: true, stage: true },
    });
    if (!projectStage || projectStage.project.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (projectStage.status === "completed") {
      return NextResponse.json(
        { error: "Stage is already completed." },
        { status: 409 },
      );
    }

    if (projectStage.status === "not_started") {
      return NextResponse.json(
        { error: "Stage has not been started. Run the stage first." },
        { status: 400 },
      );
    }

    const recCount = await prisma.aiRecommendation.count({
      where: { projectStageId: projectStage.id },
    });
    const deliverableCount = await prisma.deliverable.count({
      where: { projectId: projectStage.projectId },
    });

    const gaps = completionGaps(
      projectStage.stage.code,
      projectStage.project.globalSpec as Record<string, unknown> | null,
      { recommendationCount: recCount, deliverableCount },
    );
    if (gaps.length > 0) {
      return NextResponse.json(
        { error: "Stage requirements are not met.", gaps },
        { status: 422 },
      );
    }

    // All previous stages must be completed before this one can be completed.
    const siblings = await prisma.projectStage.findMany({
      where: {
        projectId: projectStage.projectId,
        stage: { orderIndex: { lt: projectStage.stage.orderIndex } },
      },
      select: { status: true, stage: { select: { code: true } } },
    });
    if (siblings.some((s) => s.status !== "completed")) {
      return NextResponse.json(
        { error: "Complete the previous stages first." },
        { status: 422 },
      );
    }

    const allStages = await prisma.projectStage.findMany({
      where: { projectId: projectStage.projectId },
      select: { id: true },
    });
    const completedAfter = allStages.length === siblings.length + 1;

    await prisma.$transaction([
      prisma.projectStage.update({
        where: { id: projectStage.id },
        data: { status: "completed", completedAt: new Date(), completionPercentage: 100 },
      }),
      prisma.project.update({
        where: { id: projectStage.projectId },
        data: {
          currentStageIndex: projectStage.stage.orderIndex,
          status: completedAfter ? "completed" : projectStage.project.status,
          updatedAt: new Date(),
        },
      }),
    ]);

    await writeAudit(session.user.id, "COMPLETE_STAGE", {
      projectId: projectStage.projectId,
      stage: projectStage.stage.code,
      projectCompleted: completedAfter,
    }, requestIp(request));

    return NextResponse.json({ ok: true, projectCompleted: completedAfter });
  } catch (err) {
    console.error("[api/stages/complete]", err);
    return NextResponse.json({ error: "Failed to complete the stage." }, { status: 500 });
  }
}
