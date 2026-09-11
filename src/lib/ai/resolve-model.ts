import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { buildModel } from "@/lib/ai/provider";
import type { LanguageModel } from "ai";

export interface ResolvedModel {
  model: LanguageModel;
  providerCode: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export class NoModelConfiguredError extends Error {
  constructor() {
    super("NO_MODEL_CONFIGURED");
    this.name = "NoModelConfiguredError";
  }
}

/**
 * Resolves the user's default BYOK model. Falls back to env-configured
 * defaults so a bare Ollama installation can be used without setup.
 */
export async function resolveUserModel(userId: string): Promise<ResolvedModel> {
  const userModel = await prisma.userModel.findFirst({
    where: { userId, isDefault: true },
    orderBy: { createdAt: "desc" },
    include: { apiKey: true, provider: true },
  });

  if (userModel) {
    const apiKey = userModel.apiKey
      ? decryptSecret(userModel.apiKey.keyEncrypted)
      : undefined;
    return {
      model: buildModel(
        userModel.providerCode,
        userModel.modelName,
        apiKey,
        userModel.provider.baseUrl ?? undefined,
      ),
      providerCode: userModel.providerCode,
      modelName: userModel.modelName,
      temperature: userModel.temperature,
      maxTokens: userModel.maxTokens,
    };
  }

  // Env-based fallback (DEFAULT_AI_PROVIDER / DEFAULT_AI_MODEL)
  const providerCode = process.env.DEFAULT_AI_PROVIDER ?? "openai";
  const modelName = process.env.DEFAULT_AI_MODEL ?? "gpt-4o-mini";
  const apiKey = process.env.DEFAULT_AI_API_KEY?.trim() || undefined;

  if (providerCode === "ollama") {
    return {
      model: buildModel(providerCode, modelName),
      providerCode,
      modelName,
      temperature: 0.7,
      maxTokens: 16384,
    };
  }

  if (!apiKey) {
    throw new NoModelConfiguredError();
  }

  return {
    model: buildModel(providerCode, modelName, apiKey),
    providerCode,
    modelName,
    temperature: 0.7,
    maxTokens: 16384,
  };
}

export { buildModel } from "@/lib/ai/provider";
