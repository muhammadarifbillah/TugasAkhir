import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { auth } from "@/auth";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { resolveUserModel } from "@/lib/ai/resolve-model";
import { classifyProviderError, EmptyModelOutputError } from "@/lib/ai/errors";
import { createScreen, hasVisibleContent, MAX_SCREEN_HTML } from "@/lib/design";

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  screenId: z.string().optional(),
  html: z.string().max(MAX_SCREEN_HTML).optional(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

/** Extracts the HTML document from a model reply (strips prose / code fences). */
function extractHtml(text: string): string | null {
  let t = text.trim();
  const fence = /```(?:html)?\s*([\s\S]*?)```/i.exec(t);
  if (fence) t = fence[1].trim();
  const start = t.search(/<!doctype html|<html/i);
  if (start >= 0) t = t.slice(start);
  const end = t.toLowerCase().lastIndexOf("</html>");
  if (end >= 0) t = t.slice(0, end + "</html>".length);
  return t.trim().length > 0 ? t.trim() : null;
}

function storedScreenHtml(globalSpec: unknown, screenId: string): string | null {
  const design = ((globalSpec as Record<string, unknown> | null)?.design as
    | Record<string, unknown>
    | null) ?? {};
  const screens = Array.isArray(design.designScreens) ? design.designScreens : [];
  for (const raw of screens) {
    if (!raw || typeof raw !== "object") continue;
    const s = raw as Record<string, unknown>;
    if (s.id === screenId && typeof s.html === "string") return s.html;
  }
  return null;
}

export async function POST(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/design/generate");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`design-gen:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many design generations. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const device = parsed.data.device ?? "desktop";
  const currentHtml =
    parsed.data.html ??
    (parsed.data.screenId ? storedScreenHtml(project.globalSpec, parsed.data.screenId) : null);

  const system = [
    "You are a senior UI designer. Produce ONE high-fidelity website screen as a single self-contained HTML document.",
    "Rules:",
    "- Output ONLY the HTML (no prose, no markdown fences).",
    "- Use inline CSS (a <style> tag is fine). No external stylesheets, scripts, fonts, or images (use CSS or inline SVG only).",
    "- Do NOT include JavaScript.",
    `- Target the ${device} layout.`,
    `- Project: ${project.name}. ${project.description ?? ""}`.trim(),
    project.uiPreferences ? `- Visual preferences: ${project.uiPreferences}` : "",
    `- Write all visible copy in this language: ${project.outputLanguage}.`,
    "Make it modern, accessible (semantic tags, good contrast) and visually polished.",
  ]
    .filter(Boolean)
    .join("\n");

  const userPrompt = currentHtml
    ? `Here is the current screen HTML:\n\n${currentHtml}\n\nApply this change and return the full updated HTML:\n${parsed.data.prompt}`
    : parsed.data.prompt;

  try {
    const resolved = await resolveUserModel(session.user.id);
    const temperature = Math.min(resolved.temperature ?? 0.7, 1);

    // Up to two content attempts: a retry recovers from an empty/fragment reply
    // before we surface an error to the user.
    let html: string | null = null;
    for (let attempt = 0; attempt < 2 && !html; attempt++) {
      const { text } = await generateText({
        model: resolved.model,
        system:
          attempt === 0
            ? system
            : `${system}\n\nYour previous reply had no visible content. Return a COMPLETE HTML document whose <body> contains visible, styled content.`,
        prompt: userPrompt,
          temperature,
          maxOutputTokens: resolved.maxTokens ?? 393216,
          maxRetries: 3,
          abortSignal: AbortSignal.timeout(300_000),
      });

      const candidate = extractHtml(text);
      if (candidate && candidate.length <= MAX_SCREEN_HTML && hasVisibleContent(candidate)) {
        html = candidate;
      }
    }

    if (!html) {
      throw new EmptyModelOutputError();
    }

    const screen = createScreen({
      name: parsed.data.prompt.trim().slice(0, 40) || "Screen",
      device,
      html,
      prompt: parsed.data.prompt,
    });
    return NextResponse.json({ ok: true, screen });
  } catch (err) {
    const classified = classifyProviderError(err);
    if (classified) {
      return NextResponse.json(
        { error: classified.code, message: classified.message },
        { status: classified.status },
      );
    }
    console.error("[api/projects/[id]/design/generate]", err);
    return NextResponse.json({ error: "Failed to generate design." }, { status: 500 });
  }
}
