import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

interface RouteProps {
  params: Promise<{ id: string; snapshotId: string }>;
}

/**
 * Restores a project's generated code from an earlier snapshot and records the
 * restore itself as a new snapshot, so history is never rewritten.
 */
export async function POST(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(
    request,
    "/api/projects/[id]/snapshots/[snapshotId]/restore",
  );
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`restore:${session.user.id}`, 30)) {
    return NextResponse.json({ error: "Too many restores. Slow down." }, { status: 429 });
  }

  const { id, snapshotId } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const snapshot = await prisma.websiteSnapshot.findUnique({
    where: { id: snapshotId },
    include: { projectStage: { select: { projectId: true } } },
  });
  if (!snapshot || snapshot.projectStage.projectId !== id) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  const artifacts = snapshot.codeArtifacts as Record<string, string>;

  try {
    await prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRaw<{ id: string; userId: string }[]>`
        SELECT "id", "userId" FROM "projects" WHERE "id" = ${id} FOR UPDATE
      `;
      const owner = locked[0];
      if (!owner || owner.userId !== session.user.id) throw new Error("forbidden");

      const current = await tx.project.findUniqueOrThrow({ where: { id } });
      const globalSpec = (current.globalSpec as Record<string, unknown> | null) ?? {};

      await tx.websiteSnapshot.create({
        data: {
          projectStageId: snapshot.projectStageId,
          version: current.currentVersion,
          codeArtifacts: artifacts,
          diffSummary: `Restored snapshot ${snapshot.version} (${snapshot.id.slice(0, 6)})`,
        },
      });

      await tx.project.update({
        where: { id },
        data: {
          globalSpec: { ...globalSpec, codeArtifacts: artifacts } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "forbidden") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api/projects/[id]/snapshots/restore]", err);
    return NextResponse.json({ error: "Failed to restore snapshot." }, { status: 500 });
  }

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: id,
    restoredSnapshot: snapshotId,
  }, requestIp(request));

  return NextResponse.json({ ok: true });
}
