import { prisma } from "@/lib/prisma";

/**
 * Records token usage for AI calls that are not chat turns. Chat usage lives in
 * Message.promptMeta; this table fills the gap for Design Studio and the stack
 * recommendation. A logging failure must never fail the user's actual request.
 */
export async function recordAiUsage(input: {
  userId: string;
  projectId?: string | null;
  source: "design" | "design-plan" | "stack";
  providerCode?: string | null;
  modelName?: string | null;
  promptTokens?: number | null;
  completionTokens?: number | null;
}): Promise<void> {
  try {
    await prisma.aiUsage.create({
      data: {
        userId: input.userId,
        projectId: input.projectId ?? null,
        source: input.source,
        providerCode: input.providerCode ?? null,
        modelName: input.modelName ?? null,
        promptTokens: input.promptTokens ?? 0,
        completionTokens: input.completionTokens ?? 0,
      },
    });
  } catch (err) {
    console.warn("[ai/usage] could not record usage", err);
  }
}
