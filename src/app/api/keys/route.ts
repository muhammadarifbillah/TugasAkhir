import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { encryptSecret, maskSecret } from "@/lib/crypto";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { createKeySchema, parseJsonBody } from "@/lib/api-schemas";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/keys");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`key:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many key changes. Slow down." }, { status: 429 });
  }

  const parsed = await parseJsonBody(request, createKeySchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

  const provider = await prisma.modelProvider.findUnique({
    where: { code: body.providerCode },
  });
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const key = await prisma.userApiKey.create({
    data: {
      userId: session.user.id,
      providerCode: provider.code,
      keyEncrypted: encryptSecret(body.apiKey),
      keyMasked: maskSecret(body.apiKey),
      label: body.label?.slice(0, 80) ?? null,
      isActive: true,
    },
  });

  await writeAudit(session.user.id, "ADD_API_KEY", {
    providerCode: provider.code,
    label: body.label ?? null,
  }, requestIp(request));

  return NextResponse.json(
    { id: key.id, providerCode: key.providerCode, keyMasked: key.keyMasked, label: key.label, isActive: key.isActive },
    { status: 201 },
  );
}