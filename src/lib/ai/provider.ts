import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import type { LanguageModel } from "ai";
import { NoModelConfiguredError } from "@/lib/ai/errors";

/** Providers that can run without a credential. */
const KEYLESS_PROVIDERS = new Set(["ollama"]);

/** OpenAI-compatible endpoints for providers that only differ by base URL. */
const COMPATIBLE_BASE_URLS: Record<string, string> = {
  openrouter: "https://openrouter.ai/api/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta/openai",
  deepseek: "https://api.deepseek.com/v1",
  omniroute: "https://router.boilingac.id/v1",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  together: "https://api.together.xyz/v1",
  cerebras: "https://api.cerebras.ai/v1",
};

/**
 * Builds an AI SDK LanguageModel from the user's BYOK configuration.
 * - OpenAI + OpenRouter + Gemini use the OpenAI-compatible client.
 * - Anthropic uses its native client.
 * - Ollama uses the local provider (no API key required).
 *
 * A missing key is a hard error for every other provider. Passing `undefined`
 * through to the SDK would make it fall back to `process.env.OPENAI_API_KEY`
 * (and `ANTHROPIC_API_KEY`), which for the `gemini`/`openrouter` branches would
 * send the OPERATOR's key to a third-party endpoint.
 */
export function buildModel(
  providerCode: string,
  modelName: string,
  apiKey?: string,
  baseUrl?: string,
): LanguageModel {
  if (!KEYLESS_PROVIDERS.has(providerCode) && !apiKey) {
    throw new NoModelConfiguredError();
  }

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
    case "openai":
      model = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? undefined,
      }).chat(modelName);
      break;
    case "openrouter":
    case "gemini":
    case "deepseek":
    case "omniroute":
    case "groq":
    case "mistral":
    case "xai":
    case "together":
    case "cerebras":
      model = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? COMPATIBLE_BASE_URLS[providerCode],
        name: providerCode,
      }).chat(modelName);
      break;
    default:
      model = createOpenAI({
        apiKey,
        baseURL: baseUrl ?? undefined,
      }).chat(modelName);
      break;
  }
  return model as LanguageModel;
}