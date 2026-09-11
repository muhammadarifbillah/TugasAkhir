import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { buildProjectFiles } from "@/lib/export-files";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  try {
    const { project, files } = await buildProjectFiles(projectId, session.user.id);

    // A source bundle with no code is not an export.
    if (Object.keys(files).length === 0) {
      return NextResponse.json(
        { error: "No source files yet. Run the Secure Development stage first." },
        { status: 409 },
      );
    }

    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content);
    }
    const blob = await zip.generateAsync({ type: "nodebuffer" });

    await writeAudit(session.user.id, "GENERATE_DELIVERABLE", {
      projectId,
      type: "source_code_zip",
      version: project.currentVersion,
    }, requestIp(request));

    const existing = await prisma.deliverable.findFirst({
      where: { projectId, type: "source_code_zip" },
      select: { id: true },
    });
    if (!existing) {
      await prisma.deliverable.create({
        data: {
          projectId,
          type: "source_code_zip",
          title: `Source code bundle v${project.currentVersion}`,
          version: project.currentVersion,
        },
      });
    }

    return new NextResponse(new Uint8Array(blob), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(project.name)}-${project.currentVersion}.zip`,
      },
    });
  } catch (err) {
    console.error("[api/export/zip]", err);
    return NextResponse.json(
      { error: "Export failed. The project may not be ready yet." },
      { status: 500 },
    );
  }
}
