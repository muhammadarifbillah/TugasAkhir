import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { findArtifactProblems } from "@/lib/artifact-paths";

const bodySchema = z.object({
  projectStageId: z.string().min(1),
  files: z
    .record(z.string(), z.string())
    .refine((files) => Object.keys(files).length > 0, { message: "no files" }),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * Persists user-edited source files into the project's generated code
 * (`globalSpec.codeArtifacts`) and records a snapshot so every manual save is
 * traceable and revertable. Paths and sizes are validated with the same rules
 * used at the export/GitHub boundary.
 */
export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/artifacts");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`artifacts:${session.user.id}`, 120)) {
    return NextResponse.json({ error: "Too many saves. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const problems = findArtifactProblems(parsed.data.files);
  if (problems.length > 0) {
    return NextResponse.json({ error: "Invalid file(s)", problems }, { status: 400 });
  }

  const projectStage = await prisma.projectStage.findUnique({
    where: { id: parsed.data.projectStageId },
    include: { project: true },
  });
  if (
    !projectStage ||
    projectStage.projectId !== id ||
    projectStage.project.userId !== session.user.id
  ) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const edited = Object.keys(parsed.data.files);

  try {
    await prisma.$transaction(async (tx) => {
      // Lock the project row so a concurrent persist cannot interleave.
      const locked = await tx.$queryRaw<{ id: string; userId: string }[]>`
        SELECT "id", "userId" FROM "projects" WHERE "id" = ${id} FOR UPDATE
      `;
      const owner = locked[0];
      if (!owner || owner.userId !== session.user.id) {
        throw new Error("forbidden");
      }

      const project = await tx.project.findUniqueOrThrow({ where: { id } });
      const globalSpec = (project.globalSpec as Record<string, unknown> | null) ?? {};
      const existing = (globalSpec.codeArtifacts as Record<string, string> | null) ?? {};
      const merged = { ...existing, ...parsed.data.files };

      const summaryFiles = edited.slice(0, 3).join(", ");
      await tx.websiteSnapshot.create({
        data: {
          projectStageId: projectStage.id,
          version: project.currentVersion,
          codeArtifacts: merged,
          diffSummary: `Manual edit: ${summaryFiles}${edited.length > 3 ? ` +${edited.length - 3}` : ""}`,
        },
      });

      await tx.project.update({
        where: { id },
        data: {
          globalSpec: { ...globalSpec, codeArtifacts: merged } as unknown as Prisma.InputJsonValue,
          updatedAt: new Date(),
        },
      });
    });
  } catch (err) {
    if (err instanceof Error && err.message === "forbidden") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.error("[api/projects/[id]/artifacts]", err);
    return NextResponse.json({ error: "Failed to save files." }, { status: 500 });
  }

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: id,
    editedFiles: edited,
  }, requestIp(request));

  return NextResponse.json({ ok: true, files: edited });
}
