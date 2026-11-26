import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { auth } from "@/auth";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { resolveUserModel } from "@/lib/ai/resolve-model";
import { classifyProviderError, EmptyModelOutputError } from "@/lib/ai/errors";
import { recordAiUsage } from "@/lib/ai/usage";
import { extractJson } from "@/lib/ai/result";
import { effectiveDesignPlan, normalizePlan, type DesignPlan } from "@/lib/design";
import type { Prisma } from "@/generated/prisma/client";

interface RouteProps {
  params: Promise<{ id: string }>;
}

const saveSchema = z.object({ plan: z.unknown() });

function readPlan(globalSpec: unknown): DesignPlan {
  const design = ((globalSpec as Record<string, unknown> | null)?.design as
    | Record<string, unknown>
    | null) ?? {};
  return normalizePlan(design.uiPlan);
}

async function persistPlan(projectId: string, userId: string, plan: DesignPlan): Promise<DesignPlan> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ id: string; userId: string }[]>`
      SELECT "id", "userId" FROM "projects" WHERE "id" = ${projectId} FOR UPDATE
    `;
    const owner = locked[0];
    if (!owner || owner.userId !== userId) throw new Error("forbidden");

    const current = await tx.project.findUniqueOrThrow({ where: { id: projectId } });
    const globalSpec = (current.globalSpec as Record<string, unknown> | null) ?? {};
    const design = (globalSpec.design as Record<string, unknown> | null) ?? {};

    await tx.project.update({
      where: { id: projectId },
      data: {
        globalSpec: {
          ...globalSpec,
          design: { ...design, uiPlan: plan },
        } as unknown as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });
    return plan;
  });
}

/** Returns the current structured design plan (roles → pages). */
export async function GET(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, plan: effectiveDesignPlan(project.globalSpec) });
}

/** Generates a fresh structured plan from the project context (Analysis + Design). */
export async function POST(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/design/plan");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (rateLimited(`design-plan:${session.user.id}`, 10)) {
    return NextResponse.json({ error: "Too many plan generations. Slow down." }, { status: 429 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const spec = (project.globalSpec as Record<string, unknown> | null) ?? {};
  const analysis = (spec.analysis as Record<string, unknown> | null) ?? {};
  const design = (spec.design as Record<string, unknown> | null) ?? {};
  const knownRoles = Array.isArray(analysis.roles) ? (analysis.roles as string[]) : [];
  const uiDesign = Array.isArray(design.uiDesign) ? (design.uiDesign as string[]) : [];
  const previous = readPlan(project.globalSpec);

  const system = [
    "You are a senior UX architect. Produce a design plan that groups the website's UI pages BY USER ROLE.",
    'Return ONLY a JSON object of the exact shape {"roles":[{"name":"Guest","description":"...","pages":[{"name":"Landing","description":"...","route":"/"}]}]} — no prose, no markdown fences.',
    "Prefer the roles already identified in Analysis. Include a public/guest role ONLY if the website has pages reachable without authentication; otherwise omit it. Each role must list the concrete pages it needs.",
    "Use short English names for roles and pages. Keep it focused (<= 80 roles, <= 80 pages each).",
  ].join("\n");

  const prompt = [
    `Project: ${project.name}. ${project.description ?? ""}`.trim(),
    project.scopeRequirements ? `Scope/requirements: ${project.scopeRequirements}` : "",
    project.uiPreferences ? `Visual preferences: ${project.uiPreferences}` : "",
    knownRoles.length > 0
      ? `User roles already identified in Analysis: ${knownRoles.join(", ")}.`
      : "No roles identified yet — infer them from the project.",
    uiDesign.length > 0
      ? `Existing UI plan notes:\n- ${uiDesign.join("\n- ")}`
      : "",
    previous.roles.length > 0
      ? `Previous plan roles: ${previous.roles.map((r) => r.name).join(", ")}. Keep roles stable unless the scope changed.`
      : "",
    "Return the design plan JSON now.",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const resolved = await resolveUserModel(session.user.id);
    const { text, usage } = await generateText({
      model: resolved.model,
      system,
      prompt,
      temperature: Math.min(resolved.temperature ?? 0.4, 1),
      maxOutputTokens: resolved.maxTokens ?? 8192,
      maxRetries: 3,
      abortSignal: AbortSignal.timeout(120_000),
    });
    await recordAiUsage({
      userId: session.user.id,
      projectId: id,
      source: "design-plan",
      providerCode: resolved.providerCode,
      modelName: resolved.modelName,
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
    });

    const extracted = extractJson(text);
    const next = normalizePlan(extracted);
    if (next.roles.length === 0) throw new EmptyModelOutputError();

    const plan: DesignPlan = {
      ...next,
      version: previous.version + 1,
      updatedAt: new Date().toISOString(),
    };
    const saved = await persistPlan(id, session.user.id, plan);
    // Return the effective plan so Analysis roles stay connected to the Studio.
    const merged = effectiveDesignPlan({
      analysis: { roles: knownRoles },
      design: { uiPlan: saved },
    });
    return NextResponse.json({ ok: true, plan: merged });
  } catch (err) {
    const classified = classifyProviderError(err);
    if (classified) {
      return NextResponse.json(
        { error: classified.code, message: classified.message },
        { status: classified.status },
      );
    }
    console.error("[api/projects/[id]/design/plan]", err);
    return NextResponse.json({ error: "Failed to generate plan." }, { status: 500 });
  }
}

/** Saves a user-edited plan and bumps the version (marks prior screens stale). */
export async function PATCH(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/design/plan");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const parsed = saveSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previous = readPlan(project.globalSpec);
  const next = normalizePlan(parsed.data.plan);
  const plan: DesignPlan = {
    ...next,
    version: previous.version + 1,
    updatedAt: new Date().toISOString(),
  };
  const saved = await persistPlan(id, session.user.id, plan);
  return NextResponse.json({ ok: true, plan: saved });
}
