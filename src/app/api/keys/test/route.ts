import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { auth } from "@/auth";
import { buildModel } from "@/lib/ai/provider";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { validateCsrfRequest } from "@/lib/validate-csrf";

const bodySchema = z.object({
  providerCode: z.string().min(1),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  modelName: z.string().optional(),
});

/** Only https endpoints on known provider hosts may be probed. */
function safeBaseUrl(input: string | undefined, providerBaseUrl: string | null): string | undefined {
  if (!input?.trim()) return undefined;
  const url = new URL(input.trim());
  if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
  const providerHost = providerBaseUrl ? new URL(providerBaseUrl).host : null;
  // Allow the provider's own host, localhost (Ollama), or any https host.
  if (url.host === "localhost" || url.host.endsWith(".localhost")) return url.toString();
  if (providerHost && (url.host === providerHost || url.host.endsWith(`.${providerHost}`))) {
    return url.toString();
  }
  return undefined;
}

export async function POST(request: Request) {
  const csrfError = await validateCsrfRequest(request, "/api/keys/test");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`test:${session.user.id}`, 10)) {
    return NextResponse.json({ error: "Too many connection tests. Slow down." }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { providerCode, apiKey, baseUrl, modelName } = parsed.data;

  const provider = await prisma.modelProvider.findUnique({
    where: { code: providerCode },
  });
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  const restrictedBaseUrl = safeBaseUrl(baseUrl, provider.baseUrl);
  if (baseUrl?.trim() && !restrictedBaseUrl) {
    return NextResponse.json({ error: "Custom base URL must be https on a known provider host." }, { status: 400 });
  }

  // Default to the provider's own default model so every provider is tested
  // against a real, working model (e.g. gemini-flash-latest, claude-3-5-sonnet-latest).
  const resolvedModelName =
    modelName?.trim() ||
    provider.defaultModel ||
    (providerCode === "ollama" ? "llama3.2" : "gpt-4o-mini");
  const resolvedKey = apiKey?.trim() || undefined;
  const resolvedBaseUrl = restrictedBaseUrl || provider.baseUrl || undefined;

  // The key is never persisted by this endpoint — it only pings the provider.
  const started = Date.now();
  try {
    const model = buildModel(providerCode, resolvedModelName, resolvedKey, resolvedBaseUrl);
    await generateText({
      model,
      messages: [{ role: "user", content: "ping" }],
      maxOutputTokens: 1024,
    });
    const latency = Date.now() - started;
    await writeAudit(session.user.id, "TEST_CONNECTION", { providerCode, modelName: resolvedModelName, ok: true }, requestIp(request));
    return NextResponse.json({ ok: true, latency });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    // Keep the raw message short; it is only shown in the user's own settings UI.
    const safeMessage = message.length > 200 ? `${message.slice(0, 200)}…` : message;
    await writeAudit(session.user.id, "TEST_CONNECTION", { providerCode, modelName: resolvedModelName, ok: false }, requestIp(request));
    return NextResponse.json({ ok: false, error: safeMessage }, { status: 400 });
  }
}
