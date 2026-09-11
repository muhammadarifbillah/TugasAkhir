import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const bodySchema = z.object({
  projectStageId: z.string().min(1),
  file: z.string().min(1).max(300),
  content: z.string().max(400_000),
});

/**
 * Applies a single fixed file (from a recommendation's suggestedCode or a
 * reviewed fixedArtifacts entry) into the project's generated source code.
 */
export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/artifacts/apply");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`apply:${session.user.id}`, 60)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const projectStage = await prisma.projectStage.findUnique({
    where: { id: parsed.data.projectStageId },
    include: { project: true },
  });
  if (!projectStage || projectStage.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const globalSpec = (projectStage.project.globalSpec as Record<string, unknown> | null) ?? {};
  const codeArtifacts = (globalSpec.codeArtifacts as Record<string, string> | null) ?? {};
  const merged = { ...codeArtifacts, [parsed.data.file]: parsed.data.content };

  await prisma.$transaction([
    prisma.websiteSnapshot.create({
      data: {
        projectStageId: projectStage.id,
        version: projectStage.project.currentVersion,
        codeArtifacts: merged,
        diffSummary: `Applied fix to ${parsed.data.file}`,
      },
    }),
    prisma.project.update({
      where: { id: projectStage.projectId },
      data: {
        globalSpec: { ...globalSpec, codeArtifacts: merged } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    }),
  ]);

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: projectStage.projectId,
    appliedFile: parsed.data.file,
  }, requestIp(request));

  return NextResponse.json({ ok: true, file: parsed.data.file });
}
