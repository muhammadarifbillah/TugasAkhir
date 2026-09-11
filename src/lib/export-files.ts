import { prisma } from "@/lib/prisma";
import { buildComplianceReport, buildManualBook, buildReadme, buildSecurityWorkflowYaml } from "@/lib/docs";

/**
 * Loads a project (ownership-checked) and assembles the full exportable file set:
 * generated source + README + Manual Book + ISO compliance report + DevSecOps pipeline.
 */
export async function buildProjectFiles(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      projectStages: {
        include: { stage: true, recommendations: { include: { nistControl: true } } },
      },
    },
  });
  if (!project || project.userId !== userId) {
    throw new Error("Project not found or forbidden.");
  }

  const codeArtifacts = (project.globalSpec as Record<string, unknown> | null)?.codeArtifacts as
    | Record<string, string>
    | undefined;

  const files: Record<string, string> = { ...(codeArtifacts ?? {}) };
  files["README.md"] = buildReadme(project);
  files["docs/MANUAL-BOOK.md"] = buildManualBook(project);
  files["docs/ISO-27001-COMPLIANCE.md"] = buildComplianceReport(project);
  files[".github/workflows/security.yml"] = buildSecurityWorkflowYaml();
  files[".env.example"] = files[".env.example"] ?? "# Copy to .env and set your secrets\nDATABASE_URL=postgresql://user:pass@localhost:5432/db\n";

  return { project, files };
}