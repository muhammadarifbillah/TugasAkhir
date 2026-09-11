import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { buildModel } from "@/lib/ai/provider";
import { NoModelConfiguredError } from "@/lib/ai/errors";
import type { LanguageModel } from "ai";

export interface ResolvedModel {
  model: LanguageModel;
  providerCode: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
}

export { NoModelConfiguredError };

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
    // A deactivated key must not be used, even if a model still references it.
    if (userModel.apiKey && !userModel.apiKey.isActive) {
      throw new NoModelConfiguredError(
        "The API key for the default model is deactivated. Activate it or pick another key in Settings.",
      );
    }

    let apiKey: string | undefined;
    if (userModel.apiKey) {
      try {
        apiKey = decryptSecret(userModel.apiKey.keyEncrypted);
      } catch {
        // A key that cannot be decrypted (e.g. after a master-key rotation) is
        // unusable; report it instead of falling through to another credential.
        throw new NoModelConfiguredError(
          "The stored API key could not be decrypted. Re-add it in Settings.",
        );
      }
    }

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
