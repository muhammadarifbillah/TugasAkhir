import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runStageTurn } from "@/lib/ai/engine";
import { classifyProviderError } from "@/lib/ai/errors";
import { rateLimitedAny } from "@/lib/rate-limit";
import { requestIp } from "@/lib/audit";
import { chatPromptSchema, parseJsonBody } from "@/lib/api-schemas";
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

  const parsed = await parseJsonBody(request, chatPromptSchema);
  if (!parsed.ok) return parsed.response;
  const body = parsed.data;

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