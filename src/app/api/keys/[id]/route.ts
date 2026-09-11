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
  isActive: z.boolean().optional(),
  label: z.string().max(80).optional(),
});

export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/keys/[id]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`key:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many key changes. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const existing = await prisma.userApiKey.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, providerCode: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const key = await prisma.userApiKey.update({
    where: { id },
    data: parsed.data,
  });

  await writeAudit(session.user.id, "UPDATE_MODEL", {
    apiKeyId: id,
    providerCode: existing.providerCode,
    changes: parsed.data,
  }, requestIp(request));

  return NextResponse.json({ ok: true, isActive: key.isActive });
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`key:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many key changes. Slow down." }, { status: 429 });
  }

  const { id } = await params;

  const existing = await prisma.userApiKey.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true, providerCode: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deletedModels = await prisma.$transaction(async (tx) => {
    const models = await tx.userModel.findMany({
      where: { apiKeyId: id, userId: session.user.id },
      select: { id: true, isDefault: true },
    });
    await tx.userModel.deleteMany({ where: { apiKeyId: id, userId: session.user.id } });
    await tx.userApiKey.delete({ where: { id } });

    // Promote another model if the default was removed with the key.
    if (models.some((m) => m.isDefault)) {
      const defaults = await tx.userModel.count({ where: { userId: session.user.id, isDefault: true } });
      if (defaults === 0) {
        const next = await tx.userModel.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: "asc" },
        });
        if (next) {
          await tx.userModel.update({ where: { id: next.id }, data: { isDefault: true } });
        }
      }
    }
    return models.map((m) => m.id);
  });

  await writeAudit(
    session.user.id,
    "REMOVE_API_KEY",
    { apiKeyId: id, providerCode: existing.providerCode, deletedModels },
    requestIp(request),
  );

  return NextResponse.json({ ok: true, deletedModels });
}