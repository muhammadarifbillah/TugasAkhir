import { z } from "zod";
import type {
  Prisma,
  RecommendationCategory,
  Severity,
} from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requirementIdFor } from "@/lib/requirement-id";
import {
  findArtifactProblems,
  MAX_MODEL_OUTPUT_CHARS,
} from "@/lib/artifact-paths";

/**
 * Model-supplied file maps must not contain traversing or absolute paths and
 * must stay within size limits (see lib/artifact-paths).
 */
const artifactRecordSchema = z
  .record(z.string())
  .refine((value) => findArtifactProblems(value).length === 0, {
    message: "code artifacts contain unsafe paths or exceed the size limits",
  });

export const recommendationSchema = z.object({
  category: z.string().optional(),
  severity: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  suggestedCode: z.string().optional(),
  nistTask: z.string().optional(),
  requirementIds: z.array(z.string()).optional(),
  file: z.string().optional(),
  description: z.string().optional(),
  fix: z.string().optional(),
  threat: z.string().optional(),
  likelihood: z.string().optional(),
  impact: z.string().optional(),
  mitigation: z.string().optional(),
});

export const stageResultSchema = z
  .object({
    summary: z.string().optional(),
    recommendedStack: z.any().optional(),
    securityRequirements: z.array(z.string()).optional(),
    dataClassification: z.array(z.string()).optional(),
    uiDesign: z.array(z.string()).optional(),
    architecture: z.array(z.string()).optional(),
    threatModel: z.array(recommendationSchema).optional(),
    databaseSchema: z.array(z.string()).optional(),
    erdDiagram: z.string().optional(),
    authFlowDiagram: z.string().optional(),
    mermaid: z.array(z.string()).optional(),
    codeArtifacts: artifactRecordSchema.optional(),
    fixedArtifacts: artifactRecordSchema.optional(),
    findings: z.array(recommendationSchema).optional(),
    securityScore: z.number().optional(),
    manualBook: z.string().optional(),
    complianceReport: z.string().optional(),
    releaseChecklist: z.array(z.string()).optional(),
    recommendations: z.array(recommendationSchema).optional(),
  })
  .passthrough();

export type StageResult = z.infer<typeof stageResultSchema>;

export const planActionSchema = z.object({
  step: z.number(),
  description: z.string(),
  files: z.array(z.string()),
  impact: z.string(),
  subStep: z.string().optional(),
});

export const planResultSchema = z.object({
  type: z.literal("plan"),
  actions: z.array(planActionSchema),
  summary: z.string(),
  warnings: z.array(z.string()).optional(),
  estimatedSubSteps: z.array(z.string()),
});

export type PlanAction = z.infer<typeof planActionSchema>;
export type PlanResult = z.infer<typeof planResultSchema>;

const CATEGORIES = new Set(["stack", "architecture", "secure_coding", "vulnerability", "compliance"]);
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);

/**
 * Escapes raw control characters (LF/CR/TAB) that models sometimes emit
 * inside JSON string literals, so the response can still be parsed.
 * Returns null when there is no usable `{...}` region or no repair was needed.
 */
function repairControlCharsInStrings(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = start; i <= end; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
      } else if (ch === "\\") {
        out += ch;
        escaped = true;
      } else if (ch === '"') {
        out += ch;
        inString = false;
      } else if (ch === "\n") {
        out += "\\n";
      } else if (ch === "\r") {
        out += "\\r";
      } else if (ch === "\t") {
        out += "\\t";
      } else {
        out += ch;
      }
      continue;
    }
    if (ch === '"') inString = true;
    out += ch;
  }
  if (!inString && out !== text.slice(start, end + 1)) return out;
  return null;
}

/** Robust JSON extraction from model output. */
export function extractJson(text: string): unknown | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }
  // Fenced output (```json ... ```) — models may embed ``` inside string
  // values, so anchor on the LAST fence instead of the first.
  if (trimmed.startsWith("```")) {
    const fenceEnd = trimmed.lastIndexOf("```");
    if (fenceEnd > 3) {
      const inner = trimmed.slice(trimmed.indexOf("\n") + 1, fenceEnd).trim();
      try {
        return JSON.parse(inner);
      } catch {
        /* continue */
      }
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const region = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(region);
    } catch {
      const repaired = repairControlCharsInStrings(region);
      if (repaired) {
        try {
          return JSON.parse(repaired);
        } catch {
          return null;
        }
      }
      return null;
    }
  }
  return null;
}

export function normalizeCategory(value: string): RecommendationCategory {
  return (CATEGORIES.has(value) ? value : "compliance") as RecommendationCategory;
}

export function normalizeSeverity(value: string | undefined): Severity {
  return (value && SEVERITIES.has(value) ? value : "medium") as Severity;
}

export function parseStageResult(text: string): StageResult | null {
  // Refuse to parse implausibly large payloads before allocating anything else.
  if (text.length > MAX_MODEL_OUTPUT_CHARS) {
    console.warn(
      `[ai/result] Discarding oversized model output: ${text.length} chars > ${MAX_MODEL_OUTPUT_CHARS}`,
    );
    return null;
  }
  const parsed = extractJson(text);
  if (!parsed) return null;
  const validated = stageResultSchema.safeParse(parsed);
  if (!validated.success) {
    // Surface WHY a structured response was rejected; otherwise a rejected
    // artifact path looks identical to a malformed response.
    const first = validated.error.issues[0];
    console.warn(
      `[ai/result] Stage result rejected at ${first?.path.join(".") || "<root>"}: ${first?.message}`,
    );
    return null;
  }
  return validated.data;
}

async function lookupNistIds(
  taskCodes: string[],
  client: DbClient = prisma,
): Promise<Map<string, number>> {
  const unique = [...new Set(taskCodes.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await client.nistSsdfControl.findMany({
    where: { taskCode: { in: unique } },
    select: { id: true, taskCode: true },
  });
  return new Map(rows.map((r) => [r.taskCode, r.id]));
}

export interface PersistedRecommendation {
  id: string;
  category: RecommendationCategory;
  severity: Severity;
  title: string;
  content: string;
  suggestedCode: string | null;
  filePath: string | null;
  isApplied: boolean;
  nistTask: string | null;
  isoMappings: string[];
  requirementIds: string[];
}

/** Either the base client or an interactive-transaction client. */
type DbClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends"
>;

export interface PersistedResult {
  securityScore: number | null;
  recommendationsSaved: number;
  snapshotSaved: boolean;
  recommendations: PersistedRecommendation[];
}

/**
 * Persists a parsed stage result: code artifacts (merged, without applying
 * `fixedArtifacts`), snapshot, language plan, cross-stage knowledge, and
 * recommendations. Reused by live chat turns and the "reparse" endpoint.
 *
 * The whole write runs in one transaction and takes a row lock on the project
 * first: `globalSpec` is read-modify-written, so two concurrent turns would
 * otherwise silently drop each other's artifacts or stage knowledge.
 */
export async function persistStageResult(input: {
  projectStageId: string;
  userId: string;
  result: StageResult;
}): Promise<PersistedResult> {
  const { result } = input;

  const projectStage = await prisma.projectStage.findUnique({
    where: { id: input.projectStageId },
    include: { stage: true },
  });
  if (!projectStage) {
    throw new Error("Project stage not found or forbidden.");
  }
  const stageCode = projectStage.stage.code;

  // Keep stage progress separate from the AI security score.
  const securityScore =
    result.securityScore === undefined
      ? undefined
      : Math.max(0, Math.min(100, Math.round(result.securityScore)));

  const newArtifacts: Record<string, string> = { ...(result.codeArtifacts ?? {}) };
  const recs = result.recommendations ?? [];
  const nistMap = await lookupNistIds(recs.map((r) => r.nistTask ?? "").filter(Boolean));

  return prisma.$transaction(async (tx) => {
    // Lock the project row so a concurrent persist cannot interleave its
    // read-modify-write of globalSpec with ours.
    const locked = await tx.$queryRaw<{ id: string; userId: string }[]>`
      SELECT "id", "userId" FROM "projects" WHERE "id" = ${projectStage.projectId} FOR UPDATE
    `;
    const owner = locked[0];
    if (!owner || owner.userId !== input.userId) {
      throw new Error("Project stage not found or forbidden.");
    }

    // Read fresh, inside the transaction and after the lock.
    const project = await tx.project.findUniqueOrThrow({
      where: { id: projectStage.projectId },
    });

    const globalSpec = (project.globalSpec as Record<string, unknown> | null) ?? {};
    const existingArtifacts =
      (globalSpec.codeArtifacts as Record<string, string> | null) ?? null;

    let snapshotSaved = false;
    if (Object.keys(newArtifacts).length > 0) {
      const merged = { ...(existingArtifacts ?? {}), ...newArtifacts };
      await tx.websiteSnapshot.create({
        data: {
          projectStageId: projectStage.id,
          version: project.currentVersion,
          codeArtifacts: merged,
          diffSummary: result.summary ?? `Stage ${stageCode} update`,
        },
      });
      snapshotSaved = true;
    }

    // Build the next globalSpec once, so there is exactly one write.
    let nextSpec: Record<string, unknown> = { ...globalSpec };
    if (Object.keys(newArtifacts).length > 0) {
      nextSpec.codeArtifacts = {
        ...(existingArtifacts ?? {}),
        ...newArtifacts,
      };
    }

    const stageKnowledge: Record<string, unknown> = {};
    if (result.summary) stageKnowledge.summary = result.summary;
    if (stageCode === "analysis") {
      stageKnowledge.recommendedStack = result.recommendedStack ?? null;
      stageKnowledge.securityRequirements = result.securityRequirements ?? [];
      stageKnowledge.requirementItems = (result.securityRequirements ?? []).map(
        (text, i) => ({ id: requirementIdFor(i), text }),
      );
      stageKnowledge.dataClassification = result.dataClassification ?? [];
    }
    if (stageCode === "design" && result.uiDesign) {
      stageKnowledge.uiDesign = result.uiDesign;
    }

    if (result.architecture) stageKnowledge.architecture = result.architecture;
    if (result.threatModel) stageKnowledge.threatModel = result.threatModel;
    if (result.databaseSchema) stageKnowledge.databaseSchema = result.databaseSchema;
    if (result.erdDiagram) stageKnowledge.erdDiagram = result.erdDiagram;
    if (result.authFlowDiagram) stageKnowledge.authFlowDiagram = result.authFlowDiagram;
    if (result.mermaid) stageKnowledge.mermaid = result.mermaid;
    if (result.findings) stageKnowledge.findings = result.findings;
    if (result.fixedArtifacts) stageKnowledge.fixedArtifacts = result.fixedArtifacts;
    if (securityScore !== undefined) stageKnowledge.securityScore = securityScore;
    if (result.manualBook) stageKnowledge.manualBook = result.manualBook;
    if (result.complianceReport) stageKnowledge.complianceReport = result.complianceReport;
    if (result.releaseChecklist) stageKnowledge.releaseChecklist = result.releaseChecklist;

    if (Object.keys(stageKnowledge).length > 0) {
      nextSpec = {
        ...nextSpec,
        [stageCode]: {
          ...((nextSpec[stageCode] as Record<string, unknown>) ?? {}),
          ...stageKnowledge,
        },
      };
    }

    await tx.project.update({
      where: { id: project.id },
      data: {
        globalSpec: nextSpec as unknown as Prisma.InputJsonValue,
        // The plan is only replaced when the model actually proposed a stack.
        ...(stageCode === "analysis" && result.recommendedStack
          ? {
              languagePlan: {
                recommendedStack: result.recommendedStack,
                securityRequirements: result.securityRequirements ?? [],
                decidedByUser: false,
              } as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
    });

    const assistantMessage = await tx.message.findFirst({
      where: { chat: { projectStageId: projectStage.id }, role: "assistant" },
      orderBy: { createdAt: "desc" },
    });

    // Traceability: resolve (and, for the analysis stage, create) the project's
    // security requirements so recommendations can be linked to what they satisfy.
    const requirementIdByReqId = new Map<string, string>();
    const existingReqs = await tx.securityRequirement.findMany({
      where: { projectId: project.id },
      select: { id: true, reqId: true },
    });
    for (const r of existingReqs) requirementIdByReqId.set(r.reqId, r.id);

    if (stageCode === "analysis") {
      const texts = (stageKnowledge.securityRequirements as string[] | undefined) ?? [];
      for (let i = 0; i < texts.length; i++) {
        const reqId = requirementIdFor(i);
        const row = await tx.securityRequirement.upsert({
          where: { projectId_reqId: { projectId: project.id, reqId } },
          update: { text: texts[i] },
          create: { projectId: project.id, reqId, text: texts[i] },
        });
        requirementIdByReqId.set(reqId, row.id);
      }
    }

    let recommendationsSaved = 0;
    if (recs.length > 0) {
      // When no assistant message exists the rows are stored with a NULL
      // originMessageId. A sentinel string can never match NULL, so the scope
      // switches to "the NULL-origin rows of this stage" instead — otherwise the
      // rows are written but reported as 0 and never read back.
      const scope = {
        projectStageId: projectStage.id,
        originMessageId: assistantMessage?.id ?? null,
      };

      if (assistantMessage) {
        // Avoid duplicates when the same assistant message is parsed again
        // (reparse, repeated runs): replace instead of appending.
        await tx.aiRecommendation.deleteMany({ where: scope });
      }

      // Create one-by-one so each row's id is available to build requirement links.
      const createdRecs: {
        id: string;
        requirementIds: string[];
        isApplied: boolean;
        filePath: string | null;
        nistControlId: number | null;
      }[] = [];
      for (const r of recs) {
        const row = await tx.aiRecommendation.create({
          data: {
            projectStageId: projectStage.id,
            originMessageId: assistantMessage?.id ?? null,
            category: normalizeCategory(r.category ?? "compliance"),
            severity: normalizeSeverity(r.severity),
            nistControlId: r.nistTask ? nistMap.get(r.nistTask) ?? null : null,
            title: r.title ?? r.threat ?? "Recommendation",
            content: r.content ?? r.description ?? r.mitigation ?? r.fix ?? "",
            suggestedCode: r.suggestedCode ?? null,
            filePath: r.file ?? null,
            requirementIds: r.requirementIds ?? [],
          },
          select: { id: true, requirementIds: true, isApplied: true, filePath: true, nistControlId: true },
        });
        createdRecs.push(row);
      }
      recommendationsSaved = createdRecs.length;

      const links = createdRecs.flatMap((rec) =>
        rec.requirementIds
          .map((reqId) => requirementIdByReqId.get(reqId))
          .filter((requirementId): requirementId is string => Boolean(requirementId))
          .map((requirementId) => ({
            requirementId,
            recommendationId: rec.id,
            filePath: rec.filePath,
            stageCode,
            status: rec.isApplied ? "implemented" : "recommended",
          })),
      );
      if (links.length > 0) {
        await tx.requirementLink.createMany({ data: links });
      }

      // Propagate the recommendation's NIST task onto the requirement so the
      // scanner can later verify the requirement against findings for that task.
      const propagated = new Map<string, number>();
      for (const rec of createdRecs) {
        if (!rec.nistControlId) continue;
        for (const reqId of rec.requirementIds) {
          const requirementId = requirementIdByReqId.get(reqId);
          if (requirementId) propagated.set(requirementId, rec.nistControlId);
        }
      }
      for (const [requirementId, nistControlId] of propagated) {
        await tx.securityRequirement.updateMany({
          where: { id: requirementId, nistControlId: null },
          data: { nistControlId },
        });
      }
    }

    const created = await tx.aiRecommendation.findMany({
      where: {
        projectStageId: projectStage.id,
        originMessageId: assistantMessage?.id ?? null,
      },
      include: { nistControl: true },
      orderBy: { createdAt: "desc" },
    });

    const recommendations: PersistedRecommendation[] = created.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      title: r.title,
      content: r.content,
      suggestedCode: r.suggestedCode,
      filePath: r.filePath,
      isApplied: r.isApplied,
      nistTask: r.nistControl?.taskCode ?? null,
      isoMappings: (r.nistControl?.iso27001Mapping as string[] | null) ?? [],
      requirementIds: r.requirementIds,
    }));

    return {
      securityScore: securityScore ?? null,
      recommendationsSaved,
      snapshotSaved,
      recommendations,
    };
  });
}
