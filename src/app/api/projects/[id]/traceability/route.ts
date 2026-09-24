import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { buildTraceabilityRows } from "@/lib/docs";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/** Returns the requirement → NIST/ISO → file traceability matrix for the UI. */
export async function GET(_request: Request, { params }: RouteProps) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      requirements: {
        include: {
          nistControl: true,
          links: { include: { recommendation: { include: { nistControl: true } } } },
        },
      },
    },
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rows = buildTraceabilityRows(project.requirements);
  const summary = {
    total: rows.length,
    implemented: rows.filter((r) => r.status === "Implemented").length,
    partial: rows.filter((r) => r.status === "Partial").length,
    gap: rows.filter((r) => r.status === "Gap").length,
    issue: rows.filter((r) => r.status === "Issue").length,
  };

  return NextResponse.json({ rows, summary });
}
