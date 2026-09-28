import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runStageTurn } from "@/lib/ai/engine";
import { classifyProviderError } from "@/lib/ai/errors";
import { rateLimitedAny } from "@/lib/rate-limit";
import { requestIp } from "@/lib/audit";
import { validateCsrfRequest } from "@/lib/validate-csrf";

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/chat");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Bound both the user's own budget and a per-IP ceiling: these calls spend the
  // user's AI credits, so a compromised session must not be able to drain them.
  const ip = requestIp(request) ?? "unknown";
  if (
    rateLimitedAny([
      { key: session.user.id, limit: 20 },
      { key: `chat-ip:${ip}`, limit: 40 },
    ])
  ) {
    return NextResponse.json({ error: "Rate limit exceeded. Slow down." }, { status: 429 });
  }

  const body = (await request.json()) as {
    projectId?: string;
    projectStageId?: string;
    prompt?: string;
  };

  if (!body.projectStageId || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (body.prompt.length > 8000) {
    return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
  }

  try {
    const result = await runStageTurn({
      userId: session.user.id,
      projectId: body.projectId!,
      projectStageId: body.projectStageId,
      userPrompt: body.prompt,
    });
    return NextResponse.json(result);
  } catch (err) {
    const classified = classifyProviderError(err);
    if (classified) {
      return NextResponse.json(
        { error: classified.code, message: classified.message },
        { status: classified.status },
      );
    }
    console.error("[api/chat]", err);
    return NextResponse.json(
      { error: "AI request failed. Please try again." },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}