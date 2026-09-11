import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { validateCsrfRequest } from "@/lib/validate-csrf";

const bodySchema = z.object({
  status: z.enum(["merged", "cancelled"]),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/revisions/[id]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

  const { id } = await params;
  const revision = await prisma.projectRevision.findUnique({
    where: { id },
    include: { project: { select: { userId: true, id: true, status: true } } },
  });
  if (!revision || revision.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Only an in-progress revision may be merged or cancelled.
  if (revision.status !== "in_progress") {
    return NextResponse.json(
      { error: `Revision already ${revision.status}` },
      { status: 409 },
    );
  }

  const nextStatus = parsed.data.status;

  // Resolve the stage this revision re-opened so it can be restored to a
  // completed state once the revision is resolved (merged or cancelled).
  const [targetStage, lastStage] = await Promise.all([
    revision.targetStageKey
      ? prisma.stage.findUnique({ where: { code: revision.targetStageKey } })
      : Promise.resolve(null),
    prisma.stage.findFirst({ orderBy: { orderIndex: "desc" } }),
  ]);

  await prisma.$transaction([
    prisma.projectRevision.update({
      where: { id },
      data: { status: nextStatus, completedAt: new Date() },
    }),
    prisma.project.update({
      where: { id: revision.project.id },
      data:
        nextStatus === "merged"
          ? {
              status: "completed",
              currentVersion: revision.version,
              currentStageIndex: lastStage?.orderIndex ?? 4,
              updatedAt: new Date(),
            }
          : {
              status: revision.project.status === "in_revision" ? "completed" : revision.project.status,
              currentStageIndex: lastStage?.orderIndex ?? 4,
              updatedAt: new Date(),
            },
    }),
    ...(targetStage
      ? [
          prisma.projectStage.updateMany({
            where: { projectId: revision.project.id, stageId: targetStage.id },
            data: { status: "completed", completionPercentage: 100 },
          }),
        ]
      : []),
  ]);

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: revision.project.id,
    revisionId: id,
    revisionStatus: nextStatus,
  }, requestIp(request));

    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err) {
    console.error("[api/revisions/:id]", err);
    return NextResponse.json(
      { error: "Revision update failed. Please try again." },
      { status: 500 },
    );
  }
}
