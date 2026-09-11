import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";

const modelSchema = z.object({
  providerCode: z.string().min(1),
  apiKeyId: z.string().optional().nullable(),
  modelName: z.string().min(1),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(256).max(128000).default(16384),
  isDefault: z.boolean().default(false),
});

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/models");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`model:${session.user.id}`, 30)) {
    return NextResponse.json({ error: "Too many model updates. Slow down." }, { status: 429 });
  }

  const parsed = modelSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid model payload" }, { status: 400 });
  }
  const data = parsed.data;

  const provider = await prisma.modelProvider.findUnique({
    where: { code: data.providerCode },
  });
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  // Key-requiring providers must have a valid, owned API key attached.
  if (provider.requiresKey && !data.apiKeyId) {
    return NextResponse.json(
      { error: "This provider requires an API key. Add a key first and select it." },
      { status: 400 },
    );
  }

  // Key ownership check
  if (data.apiKeyId) {
    const key = await prisma.userApiKey.findFirst({
      where: { id: data.apiKeyId, userId: session.user.id },
      select: { providerCode: true },
    });
    if (!key || key.providerCode !== data.providerCode) {
      return NextResponse.json(
        { error: "API key does not belong to this provider" },
        { status: 400 },
      );
    }
  }

  const existingCount = await prisma.userModel.count({ where: { userId: session.user.id } });
  // The first model automatically becomes the default; otherwise keep the
  // current default unless the user explicitly opts in.
  const isDefault = existingCount === 0 ? true : data.isDefault;

  const model = await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.userModel.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false },
      });
    }
    return tx.userModel.create({
      data: {
        userId: session.user.id,
        providerCode: data.providerCode,
        apiKeyId: data.apiKeyId ?? null,
        modelName: data.modelName.trim().toLowerCase(),
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        isDefault,
      },
    });
  });

  await writeAudit(session.user.id, "ADD_MODEL", {
    modelId: model.id,
    providerCode: data.providerCode,
    modelName: data.modelName,
    isDefault,
  }, requestIp(request));

  return NextResponse.json({ model }, { status: 201 });
}
