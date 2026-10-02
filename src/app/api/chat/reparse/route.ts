import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { extractJson, parseStageResult, persistStageResult, planResultSchema } from "@/lib/ai/result";

const bodySchema = z.object({
  projectStageId: z.string().min(1),
});

/**
 * Re-parses the last assistant message of a stage's chat and persists any
 * structured JSON it contains. Lets users recover a turn where the model
 * returned prose + JSON that was never saved.
 */
export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/chat/reparse");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`reparse:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const projectStage = await prisma.projectStage.findUnique({
    where: { id: parsed.data.projectStageId },
    include: { project: true, stage: true },
  });
  if (!projectStage || projectStage.project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const lastAssistant = await prisma.message.findFirst({
    where: { chat: { projectStageId: projectStage.id }, role: "assistant" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastAssistant) {
    return NextResponse.json({ error: "No AI response to parse yet." }, { status: 400 });
  }

  // A plan-mode reply is checked first: `parseStageResult` is permissive and
  // would otherwise swallow the plan JSON as an (empty) stage result.
  const plan = planResultSchema.safeParse(extractJson(lastAssistant.content));
  if (plan.success) {
    return NextResponse.json({ ok: true, plan: plan.data });
  }

  const result = parseStageResult(lastAssistant.content);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: "The last response does not contain structured results." },
      { status: 422 },
    );
  }

  const persisted = await persistStageResult({
    projectStageId: projectStage.id,
    userId: session.user.id,
    result,
  });

  return NextResponse.json({ ok: true, result, ...persisted });
}
