import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/runner/session";
import { containerLogs } from "@/lib/runner/docker";

interface RouteProps {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await params;
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const runSession = getSession(projectId);
  if (!runSession) {
    return NextResponse.json({ logs: "" });
  }
  const logs = await containerLogs(runSession.containerName, 300);
  return NextResponse.json({ logs });
}
