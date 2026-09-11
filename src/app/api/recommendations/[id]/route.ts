import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  isApplied: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: RouteContext) {
  const csrfError = await validateCsrfRequest(request, "/api/recommendations/[id]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`rec:${session.user.id}`, 60)) {
    return NextResponse.json({ error: "Too many updates. Slow down." }, { status: 429 });
  }

  const { id } = await ctx.params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const rec = await prisma.aiRecommendation.findUnique({
    where: { id },
    include: { projectStage: { include: { project: { select: { userId: true } } } } },
  });
  if (!rec || rec.projectStage.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.aiRecommendation.update({
    where: { id },
    data: { isApplied: parsed.data.isApplied },
  });

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: rec.projectStage.projectId,
    recommendation: id,
    isApplied: parsed.data.isApplied,
  }, requestIp(request));

  return NextResponse.json({ ok: true, id, isApplied: parsed.data.isApplied });
}
