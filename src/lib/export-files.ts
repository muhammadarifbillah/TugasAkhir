import { prisma } from "@/lib/prisma";
import { filterSafeArtifacts } from "@/lib/artifact-paths";
import {
  buildComplianceReport,
  buildManualBook,
  buildReadme,
  buildSecurityWorkflowYaml,
  buildTraceabilityMatrix,
} from "@/lib/docs";

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
      requirements: {
        include: {
          nistControl: true,
          links: {
            include: { recommendation: { include: { nistControl: true } } },
          },
        },
      },
    },
  });
  if (!project || project.userId !== userId) {
    throw new Error("Project not found or forbidden.");
  }

  const codeArtifacts = (project.globalSpec as Record<string, unknown> | null)?.codeArtifacts as
    | Record<string, string>
    | undefined;

  // Defense in depth: rows written before path validation existed may still hold
  // traversing names, so drop anything unsafe before it reaches a ZIP or a git tree.
  const { files: safeArtifacts, rejected } = filterSafeArtifacts(codeArtifacts ?? {});
  if (rejected.length > 0) {
    console.warn(
      `[export] Skipped ${rejected.length} unsafe artifact path(s): ${rejected.join(", ")}`,
    );
  }

  const files: Record<string, string> = { ...safeArtifacts };
  files["README.md"] = buildReadme(project);
  files["docs/MANUAL-BOOK.md"] = buildManualBook(project);
  files["docs/ISO-27001-COMPLIANCE.md"] = buildComplianceReport(project);
  files["docs/TRACEABILITY-MATRIX.md"] = buildTraceabilityMatrix({
    name: project.name,
    currentVersion: project.currentVersion,
    requirements: project.requirements,
  });
  files[".github/workflows/security.yml"] = buildSecurityWorkflowYaml();
  files[".env.example"] = files[".env.example"] ?? "# Copy to .env and set your secrets\nDATABASE_URL=postgresql://user:pass@localhost:5432/db\n";

  return { project, files };
}