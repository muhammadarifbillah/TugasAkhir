import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { STAGE_DEFINITIONS } from "@/lib/stages";
import { locales } from "@/lib/i18n";
import { recommendStackForProject } from "@/lib/ai/recommend-stack";

const ALLOWED_TEMPLATES = new Set(["custom", "e-commerce", "saas", "rest-api", "lms"]);

/** Languages a generated website / its documentation may be written in. */
export const OUTPUT_LANGUAGES = [...locales] as readonly string[];

export async function POST(request: Request) {
  // CSRF validation
  const csrfError = await validateCsrfRequest(request, "/api/projects");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`project:${session.user.id}`, 10)) {
    return NextResponse.json({ error: "Too many project creations. Slow down." }, { status: 429 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    template?: string;
    scopeRequirements?: string;
    uiPreferences?: string;
    outputLanguage?: string;
  };

  const name = body.name?.trim();
  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Project name is required (max 120 chars)" }, { status: 400 });
  }
  if (body.template && !ALLOWED_TEMPLATES.has(body.template)) {
    return NextResponse.json({ error: "Invalid template." }, { status: 400 });
  }

  const stages = await prisma.stage.findMany({
    where: { code: { in: STAGE_DEFINITIONS.map((s) => s.code) } },
    select: { id: true, code: true, orderIndex: true },
  });
  if (stages.length !== STAGE_DEFINITIONS.length) {
    return NextResponse.json(
      { error: "Stage master data not seeded. Run `npm run db:seed`." },
      { status: 500 },
    );
  }

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        userId: session.user.id,
        name,
        description: body.description?.slice(0, 2000) ?? null,
        template: body.template ?? "custom",
        scopeRequirements: body.scopeRequirements?.slice(0, 10000) ?? null,
        uiPreferences: body.uiPreferences?.slice(0, 10000) ?? null,
        outputLanguage:
          body.outputLanguage && OUTPUT_LANGUAGES.includes(body.outputLanguage)
            ? body.outputLanguage
            : "en",
        status: "in_progress",
        currentStageIndex: 0,
        globalSpec: {},
        projectStages: {
          create: stages.map((s) => ({
            stageId: s.id,
            status: "not_started",
          })),
        },
      },
      include: { projectStages: true },
    });
    return created;
  });

  await writeAudit(session.user.id, "CREATE_PROJECT", { projectId: project.id }, requestIp(request));

  // Workstream A: kick off the background stack recommendation so the studio
  // has a languagePlan ready even before the first chat turn. `after()` keeps
  // the work alive past the response (unlike a detached promise).
  after(() => {
    void recommendStackForProject(project.id);
  });

  return NextResponse.json({ project }, { status: 201 });
}
