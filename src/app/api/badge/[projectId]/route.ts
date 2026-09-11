import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectScore } from "@/lib/project-stats";

interface RouteProps {
  params: Promise<{ projectId: string }>;
}

/** Public, read-only project badge data for shareable compliance badges. */
export async function GET(_request: Request, { params }: RouteProps) {
  const { projectId } = await params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { projectStages: true },
  });
  // A badge is public only when the owner opted in (`badgePublic`) AND the
  // project is completed.
  if (!project || project.status !== "completed" || !project.badgePublic) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      ok: true,
      project: {
        name: project.name,
        version: project.currentVersion,
        status: project.status,
        securityScore: getProjectScore(project),
        stageProgress: project.projectStages.filter((s) => s.status === "completed").length,
        stageCount: project.projectStages.length,
        updatedAt: project.updatedAt.toISOString(),
        framework: "NIST SP 800-218 -> ISO 27001:2022 (concept)",
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    },
  );
}
