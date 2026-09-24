import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRunStatus } from "@/lib/runner/session";

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

  const status = await getRunStatus(projectId);
  if (!status) {
    return NextResponse.json({ status: "stopped" });
  }
  return NextResponse.json(status);
}
