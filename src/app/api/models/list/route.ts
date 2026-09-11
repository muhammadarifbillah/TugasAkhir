import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { decryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { rateLimited } from "@/lib/rate-limit";

const bodySchema = z.object({
  providerCode: z.string().min(1),
  apiKeyId: z.string().optional(),
});

interface ModelEntry {
  id: string;
  name: string;
  maxTokens: number | null;
}

async function fetchGeminiModels(apiKey: string): Promise<ModelEntry[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
    { signal: AbortSignal.timeout(10000) },
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
  const chatPrefixes = ["gpt-4", "gpt-3.5", "o1", "o3", "o4"];
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
      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
    }
    return NextResponse.json({ models });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch models";
    return NextResponse.json({ error: message, models: [] }, { status: 400 });
  }
}
