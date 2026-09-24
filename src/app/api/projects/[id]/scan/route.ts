import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { validateCsrfRequest } from "@/lib/validate-csrf";
import { rateLimited } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import { scanProjectArtifacts } from "@/lib/scanner/run";
import { severityCounts } from "@/lib/scanner/score";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/** Returns the most recent persisted findings and scan summary for a project. */
export async function GET(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    select: { userId: true, globalSpec: true },
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const findings = await prisma.securityFinding.findMany({
    where: { projectId: id },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const testing = ((project.globalSpec as Record<string, unknown> | null)?.testing as
    | Record<string, unknown>
    | null) ?? {};

  return NextResponse.json({
    findings,
    score: typeof testing.securityScore === "number" ? testing.securityScore : null,
    scan: testing.scan ?? null,
  });
}

/**
 * Runs the real scanner suite (Semgrep + Trivy + dependency audit) against the
 * project's generated source, persists the findings and stores the deterministic
 * security score in `globalSpec.testing.securityScore`.
 */
export async function POST(request: Request, { params }: RouteProps) {
  const csrfError = await validateCsrfRequest(request, "/api/projects/[id]/scan");
  if (csrfError) return csrfError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scanning spawns containers, so keep the budget tight per user.
  if (rateLimited(`scan:${session.user.id}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many scans. Try again in a minute." }, { status: 429 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const globalSpec = (project.globalSpec as Record<string, unknown> | null) ?? {};
  const codeArtifacts = (globalSpec.codeArtifacts as Record<string, string> | null) ?? {};
  if (Object.keys(codeArtifacts).length === 0) {
    return NextResponse.json(
      { error: "No source code to scan yet. Generate code in the Development stage first." },
      { status: 409 },
    );
  }

  const report = await scanProjectArtifacts(codeArtifacts);
  const counts = severityCounts(report.findings);

  const nextSpec: Record<string, unknown> = {
    ...globalSpec,
    testing: {
      ...((globalSpec.testing as Record<string, unknown> | null) ?? {}),
      securityScore: report.score,
      scan: {
        scannedAt: new Date().toISOString(),
        toolsRun: report.toolsRun,
        toolsSkipped: report.toolsSkipped,
        counts,
        findingCount: report.findings.length,
        durationMs: report.durationMs,
      },
    },
  };

  await prisma.$transaction([
    prisma.securityFinding.deleteMany({ where: { projectId: id } }),
    prisma.securityFinding.createMany({
      data: report.findings.map((f) => ({
        projectId: id,
        tool: f.tool,
        ruleId: f.ruleId,
        severity: f.severity,
        title: f.title,
        description: f.description,
        filePath: f.filePath,
        line: f.line,
        cwe: f.cwe,
        owasp: f.owasp,
        nistTask: f.nistTask,
        isoControls: f.isoControls,
        raw: f.raw as Prisma.InputJsonValue,
      })),
    }),
    prisma.project.update({
      where: { id },
      data: { globalSpec: nextSpec as unknown as Prisma.InputJsonValue },
    }),
  ]);

  await writeAudit(session.user.id, "RUN_SCAN", {
    projectId: id,
    score: report.score,
    findingCount: report.findings.length,
    toolsRun: report.toolsRun,
    toolsSkipped: report.toolsSkipped.map((t) => t.tool),
  }, requestIp(request));

  return NextResponse.json({
    score: report.score,
    counts,
    findings: report.findings,
    toolsRun: report.toolsRun,
    toolsSkipped: report.toolsSkipped,
    durationMs: report.durationMs,
  });
}
