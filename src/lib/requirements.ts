import { prisma } from "@/lib/prisma";
import { requirementIdFor } from "@/lib/requirement-id";

export { requirementIdFor } from "@/lib/requirement-id";

/**
 * Backfills SecurityRequirement rows from the security requirements already
 * stored in `globalSpec.analysis.securityRequirements`. Projects created before
 * the traceability feature have those strings but no requirement rows, so their
 * matrix would otherwise stay empty. Idempotent (upserts by projectId + reqId).
 */
export async function backfillProjectRequirements(projectId: string): Promise<number> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { globalSpec: true },
  });
  if (!project) return 0;

  const globalSpec = (project.globalSpec as Record<string, unknown> | null) ?? {};
  const analysis = (globalSpec.analysis as Record<string, unknown> | null) ?? {};
  const texts = Array.isArray(analysis.securityRequirements)
    ? (analysis.securityRequirements as unknown[]).filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    : [];
  if (texts.length === 0) return 0;

  let created = 0;
  for (let i = 0; i < texts.length; i++) {
    const reqId = requirementIdFor(i);
    const existing = await prisma.securityRequirement.findUnique({
      where: { projectId_reqId: { projectId, reqId } },
      select: { id: true, text: true },
    });
    if (existing) {
      if (existing.text !== texts[i]) {
        await prisma.securityRequirement.update({ where: { id: existing.id }, data: { text: texts[i] } });
      }
      continue;
    }
    await prisma.securityRequirement.create({ data: { projectId, reqId, text: texts[i] } });
    created++;
  }
  return created;
}
