import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { OUTPUT_LANGUAGES } from "@/app/api/projects/route";

const bodySchema = z.object({
  badgePublic: z.boolean().optional(),
  name: z.string().min(1).max(120).optional(),
  scopeRequirements: z.string().max(4000).optional(),
  outputLanguage: z
    .string()
    .refine((v) => OUTPUT_LANGUAGES.includes(v))
    .optional(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`project:${session.user.id}`, 60)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
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

  const data: Record<string, unknown> = {};
  if (parsed.data.badgePublic !== undefined) data.badgePublic = parsed.data.badgePublic;
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.scopeRequirements !== undefined) {
    data.scopeRequirements = parsed.data.scopeRequirements;
  }
  if (parsed.data.outputLanguage !== undefined) data.outputLanguage = parsed.data.outputLanguage;

  const updated = await prisma.project.update({
    where: { id },
    data,
  });

  await writeAudit(session.user.id, "UPDATE_PROJECT", {
    projectId: id,
    updated: Object.keys(data),
  }, requestIp(request));

  return NextResponse.json({
    ok: true,
    project: { id: updated.id, badgePublic: updated.badgePublic, name: updated.name, outputLanguage: updated.outputLanguage },
  });
}
