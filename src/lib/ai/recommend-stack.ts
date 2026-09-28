import { generateText } from "ai";
import { prisma } from "@/lib/prisma";
import { resolveUserModel, NoModelConfiguredError } from "@/lib/ai/resolve-model";
import { classifyProviderError } from "@/lib/ai/errors";
import { parseStageResult } from "@/lib/ai/result";
import { sanitizePrompt } from "@/lib/sanitize";
import type { Prisma } from "@/generated/prisma/client";

/**
 * One-shot AI call that fills the project's `languagePlan` right after
 * creation (Workstream A). Runs in the background — a missing model config
 * or a transient failure must never block project creation.
 */
export async function recommendStackForProject(projectId: string): Promise<void> {
  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || project.languagePlan) return;

    const resolved = await resolveUserModel(project.userId);
    const lang = project.outputLanguage || "en";

    const { text } = await generateText({
      model: resolved.model,
      system: sanitizePrompt(
        `You are a senior software architect. Recommend a technology stack for a website project.\n` +
          `Project name: ${project.name}\n` +
          `Description: ${project.description ?? "Not specified"}\n` +
          `Template: ${project.template ?? "custom"}\n` +
          `Scope/requirements: ${project.scopeRequirements ?? "Not specified"}\n` +
          `Reply ONLY with a JSON object:\n` +
          `{\n  "recommendedStack": { "languages": string[], "framework": string, "database": string, "hosting": string },\n  "securityRequirements": string[]\n}\n` +
          `Write human-readable strings in ${lang}.`,
      ),
      messages: [{ role: "user", content: "Recommend the stack now." }],
      maxOutputTokens: 1024,
      maxRetries: 2,
      temperature: 0.4,
    });

    const result = parseStageResult(text);
    if (result?.recommendedStack) {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          languagePlan: {
            recommendedStack: result.recommendedStack,
            securityRequirements: result.securityRequirements ?? [],
            decidedByUser: false,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    }
  } catch (err) {
    if (err instanceof NoModelConfiguredError) {
      console.log("[ai/recommend-stack] no model configured — skipping background recommendation.");
    } else {
      const classified = classifyProviderError(err);
      console.warn(
        "[ai/recommend-stack]",
        classified ? `${classified.code}: ${classified.message}` : err instanceof Error ? err.message : err,
      );
    }
  }
}
