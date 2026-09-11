import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildManualBook, buildComplianceReport } from "@/lib/docs";
import { manualBookPdfBuffer, complianceReportPdfBuffer } from "@/lib/pdf";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");
    const type = url.searchParams.get("type");
    const format = url.searchParams.get("format") ?? "md";

    if (!projectId || (type !== "manual" && type !== "iso")) {
      return NextResponse.json({ error: "projectId & type (manual|iso) required" }, { status: 400 });
    }
    if (format !== "pdf" && format !== "md") {
      return NextResponse.json({ error: "format must be pdf or md" }, { status: 400 });
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        projectStages: {
          include: { stage: true, recommendations: { include: { nistControl: true } } },
        },
      },
    });
    if (!project || project.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Exporting a half-finished project produces misleading docs.
    const allCompleted = project.projectStages.every((ps) => ps.status === "completed");
    if (!allCompleted) {
      return NextResponse.json(
        { error: "Export is available after all 5 stages are completed." },
        { status: 409 },
      );
    }

    const isManual = type === "manual";
    const filename =
      format === "pdf"
        ? isManual
          ? "MANUAL-BOOK.pdf"
          : "ISO-27001-COMPLIANCE.pdf"
        : isManual
          ? "MANUAL-BOOK.md"
          : "ISO-27001-COMPLIANCE.md";

    if (format === "pdf") {
      const buffer = isManual
        ? await manualBookPdfBuffer(project)
        : await complianceReportPdfBuffer(project);

      await writeAudit(session.user.id, "GENERATE_DELIVERABLE", {
        projectId,
        type: isManual ? "manual_book_pdf" : "iso_compliance_pdf",
        version: project.currentVersion,
      }, requestIp(request));

      await ensureDeliverable(projectId, isManual ? "manual_book_pdf" : "iso_compliance_pdf", project.currentVersion);

      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const content = isManual ? buildManualBook(project) : buildComplianceReport(project);

    await writeAudit(session.user.id, "GENERATE_DELIVERABLE", {
      projectId,
      type: isManual ? "manual_book_md" : "iso_compliance_md",
      version: project.currentVersion,
  }, requestIp(request));

    await ensureDeliverable(projectId, isManual ? "manual_book_md" : "iso_compliance_md", project.currentVersion);

    return new NextResponse(content, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/export/doc]", err);
    return NextResponse.json(
      { error: "Export failed. The project may not be ready yet." },
      { status: 500 },
    );
  }
}

async function ensureDeliverable(
  projectId: string,
  type: "manual_book_pdf" | "manual_book_md" | "iso_compliance_pdf" | "iso_compliance_md",
  version: string,
) {
  const existing = await prisma.deliverable.findFirst({
    where: { projectId, type },
    select: { id: true },
  });
  if (!existing) {
    await prisma.deliverable.create({
      data: {
        projectId,
        type,
        title: `${type.replaceAll("_", " ")} v${version}`,
        version,
      },
    });
  }
}
