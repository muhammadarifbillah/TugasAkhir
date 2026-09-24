import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { rateLimited } from "@/lib/rate-limit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { prisma } from "@/lib/prisma";
import { startRun, stopRun } from "@/lib/runner/session";

interface RouteProps {
  params: Promise<{ projectId: string }>;
}

async function ownedProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== userId) return null;
  return project;
}

export async function POST(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/run/[projectId]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (rateLimited(`run:${session.user.id}`, 20)) {
    return NextResponse.json({ error: "Too many run requests. Slow down." }, { status: 429 });
  }

  const { projectId } = await params;
  const project = await ownedProject(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const files =
    ((project.globalSpec as Record<string, unknown> | null)?.codeArtifacts as
      | Record<string, string>
      | null) ?? {};
  if (Object.keys(files).length === 0) {
    return NextResponse.json({ error: "No generated code to run yet." }, { status: 400 });
  }

  try {
    const result = await startRun(projectId, session.user.id, files);
    await writeAudit(session.user.id, "RUN_APP", { projectId, stack: result.stackId }, requestIp(request));
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start the app";
    if (message === "UNSUPPORTED_STACK") {
      return NextResponse.json(
        { error: "Unsupported stack. Ask the AI to add .securesdlc/run.json." },
        { status: 400 },
      );
    }
    if (message === "TOO_MANY_RUNS") {
      return NextResponse.json(
        { error: "Too many apps are running at once (max 2). Stop one before starting another." },
        { status: 409 },
      );
    }
    console.error("[api/run] start", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/run/[projectId]");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await ownedProject(projectId, session.user.id);
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await stopRun(projectId);
  await writeAudit(session.user.id, "STOP_APP", { projectId }, requestIp(request));
  return NextResponse.json({ ok: true });
}
