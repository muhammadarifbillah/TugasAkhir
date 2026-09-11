import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const patchSchema = z.object({
  isDefault: z.boolean().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(256).optional(),
});

export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/models/[id]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`model:${session.user.id}`, 30)) {
    return NextResponse.json({ error: "Too many model updates. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.userModel.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Never allow clearing the last default model.
  if (data.isDefault === false && existing.isDefault) {
    const defaults = await prisma.userModel.count({
      where: { userId: session.user.id, isDefault: true },
    });
    if (defaults <= 1) {
      return NextResponse.json(
        { error: "At least one default model must remain." },
        { status: 400 },
      );
    }
  }

  const model = await prisma.$transaction(async (tx) => {
    if (data.isDefault) {
      await tx.userModel.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }
    return tx.userModel.update({ where: { id }, data });
  });

  await writeAudit(session.user.id, data.isDefault ? "SET_DEFAULT_MODEL" : "UPDATE_MODEL", {
    modelId: id,
    modelName: model.modelName,
    changes: data,
  }, requestIp(request));

  return NextResponse.json({ model });
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`model:${session.user.id}`, 30)) {
    return NextResponse.json({ error: "Too many model updates. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const existing = await prisma.userModel.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.userModel.delete({ where: { id } });
    // If we removed the only default, promote another model.
    const remaining = await tx.userModel.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    if (remaining && existing.isDefault) {
      const defaults = await tx.userModel.count({ where: { userId: session.user.id, isDefault: true } });
      if (defaults === 0) {
        await tx.userModel.update({ where: { id: remaining.id }, data: { isDefault: true } });
      }
    }
  });

  await writeAudit(session.user.id, "REMOVE_MODEL", {
    modelId: id,
    modelName: existing.modelName,
    providerCode: existing.providerCode,
    wasDefault: existing.isDefault,
  }, requestIp(_request));

  return NextResponse.json({ ok: true });
}
