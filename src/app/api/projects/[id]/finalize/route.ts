import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  finalized: z.boolean(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/finalize");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const finalizedAt = parsed.data.finalized ? project.finalizedAt ?? new Date() : null;
  const updated = await prisma.project.update({
    where: { id },
    data: { finalizedAt, updatedAt: new Date() },
  });

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: id,
    finalized: parsed.data.finalized,
  }, requestIp(request));

  return NextResponse.json({ ok: true, finalizedAt: updated.finalizedAt });
}
