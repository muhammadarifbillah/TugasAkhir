import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { designScreensSchema } from "@/lib/design";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/** Persists the screens the user kept in the Design Studio. */
export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/design");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`design:${session.user.id}`, 120)) {
    return NextResponse.json({ error: "Too many saves. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const body = (await request.json()) as { designScreens?: unknown };
  const parsed = designScreensSchema.safeParse(body.designScreens);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid design payload" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; userId: string }[]>`
      SELECT "id", "userId" FROM "projects" WHERE "id" = ${id} FOR UPDATE
    `;
    const owner = locked[0];
    if (!owner || owner.userId !== session.user.id) throw new Error("forbidden");

    const current = await tx.project.findUniqueOrThrow({ where: { id } });
    const globalSpec = (current.globalSpec as Record<string, unknown> | null) ?? {};
    const design = (globalSpec.design as Record<string, unknown> | null) ?? {};

    await tx.project.update({
      where: { id },
      data: {
        globalSpec: {
          ...globalSpec,
          design: { ...design, designScreens: parsed.data },
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
  });

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: id,
    designScreens: parsed.data.length,
  }, requestIp(request));

  return NextResponse.json({ ok: true });
}
