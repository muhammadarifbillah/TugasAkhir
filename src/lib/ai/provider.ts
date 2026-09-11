import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModel } from "ai";

/**
 * Builds an AI SDK LanguageModel from the user's BYOK configuration.
 * - OpenAI + OpenRouter + Gemini use the OpenAI-compatible client.
 * - Anthropic uses its native client.
 * - Ollama uses the local provider (no API key required).
 */
export function buildModel(
  providerCode: string,
  modelName: string,
  apiKey?: string,
  baseUrl?: string,
): LanguageModel {
  let model: unknown;
  switch (providerCode) {
    case "anthropic":
      model = createAnthropic({ apiKey })(modelName);
      break;
    case "ollama":
      model = createOllama({ baseURL: baseUrl ?? "http://localhost:11434" })(
        modelName,
      );
      break;
    case "openrouter":
      model = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? "https://openrouter.ai/api/v1",
        name: "openrouter",
      }).chat(modelName);
      break;
    case "gemini":
      model = createOpenAI({
        apiKey,
        baseURL:
          baseUrl ??
          "https://generativelanguage.googleapis.com/v1beta/openai",
        name: "gemini",
      }).chat(modelName);
      break;
    case "openai":
    default:
      model = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? undefined,
      }).chat(modelName);
      break;
  }
  return model as LanguageModel;
}