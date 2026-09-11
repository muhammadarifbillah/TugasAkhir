import { z } from "zod";
import type {
  Prisma,
  RecommendationCategory,
  Severity,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const recommendationSchema = z.object({
  category: z.string().optional(),
  severity: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  suggestedCode: z.string().optional(),
  nistTask: z.string().optional(),
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
    codeArtifacts: z.record(z.string()).optional(),
    fixedArtifacts: z.record(z.string()).optional(),
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
  const parsed = extractJson(text);
  if (!parsed) return null;
  const validated = stageResultSchema.safeParse(parsed);
  return validated.success ? validated.data : null;
}

async function lookupNistIds(taskCodes: string[]): Promise<Map<string, number>> {
  const unique = [...new Set(taskCodes.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const rows = await prisma.nistSsdfControl.findMany({
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
}

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
 */
export async function persistStageResult(input: {
  projectStageId: string;
  userId: string;
  result: StageResult;
}): Promise<PersistedResult> {
  const { result } = input;
  const projectStage = await prisma.projectStage.findUnique({
    where: { id: input.projectStageId },
    include: { stage: true, project: true },
  });
  if (!projectStage || projectStage.project.userId !== input.userId) {
    throw new Error("Project stage not found or forbidden.");
  }
  const project = projectStage.project;
  const globalSpec = (project.globalSpec as Record<string, unknown> | null) ?? {};
  const codeArtifacts =
    (globalSpec.codeArtifacts as Record<string, string> | null) ?? null;

  const newArtifacts: Record<string, string> = {};
  if (result.codeArtifacts) {
    for (const [path, content] of Object.entries(result.codeArtifacts)) {
      newArtifacts[path] = content;
    }
  }

  let snapshotSaved = false;
  if (Object.keys(newArtifacts).length > 0) {
    const merged = { ...(codeArtifacts ?? {}), ...newArtifacts };
    await prisma.websiteSnapshot.create({
      data: {
        projectStageId: projectStage.id,
        version: project.currentVersion,
        codeArtifacts: merged,
        diffSummary: result.summary ?? `Stage ${projectStage.stage.code} update`,
      },
    });
    snapshotSaved = true;

    await prisma.project.update({
      where: { id: project.id },
      data: {
        globalSpec: {
          ...globalSpec,
          codeArtifacts: merged,
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // Keep stage progress separate from the AI security score.
  const securityScore =
    result.securityScore === undefined
      ? undefined
      : Math.max(0, Math.min(100, Math.round(result.securityScore)));

  if (projectStage.stage.code === "analysis" && result.recommendedStack) {
    await prisma.project.update({
      where: { id: project.id },
      data: {
        languagePlan: {
          recommendedStack: result.recommendedStack,
          securityRequirements: result.securityRequirements ?? [],
          decidedByUser: false,
        },
      },
    });
  }

  // Persist stage-specific knowledge into the cross-stage context.
  const stageKnowledge: Record<string, unknown> = {};
  if (result.summary) stageKnowledge.summary = result.summary;
  if (projectStage.stage.code === "analysis") {
    stageKnowledge.recommendedStack = result.recommendedStack ?? null;
    stageKnowledge.securityRequirements = result.securityRequirements ?? [];
    stageKnowledge.dataClassification = result.dataClassification ?? [];
  }
  if (projectStage.stage.code === "design" && result.uiDesign) {
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
    // Re-read the project so the earlier codeArtifacts update is not
    // overwritten by a stale in-memory copy of globalSpec.
    const freshProject = await prisma.project.findUnique({
      where: { id: project.id },
    });
    const freshSpec =
      (freshProject?.globalSpec as Record<string, unknown> | null) ?? {};
    await prisma.project.update({
      where: { id: project.id },
      data: {
        globalSpec: {
          ...freshSpec,
          [projectStage.stage.code]: {
            ...((freshSpec[projectStage.stage.code] as Record<string, unknown>) ?? {}),
            ...stageKnowledge,
          },
        } as unknown as Prisma.InputJsonValue,
      },
    });
  }

  const recs = result.recommendations ?? [];
  const taskCodes = recs.map((r) => r.nistTask ?? "").filter(Boolean);
  const nistMap = await lookupNistIds(taskCodes);

  const assistantMessage = await prisma.message.findFirst({
    where: { chat: { projectStageId: projectStage.id }, role: "assistant" },
    orderBy: { createdAt: "desc" },
  });

  let recommendationsSaved = 0;
  if (recs.length > 0) {
    if (assistantMessage) {
      // Avoid duplicates when the same assistant message is parsed again
      // (reparse, repeated runs): replace instead of appending.
      await prisma.aiRecommendation.deleteMany({
        where: {
          projectStageId: projectStage.id,
          originMessageId: assistantMessage.id,
        },
      });
    }
    await prisma.aiRecommendation.createMany({
      data: recs.map((r) => ({
        projectStageId: projectStage.id,
        originMessageId: assistantMessage?.id ?? null,
        category: normalizeCategory(r.category ?? "compliance"),
        severity: normalizeSeverity(r.severity),
        nistControlId: r.nistTask ? nistMap.get(r.nistTask) ?? null : null,
        title: r.title ?? r.threat ?? "Recommendation",
        content: r.content ?? r.description ?? r.mitigation ?? r.fix ?? "",
        suggestedCode: r.suggestedCode ?? null,
        filePath: r.file ?? null,
      })),
    });
    recommendationsSaved = recs.length;
  }

  const created = await prisma.aiRecommendation.findMany({
    where: {
      projectStageId: projectStage.id,
      originMessageId: assistantMessage?.id ?? "__none__",
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
  }));

  return {
    securityScore:
      securityScore === undefined ? null : Math.max(0, Math.min(100, Math.round(securityScore))),
    recommendationsSaved,
    snapshotSaved,
    recommendations,
  };
}
