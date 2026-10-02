import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { auth } from "@/auth";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { resolveUserModel } from "@/lib/ai/resolve-model";
import { classifyProviderError, EmptyModelOutputError } from "@/lib/ai/errors";
import {
  createScreen,
  hasVisibleContent,
  parseDesignScreens,
  MAX_PAGES_PER_ROLE,
  MAX_SCREEN_HTML,
  MAX_SCREENS,
} from "@/lib/design";

const bodySchema = z.object({
  prompt: z.string().min(1).max(4000),
  screenId: z.string().optional(),
  html: z.string().max(MAX_SCREEN_HTML).optional(),
  /** Display name to keep when refining an existing screen. */
  name: z.string().max(80).optional(),
  device: z.enum(["desktop", "tablet", "mobile"]).optional(),
  /** When true (and not refining), generate every implied page at once. */
  multi: z.boolean().optional(),
  /** Role these screens belong to (from the design plan); tags every screen. */
  role: z.string().max(80).optional(),
  /** design plan version at the time of generation (for staleness tracking). */
  planVersion: z.number().optional(),
  /** Planned-page key this screen implements (kept across a refine). */
  planKey: z.string().max(160).optional(),
  /** Planned pages for the role, used to scope + tag a per-role generation. */
  planPages: z
    .array(z.object({ key: z.string().max(160), name: z.string().max(80) }))
    .max(MAX_PAGES_PER_ROLE)
    .optional(),
});

interface RouteProps {
  params: Promise<{ id: string }>;
}

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

  // A refine that names a screen must base on it; silently generating a fresh
  // screen (without the base) would look like refine "did nothing".
  if (parsed.data.screenId && !currentHtml) {
    return NextResponse.json(
      {
        error: "SCREEN_NOT_FOUND",
        message: "The screen to refine was not found. Reload the designs and try again.",
      },
      { status: 409 },
    );
  }

  const isMulti = Boolean(parsed.data.multi) && !currentHtml;
  const roleName = parsed.data.role?.trim() || undefined;
  const planPages = parsed.data.planPages ?? [];
  const pageKeyByName = new Map(planPages.map((p) => [p.name.trim().toLowerCase(), p.key]));

  const baseRules = [
    "- Each screen is a COMPLETE, self-contained HTML document (doctype, <head> with inline <style>, <body> with visible content).",
    "- Use inline CSS only. No external stylesheets, scripts, fonts, or images (CSS or inline SVG only).",
    "- Do NOT include JavaScript.",
    `- Target the ${device} layout.`,
    `- Project: ${project.name}. ${project.description ?? ""}`.trim(),
    project.uiPreferences ? `- Visual preferences: ${project.uiPreferences}` : "",
    `- Write all visible copy in this language: ${project.outputLanguage}.`,
    "Make it modern, accessible (semantic tags, good contrast) and visually polished.",
  ].filter(Boolean);

  // A per-role generation is scoped to the pages that role needs, so it never
  // spills into other roles' pages (that was the "generated everything" bug).
  const multiSystem = roleName
    ? [
        `You are a senior UI designer. Produce the UI pages for ONE user role: "${roleName}".`,
        `Return ONLY a JSON object of the exact shape {"screens":[{"name":"Page Name","html":"<!doctype html>..."}, ...]} — no prose, no markdown fences.`,
        planPages.length > 0
          ? `Produce EXACTLY these pages, one screen each, and use the exact given name as the screen "name": ${planPages.map((p) => p.name).join(", ")}.`
          : `Produce every page this role needs. If the request names pages, produce exactly those. Do NOT produce pages for other roles.`,
        "Rules for each screen:",
        ...baseRules,
      ].join("\n")
    : [
        "You are a senior UI designer. Produce ALL the key screens of the website described below, each as its own high-fidelity HTML document.",
        `Return ONLY a JSON object of the exact shape {"screens":[{"name":"Login","html":"<!doctype html>..."}, ...]} — no prose, no markdown fences.`,
        `Produce between 2 and ${MAX_SCREENS} screens. If the request names pages, produce exactly those; otherwise infer the main pages from the description (e.g. Landing, Login, Dashboard, and the app's core feature pages).`,
        "Rules for each screen:",
        ...baseRules,
      ].join("\n");

  const system = isMulti
    ? multiSystem
    : [
        "You are a senior UI designer. Produce ONE high-fidelity website screen as a single self-contained HTML document.",
        "Rules:",
        "- Output ONLY the HTML (no prose, no markdown fences).",
        ...baseRules,
      ].join("\n");

  const userPrompt = currentHtml
    ? `Here is the current screen HTML:\n\n${currentHtml}\n\nApply this change and return the full updated HTML:\n${parsed.data.prompt}`
    : parsed.data.prompt;

  try {
    const resolved = await resolveUserModel(session.user.id);
    const temperature = Math.min(resolved.temperature ?? 0.7, 1);

    // Up to two content attempts: a retry recovers from an empty/fragment reply.
    let rawScreens: { name?: string; html: string }[] = [];
    for (let attempt = 0; attempt < 2 && rawScreens.length === 0; attempt++) {
      const { text } = await generateText({
        model: resolved.model,
        system:
          attempt === 0
            ? system
            : `${system}\n\nYour previous reply had no usable screen. Return the required output with visible, styled content.`,
        prompt: userPrompt,
        temperature,
        maxOutputTokens: resolved.maxTokens ?? 393216,
        maxRetries: 3,
        abortSignal: AbortSignal.timeout(300_000),
      });

      if (isMulti) {
        rawScreens = parseDesignScreens(text).filter(
          (s) => s.html.length <= MAX_SCREEN_HTML && hasVisibleContent(s.html),
        );
      } else {
        const html = extractHtml(text);
        if (html && html.length <= MAX_SCREEN_HTML && hasVisibleContent(html)) {
          rawScreens = [{ html }];
        }
      }
    }

    if (rawScreens.length === 0) {
      throw new EmptyModelOutputError();
    }

    const screens = rawScreens.slice(0, MAX_SCREENS).map((s, i) => {
      // Tag each screen with its role and (when it matches) the planned page.
      const planKey =
        (s.name ? pageKeyByName.get(s.name.trim().toLowerCase()) : undefined) ??
        parsed.data.planKey;
      return createScreen({
        // Prefer the model's name, then the name of the screen being refined,
        // and only fall back to the prompt for a brand-new single screen.
        name: (s.name ?? parsed.data.name ?? (isMulti ? `Screen ${i + 1}` : parsed.data.prompt))
          .trim()
          .slice(0, 60) || "Screen",
        device,
        html: s.html,
        prompt: parsed.data.prompt,
        role: roleName,
        planKey,
        planVersion: parsed.data.planVersion,
      });
    });

    return NextResponse.json({ ok: true, screens, screen: screens[0] });
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
