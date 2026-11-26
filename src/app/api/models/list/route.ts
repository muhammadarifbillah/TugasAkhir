import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { fetchOpenAICompatibleModels } from "@/lib/ai/provider-models";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";

const bodySchema = z.object({
  providerCode: z.string().min(1),
  apiKeyId: z.string().optional(),
});

interface ModelEntry {
  id: string;
  name: string;
  maxTokens: number | null;
}

/**
 * Suggested models used when the live provider call fails (offline/blocked
 * network). Clearly flagged to the client as a fallback so it can warn the user.
 */
const STATIC_MODELS: Record<string, ModelEntry[]> = {
  gemini: [
    { id: "gemini-flash-latest", name: "Gemini Flash (latest)", maxTokens: 8192 },
    { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", maxTokens: 8192 },
    { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", maxTokens: 8192 },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", maxTokens: null },
    { id: "gpt-4o-mini", name: "GPT-4o mini", maxTokens: null },
    { id: "gpt-4.1", name: "GPT-4.1", maxTokens: null },
    { id: "o4-mini", name: "o4-mini", maxTokens: null },
  ],
  openrouter: [
    { id: "openai/gpt-4o-mini", name: "OpenAI GPT-4o mini", maxTokens: null },
    { id: "anthropic/claude-3.5-sonnet", name: "Anthropic Claude 3.5 Sonnet", maxTokens: null },
    { id: "google/gemini-flash-1.5", name: "Google Gemini Flash 1.5", maxTokens: null },
  ],
  deepseek: [
    { id: "deepseek-flash", name: "DeepSeek Flash", maxTokens: 393216 },
  ],
  groq: [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile", maxTokens: 32768 },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", maxTokens: 8192 },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", maxTokens: 32768 },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large (latest)", maxTokens: null },
    { id: "mistral-medium-latest", name: "Mistral Medium (latest)", maxTokens: null },
    { id: "mistral-small-latest", name: "Mistral Small (latest)", maxTokens: null },
    { id: "codestral-latest", name: "Codestral (latest)", maxTokens: null },
  ],
  xai: [
    { id: "grok-2-latest", name: "Grok 2 (latest)", maxTokens: null },
    { id: "grok-2-vision-latest", name: "Grok 2 Vision (latest)", maxTokens: null },
    { id: "grok-beta", name: "Grok Beta", maxTokens: null },
  ],
  together: [
    { id: "meta-llama/Llama-3.3-70B-Instruct-Turbo", name: "Llama 3.3 70B Turbo", maxTokens: null },
    { id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", name: "Llama 3.1 405B Turbo", maxTokens: null },
    { id: "Qwen/Qwen2.5-72B-Instruct-Turbo", name: "Qwen 2.5 72B Turbo", maxTokens: null },
    { id: "deepseek-ai/DeepSeek-V3", name: "DeepSeek V3", maxTokens: null },
  ],
  cerebras: [
    { id: "llama-3.3-70b", name: "Llama 3.3 70B", maxTokens: 8192 },
    { id: "llama3.1-8b", name: "Llama 3.1 8B", maxTokens: 8192 },
  ],
  // Mirror of the router's own catalog; live fetch above replaces it when reachable.
  omniroute: [
    { id: "auto", name: "Auto (router pick)", maxTokens: null },
    { id: "cc/claude-opus-5-5", name: "Claude Opus 5.5", maxTokens: null },
    { id: "cc/claude-sonnet-5-5", name: "Claude Sonnet 5.5", maxTokens: null },
    { id: "cc/claude-haiku-5-5", name: "Claude Haiku 5.5", maxTokens: null },
    { id: "claude/claude-opus-5-5", name: "Claude Opus 5.5 (Messages)", maxTokens: null },
    { id: "claude/claude-sonnet-5-5", name: "Claude Sonnet 5.5 (Messages)", maxTokens: null },
    { id: "claude/claude-haiku-5-5", name: "Claude Haiku 5.5 (Messages)", maxTokens: null },
    { id: "no-think/cc/claude-haiku-5-5", name: "Claude Haiku 5.5 (no thinking)", maxTokens: null },
    { id: "opencode-go/deepseek-v4.1-flash", name: "DeepSeek V4.1 Flash", maxTokens: null },
    { id: "opencode-go/deepseek-v4-pro", name: "DeepSeek V4 Pro", maxTokens: null },
  ],
};

async function fetchGeminiModels(apiKey: string): Promise<ModelEntry[]> {
  // The key travels in a header, never in the query string: URLs are recorded by
  // proxies, CDNs and error messages, which would leak the credential.
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models",
    {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(10000),
    },
  );
  if (!res.ok) throw new Error(`Gemini API ${res.status}`);
  const data = await res.json();
  const models: ModelEntry[] = (data.models ?? [])
    .filter(
      (m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent"),
    )
    .map((m: { name: string; displayName?: string; outputTokenLimit?: number }) => ({
      id: m.name.replace("models/", ""),
      name: m.displayName ?? m.name.replace("models/", ""),
      maxTokens: m.outputTokenLimit ?? null,
    }));
  return models;
}

async function fetchOpenAIModels(apiKey: string, baseUrl?: string): Promise<ModelEntry[]> {
  const res = await fetch(`${baseUrl ?? "https://api.openai.com/v1"}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`OpenAI API ${res.status}`);
  const data = await res.json();
  const chatPrefixes = ["gpt-4", "gpt-5", "gpt-3.5", "o1", "o3", "o4", "o5"];
  const models: ModelEntry[] = (data.data ?? [])
    .filter((m: { id: string }) =>
      chatPrefixes.some((p) => m.id.startsWith(p)),
    )
    .map((m: { id: string }) => ({
      id: m.id,
      name: m.id,
      maxTokens: null,
    }));
  return models;
}

async function fetchOpenRouterModels(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`OpenRouter API ${res.status}`);
  const data = await res.json();
  const models: ModelEntry[] = (data.data ?? [])
    .filter((m: { context_length?: number }) => (m.context_length ?? 0) > 0)
    .map((m: { id: string; name?: string }) => ({
      id: m.id,
      name: m.name ?? m.id,
      maxTokens: null,
    }));
  return models;
}

function fetchAnthropicModels(): ModelEntry[] {
  return [
    { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4", maxTokens: 8192 },
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", maxTokens: 8192 },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", maxTokens: 8192 },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", maxTokens: 4096 },
  ];
}

async function fetchOllamaModels(): Promise<ModelEntry[]> {
  const res = await fetch("http://localhost:11434/api/tags", {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) throw new Error(`Ollama API ${res.status}`);
  const data = await res.json();
  const models: ModelEntry[] = (data.models ?? []).map((m: { name: string }) => ({
    id: m.name,
    name: m.name,
    maxTokens: null,
  }));
  return models;
}

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/models/list");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`models-list:${session.user.id}`, 15)) {
    return NextResponse.json({ error: "Too many requests. Slow down." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { providerCode, apiKeyId } = parsed.data;

  // Anthropic and Ollama don't need a real API key
  if (providerCode === "anthropic") {
    return NextResponse.json({ models: fetchAnthropicModels() });
  }
  if (providerCode === "ollama") {
    try {
      const models = await fetchOllamaModels();
      return NextResponse.json({ models });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Ollama not reachable";
      return NextResponse.json({ error: message, models: [] }, { status: 400 });
    }
  }

  // For key-requiring providers, decrypt the stored key
  if (!apiKeyId) {
    return NextResponse.json(
      { error: "API key is required. Add a key first." },
      { status: 400 },
    );
  }

  const keyRecord = await prisma.userApiKey.findFirst({
    where: { id: apiKeyId, userId: session.user.id },
  });
  if (!keyRecord) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const apiKey = decryptSecret(keyRecord.keyEncrypted);
  const provider = await prisma.modelProvider.findUnique({
    where: { code: providerCode },
  });
  const baseUrl = provider?.baseUrl ?? undefined;

  try {
    let models: ModelEntry[];
    switch (providerCode) {
      case "gemini":
        models = await fetchGeminiModels(apiKey);
        break;
      case "openai":
        models = await fetchOpenAIModels(apiKey, baseUrl);
        break;
      case "openrouter":
        models = await fetchOpenRouterModels(apiKey);
        break;
      case "deepseek":
        models = await fetchOpenAICompatibleModels(apiKey, baseUrl ?? "https://api.deepseek.com/v1");
        break;
      case "omniroute":
        models = await fetchOpenAICompatibleModels(
          apiKey,
          baseUrl ?? "https://router.boilingac.id/v1",
        );
        break;
      default:
        // Every other seeded provider is OpenAI-compatible and only needs its
        // base URL. A provider without one is genuinely unknown.
        if (!baseUrl) {
          return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
        }
        models = await fetchOpenAICompatibleModels(apiKey, baseUrl);
    }
    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    // Fall back to a suggested list so the user can still add a model when the
    // provider is unreachable (offline, blocked host, proxy, etc.).
    const fallback = STATIC_MODELS[providerCode];
    if (fallback) {
      return NextResponse.json({ models: fallback, fallback: true, error: message });
    }
    return NextResponse.json({ error: message, models: [] }, { status: 400 });
  }
}
