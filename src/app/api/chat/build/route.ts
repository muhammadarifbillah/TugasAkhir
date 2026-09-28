import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runBuildTurn } from "@/lib/ai/engine";
import { classifyProviderError } from "@/lib/ai/errors";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { planResultSchema } from "@/lib/ai/result";

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/chat/build");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(session.user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded. Slow down." }, { status: 429 });
  }

  const body = (await request.json()) as {
    projectId?: string;
    projectStageId?: string;
    prompt?: string;
    approvedPlan?: unknown;
  };

  if (!body.projectStageId || typeof body.prompt !== "string" || !body.prompt.trim()) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!body.approvedPlan) {
    return NextResponse.json({ error: "Approved plan is required" }, { status: 400 });
  }

  // Validate plan structure
  const planParse = planResultSchema.safeParse(body.approvedPlan);
  if (!planParse.success) {
    return NextResponse.json({ error: "Invalid plan structure" }, { status: 400 });
  }

  if (body.prompt.length > 8000) {
    return NextResponse.json({ error: "Prompt too long" }, { status: 400 });
  }

  try {
    const result = await runBuildTurn({
      userId: session.user.id,
      projectId: body.projectId!,
      projectStageId: body.projectStageId,
      userPrompt: body.prompt,
      approvedPlan: planParse.data,
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
    console.error("[api/chat/build]", err);
    return NextResponse.json(
      { error: "AI request failed. Please try again." },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
