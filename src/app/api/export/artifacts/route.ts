import { NextResponse } from "next/server";
import JSZip from "jszip";
import { auth } from "@/auth";
import { requestIp, writeAudit } from "@/lib/audit";
import { prisma } from "@/lib/prisma";

/** Downloads the current generated source artifacts as a ZIP (pre-handover). */
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { userId: true, name: true, currentVersion: true, globalSpec: true },
  });
  if (!project || project.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const artifacts = (project.globalSpec as Record<string, unknown> | null)?.codeArtifacts as
      | Record<string, string>
      | null;

    const zip = new JSZip();
    for (const [path, content] of Object.entries(artifacts ?? {})) {
      zip.file(path, content);
    }
    const blob = await zip.generateAsync({ type: "nodebuffer" });

    await writeAudit(session.user.id, "GENERATE_DELIVERABLE", {
      projectId,
      deliverable: "artifacts-zip",
      version: project.currentVersion,
    }, requestIp(request));

    return new NextResponse(new Uint8Array(blob), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
          project.name,
        )}-${project.currentVersion}-artifacts.zip`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/export/artifacts]", err);
    return NextResponse.json(
      { error: "Artifact export failed. The project may not be ready yet." },
      { status: 500 },
    );
  }
}
