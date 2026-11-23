"use client";

import {
  BookOpen,
  Bug,
  ClipboardCheck,
  Database,
  FileCode2,
  FileText,
  GitBranch,
  GitPullRequestArrow,
  Layout,
  Lightbulb,
  Lock,
  Network,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { JsonTree } from "@/components/ui/json-tree";
import { Markdown } from "@/components/ui/markdown";
import { DesignScreen } from "@/components/studio/design-screen";
import { MermaidDiagram } from "@/components/studio/mermaid-diagram";
import type { VisualCardDef } from "@/components/studio/step-result-dialog";
import {
  CodeFileList,
  DataClassificationTable,
  EmptyResult,
  FindingsView,
  NumberedList,
  OverviewSummary,
  RecommendationList,
  ScoreSummary,
  ThreatModelView,
  type RecommendationRow,
} from "@/components/studio/studio-views";
import { erdCardinalitySummary, generateErdFromSchema } from "@/lib/erd";
import { fmt } from "@/lib/format";
import type { DesignScreen as DesignScreenType } from "@/lib/design";
import type { Dictionary } from "@/lib/i18n";

export interface StepResultContent {
  title: string;
  overview: React.ReactNode;
  visual: React.ReactNode;
  raw: React.ReactNode;
  visualCards?: VisualCardDef[];
}

export interface StepResultContext {
  dict: Dictionary;
  stageCode: string;
  /** Localised sub-step label. */
  label: string;
  analysisInfo: {
    recommendedStack: Record<string, unknown> | null;
    securityRequirements: string[];
    summary: string;
  } | null;
  dataClassification: string[];
  recommendations: RecommendationRow[];
  designScreens: DesignScreenType[];
  uiDesign: string[];
  architecture: string[];
  threatModel: Record<string, unknown>[];
  diagrams: string[];
  databaseSchema: string[];
  erdDiagram: string;
  authFlowDiagram: string;
  codeArtifacts: Record<string, string> | null;
  testingFindings: Record<string, unknown>[];
  testingFixedArtifacts: Record<string, string> | null;
  score: number | null;
  handoverManualBook: string;
  handoverComplianceReport: string;
  handoverReleaseChecklist: string[];
  onOpenFile?: (path: string) => void;
}

/** Generate a simple Mermaid auth-flow sequenceDiagram from architecture text. */
export function generateAuthFlowFromArchitecture(architecture: string[]): string | null {
  const joined = architecture.join("\n").toLowerCase();
  const hasAuth = /\b(auth|autentikasi|jwt|oauth|session|token|login|ssn|mfa)\b/.test(joined);
  if (!hasAuth) return null;

  const hasMfa = /\b(mfa|totp|two.?factor|authenticator)\b/.test(joined);
  const hasRefresh = /\b(refresh\s*token|dual.?token)\b/.test(joined);

  const lines: string[] = [
    "sequenceDiagram",
    "    actor User as User",
    "    participant FE as Frontend",
    "    participant BE as API Gateway",
    "    participant DB as Database",
    "",
    "    User->>FE: Login (credentials)",
    "    FE->>BE: POST /auth/login",
    "    BE->>DB: Validate credentials",
    "    DB-->>BE: Valid",
  ];

  if (hasMfa) {
    lines.push("    BE->>FE: Request MFA code (TOTP)");
    lines.push("    FE->>BE: Submit MFA code");
    lines.push("    BE->>DB: Verify TOTP");
    lines.push("    DB-->>BE: Verified");
  }

  if (hasRefresh) {
    lines.push("    BE-->>FE: Access Token + Refresh Token");
    lines.push("    Note over FE,BE: Access Token (15min, in-memory)");
    lines.push("    Note over FE,BE: Refresh Token (7d, HttpOnly Cookie)");
  } else {
    lines.push("    BE-->>FE: JWT Token");
  }

  lines.push("    FE-->>User: Authenticated");
  lines.push("");
  lines.push("    User->>FE: Access protected resource");
  lines.push(hasRefresh ? "    FE->>BE: API request + Access Token" : "    FE->>BE: API request + JWT");
  lines.push("    BE->>DB: Validate token / session");
  lines.push("    DB-->>BE: Authorized");
  lines.push("    BE-->>FE: Resource data");
  lines.push("    FE-->>User: Display resource");

  return lines.join("\n");
}

/** Source files relevant to a development/testing sub-step. */
export function filesForStep(
  stageCode: string,
  stepId: string,
  codeArtifacts: Record<string, string> | null,
): [string, string][] {
  if (!codeArtifacts) return [];
  return Object.entries(codeArtifacts).filter(([path, content]) => {
    const haystack = `${path} ${content}`;
    switch (stepId) {
      case "frontend":
        return /\.(html|css|jsx|tsx|vue|svelte|astro)$/i.test(path) || /index|home|login|pages|components/i.test(path);
      case "scaffold":
        return /package\.json|requirements\.txt|\.env|\.gitignore|readme|dockerfile|\.github|tsconfig|vite|next/i.test(path);
      case "auth":
        return /auth|login|session|jwt|argon|bcrypt|middleware|permission|role/i.test(haystack);
      case "antiInjection":
        return /parameterized|orm|prisma|sanitize|escape|helmet|xss|csrf|validat/i.test(haystack);
      case "secrets":
        return /csrf|helmet|session|cookie|secret|\.env|process\.env|dotenv|encrypt/i.test(haystack);
      case "owasp":
      case "score":
      case "remediation":
        return stageCode === "testing";
      case "recommendations":
        return false;
      default:
        return true;
    }
  });
}

function MockupGrid({ screens }: { screens: DesignScreenType[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {screens.map((s) => (
        <div key={s.id} className="overflow-hidden rounded-lg border bg-card">
          <div className="flex items-center justify-between gap-2 border-b px-2 py-1 text-[11px]">
            <span className="truncate font-medium">{s.name}</span>
            {s.role && <Badge variant="outline">{s.role}</Badge>}
          </div>
          <DesignScreen html={s.html} title={s.name} device={s.device} viewportHeight={180} />
        </div>
      ))}
    </div>
  );
}

function StackGrid({ stack }: { stack: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {Object.entries(stack).map(([k, v]) => (
        <div key={k} className="rounded-lg border bg-card p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded bg-primary/15 text-[11px] font-bold text-primary">
              {k[0]?.toUpperCase()}
            </span>
            <span className="text-xs font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
          </div>
          <p className="font-mono text-sm text-foreground">{Array.isArray(v) ? v.join(", ") : String(v)}</p>
        </div>
      ))}
    </div>
  );
}

/**
 * Builds the Overview / Visual / Raw content of the sub-step result dialog.
 * Pure function of its context — call it once per render.
 */
export function getStepResultContent(stepId: string, ctx: StepResultContext): StepResultContent {
  const { dict, stageCode, label, recommendations } = ctx;
  const w = dict.workspace;
  const empty = <EmptyResult text={w.noResult} />;
  const jsonLabels = { items: w.jsonItems, keys: w.jsonKeys, copy: w.copy, copied: w.copied };
  const raw = (data: unknown) => <JsonTree data={data} labels={jsonLabels} />;
  const none: StepResultContent = { title: label, overview: empty, visual: empty, raw: raw(null) };

  const recommendationsResult = (cardId: string, cardTitle: string): StepResultContent => {
    const has = recommendations.length > 0;
    const list = <RecommendationList recommendations={recommendations} dict={dict} />;
    return {
      title: label,
      overview: has ? (
        <OverviewSummary title={dict.studio.recommendations} text={fmt(w.recsCount, { count: recommendations.length })} />
      ) : (
        <EmptyResult text={dict.studio.noRecommendations} />
      ),
      visualCards: has
        ? [
            {
              id: cardId,
              icon: Lightbulb,
              iconColor: "text-warning",
              title: cardTitle,
              description: fmt(w.recsCount, { count: recommendations.length }),
              fullscreenTitle: cardTitle,
              fullscreenContent: <div className="p-4">{list}</div>,
            },
          ]
        : undefined,
      visual: has ? list : <EmptyResult text={dict.studio.noRecommendations} />,
      raw: raw(recommendations.map((r) => ({ title: r.title, severity: r.severity, category: r.category, applied: r.isApplied }))),
    };
  };

  if (stageCode === "analysis") {
    const info = ctx.analysisInfo;
    switch (stepId) {
      case "scope": {
        if (!info?.summary) return { ...none, raw: raw(info?.summary ?? null) };
        const body = <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{info.summary}</p>;
        return {
          title: label,
          overview: (
            <div className="space-y-2 text-sm">
              <h4 className="font-semibold text-foreground">{w.scopeTitle}</h4>
              {body}
            </div>
          ),
          visualCards: [
            {
              id: "scope-overview",
              icon: FileText,
              iconColor: "text-primary",
              title: w.scopeTitle,
              description: w.scopeDesc,
              fullscreenTitle: w.scopeTitle,
              fullscreenContent: <div className="p-4">{body}</div>,
            },
          ],
          visual: body,
          raw: raw(info.summary),
        };
      }
      case "stack": {
        const stack = info?.recommendedStack;
        if (!stack) return { ...none, raw: raw(null) };
        return {
          title: label,
          overview: <OverviewSummary title={w.stackTitle} text={w.stackDesc} />,
          visualCards: [
            {
              id: "stack-recommendations",
              icon: Terminal,
              iconColor: "text-primary",
              title: w.stackTitle,
              description: w.stackDesc,
              fullscreenTitle: w.stackTitle,
              fullscreenContent: <div className="p-4"><StackGrid stack={stack} /></div>,
            },
          ],
          visual: <StackGrid stack={stack} />,
          raw: raw(stack),
        };
      }
      case "security": {
        const reqs = info?.securityRequirements ?? [];
        if (reqs.length === 0) return { ...none, raw: raw([]) };
        const text = fmt(w.securityReqCount, { count: reqs.length });
        return {
          title: label,
          overview: <OverviewSummary title={dict.studio.securityRequirementsTitle} text={text} />,
          visualCards: [
            {
              id: "security-requirements",
              icon: ShieldCheck,
              iconColor: "text-success",
              title: dict.studio.securityRequirementsTitle,
              description: text,
              fullscreenTitle: dict.studio.securityRequirementsTitle,
              fullscreenContent: <div className="p-4"><NumberedList items={reqs} tone="success" /></div>,
            },
          ],
          visual: <NumberedList items={reqs} tone="success" />,
          raw: raw(reqs),
        };
      }
      case "data": {
        const items = ctx.dataClassification;
        if (items.length === 0) return { ...none, raw: raw([]) };
        const text = fmt(w.dataCount, { count: items.length });
        return {
          title: label,
          overview: <OverviewSummary title={w.dataTitle} text={text} />,
          visualCards: [
            {
              id: "data-classification",
              icon: ShieldCheck,
              iconColor: "text-danger",
              title: w.dataTitle,
              description: text,
              fullscreenTitle: w.dataTitle,
              fullscreenContent: <div className="p-4"><DataClassificationTable items={items} dict={dict} /></div>,
            },
          ],
          visual: <DataClassificationTable items={items} dict={dict} />,
          raw: raw(items),
        };
      }
      case "recommendations":
        return recommendationsResult("analysis-recommendations", dict.studio.recommendations);
      default:
        return none;
    }
  }

  if (stageCode === "design") {
    switch (stepId) {
      case "ui": {
        const screens = ctx.designScreens;
        const ui = ctx.uiDesign;
        if (ui.length === 0 && screens.length === 0) return { ...none, raw: raw({ uiDesign: [], mockups: 0 }) };
        return {
          title: label,
          overview: (
            <OverviewSummary title={w.uiTitle} text={fmt(w.uiCount, { components: ui.length, mockups: screens.length })} />
          ),
          visualCards:
            screens.length > 0
              ? [
                  {
                    id: "ui-mockups",
                    icon: Layout,
                    iconColor: "text-primary",
                    title: w.uiMockups,
                    description: fmt(w.mockupCount, { count: screens.length }),
                    fullscreenTitle: w.uiMockups,
                    fullscreenContent: <div className="p-4"><MockupGrid screens={screens} /></div>,
                  },
                ]
              : undefined,
          visual: (
            <div className="space-y-3">
              {screens.length > 0 && <MockupGrid screens={screens} />}
              {ui.length > 0 && <NumberedList items={ui} />}
            </div>
          ),
          raw: raw({ uiDesign: ui, mockups: screens.map((s) => ({ id: s.id, name: s.name, role: s.role })) }),
        };
      }
      case "architecture": {
        const arch = ctx.architecture;
        if (arch.length === 0) return { ...none, raw: raw([]) };
        const text = fmt(w.architectureCount, { count: arch.length });
        return {
          title: label,
          overview: <OverviewSummary title={dict.studio.architectureTitle} text={text} />,
          visualCards: [
            {
              id: "architecture-components",
              icon: Network,
              iconColor: "text-info",
              title: dict.studio.architectureTitle,
              description: text,
              fullscreenTitle: dict.studio.architectureTitle,
              fullscreenContent: <div className="p-4"><NumberedList items={arch} tone="info" /></div>,
            },
          ],
          visual: <NumberedList items={arch} tone="info" />,
          raw: raw(arch),
        };
      }
      case "stride": {
        const threats = ctx.threatModel;
        if (threats.length === 0) return { ...none, raw: raw([]) };
        const text = fmt(w.strideCount, { count: threats.length });
        return {
          title: label,
          overview: <OverviewSummary title={dict.studio.threatModelTitle} text={text} />,
          visualCards: [
            {
              id: "stride-threats",
              icon: ShieldAlert,
              iconColor: "text-danger",
              title: dict.studio.threatModelTitle,
              description: text,
              fullscreenTitle: dict.studio.threatModelTitle,
              fullscreenContent: <div className="p-4"><ThreatModelView threats={threats} dict={dict} /></div>,
            },
          ],
          visual: <ThreatModelView threats={threats} dict={dict} />,
          raw: raw(threats),
        };
      }
      case "diagram": {
        const diagrams = ctx.diagrams;
        if (diagrams.length === 0) return { ...none, raw: raw([]) };
        return {
          title: label,
          overview: (
            <OverviewSummary title={dict.studio.diagram} text={fmt(w.diagramsCount, { count: diagrams.length })} />
          ),
          visualCards: diagrams.map((d, i) => ({
            id: `diagram-${i}`,
            icon: GitBranch,
            iconColor: "text-info",
            title: `${dict.studio.diagram} ${i + 1}`,
            description: w.diagramDesc,
            fullscreenTitle: `${dict.studio.diagram} ${i + 1}`,
            fullscreenContent: <MermaidDiagram code={d} id={`fullscreen-diagram-${i}`} variant="fullscreen" />,
          })),
          visual: (
            <div className="space-y-4">
              {diagrams.map((d, i) => (
                <MermaidDiagram key={i} code={d} id={`popup-diagram-${i}`} />
              ))}
            </div>
          ),
          raw: raw(diagrams),
        };
      }
      case "schema": {
        const schema = ctx.databaseSchema;
        if (schema.length === 0) return { ...none, raw: raw({ databaseSchema: [] }) };
        // Prefer the deterministic, cardinality-aware generator; the AI's own
        // erDiagram is only a fallback when the schema text yields nothing.
        const erd =
          generateErdFromSchema(schema) ??
          (ctx.erdDiagram ? { code: ctx.erdDiagram, tableCount: 0, relationshipCount: 0 } : null);
        const auth = ctx.authFlowDiagram || generateAuthFlowFromArchitecture(ctx.architecture);
        const tables = (
          <pre className="whitespace-pre-wrap rounded-lg bg-muted p-4 font-mono text-sm">
            {schema.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}
          </pre>
        );
        return {
          title: label,
          overview: <OverviewSummary title={w.schemaTitle} text={fmt(w.entitiesCount, { count: schema.length })} />,
          visualCards: [
            ...(erd
              ? [
                  {
                    id: "erd",
                    icon: GitPullRequestArrow,
                    iconColor: "text-primary",
                    title: w.erdTitle,
                    description: fmt(w.erdDesc, {
                      tables: erd.tableCount,
                      relations: erd.relationshipCount,
                      summary: erdCardinalitySummary(erd.code),
                    }),
                    fullscreenTitle: w.erdTitle,
                    fullscreenContent: <MermaidDiagram code={erd.code} id="fullscreen-erd" variant="fullscreen" />,
                  },
                ]
              : []),
            {
              id: "tables",
              icon: Database,
              iconColor: "text-warning",
              title: w.tableDefs,
              description: fmt(w.definitionsCount, { count: schema.length }),
              fullscreenTitle: w.tableDefs,
              fullscreenContent: <div className="p-4">{tables}</div>,
            },
            ...(auth
              ? [
                  {
                    id: "auth",
                    icon: Lock,
                    iconColor: "text-success",
                    title: w.authFlow,
                    description: w.sequenceDiagram,
                    fullscreenTitle: w.authFlow,
                    fullscreenContent: <MermaidDiagram code={auth} id="fullscreen-auth" variant="fullscreen" />,
                  },
                ]
              : []),
          ],
          visual: (
            <div className="space-y-4">
              {erd && (
                <div>
                  <h5 className="mb-2 text-sm font-semibold">{w.erdTitle}</h5>
                  <MermaidDiagram code={erd.code} id="popup-erd" />
                </div>
              )}
              <div>
                <h5 className="mb-2 text-sm font-semibold">{w.tableDefs}</h5>
                {tables}
              </div>
              {auth && (
                <div>
                  <h5 className="mb-2 text-sm font-semibold">{w.authFlow}</h5>
                  <MermaidDiagram code={auth} id="popup-auth" />
                </div>
              )}
            </div>
          ),
          raw: raw({ databaseSchema: schema, erdDiagram: ctx.erdDiagram, authFlowDiagram: ctx.authFlowDiagram }),
        };
      }
      case "recommendations":
        return recommendationsResult("design-recommendations", dict.studio.recommendations);
      default:
        return none;
    }
  }

  if (stageCode === "development" || stageCode === "testing") {
    if (stepId === "owasp") {
      const findings = ctx.testingFindings;
      if (findings.length === 0) return { ...none, raw: raw([]) };
      const text = fmt(w.findingsCount, { count: findings.length });
      return {
        title: label,
        overview: <OverviewSummary title={w.owaspTitle} text={text} />,
        visualCards: [
          {
            id: "owasp-findings",
            icon: Bug,
            iconColor: "text-danger",
            title: w.owaspTitle,
            description: text,
            fullscreenTitle: w.owaspTitle,
            fullscreenContent: <div className="p-4"><FindingsView findings={findings} dict={dict} /></div>,
          },
        ],
        visual: <FindingsView findings={findings} dict={dict} />,
        raw: raw(findings),
      };
    }
    if (stepId === "score") {
      const score = ctx.score;
      if (score == null) return { ...none, raw: raw({ securityScore: null }) };
      const summary = <ScoreSummary score={score} findings={ctx.testingFindings} dict={dict} />;
      return {
        title: label,
        overview: <OverviewSummary title={w.scoreTitle} text={w.scoreDesc} />,
        visualCards: [
          {
            id: "security-score",
            icon: ShieldCheck,
            iconColor: "text-success",
            title: w.scoreTitle,
            description: fmt(w.scoreOutOf, { score }),
            fullscreenTitle: w.scoreTitle,
            fullscreenContent: <div className="p-4">{summary}</div>,
          },
        ],
        visual: summary,
        raw: raw({ securityScore: score }),
      };
    }
    if (stepId === "remediation") {
      const fixed = Object.entries(ctx.testingFixedArtifacts ?? {});
      if (fixed.length === 0) return { ...none, raw: raw({}) };
      const text = fmt(w.filesFixed, { count: fixed.length });
      return {
        title: label,
        overview: <OverviewSummary title={w.remediationTitle} text={text} />,
        visualCards: [
          {
            id: "remediation-files",
            icon: Wrench,
            iconColor: "text-warning",
            title: w.remediationTitle,
            description: text,
            fullscreenTitle: w.remediationTitle,
            fullscreenContent: <div className="p-4"><CodeFileList files={fixed} dict={dict} onOpenFile={ctx.onOpenFile} /></div>,
          },
        ],
        visual: <CodeFileList files={fixed} dict={dict} onOpenFile={ctx.onOpenFile} />,
        raw: raw(fixed.map(([p]) => p)),
      };
    }
    if (stepId === "recommendations") {
      return recommendationsResult(`${stageCode}-recommendations`, dict.studio.recommendations);
    }
    const files = filesForStep(stageCode, stepId, ctx.codeArtifacts);
    if (files.length === 0) return { ...none, raw: raw([]) };
    return {
      title: label,
      overview: <OverviewSummary title={w.codeFilesTitle} text={fmt(w.filesMatching, { count: files.length })} />,
      visualCards: files.map(([path, content]) => ({
        id: path,
        icon: FileCode2,
        iconColor: "text-success",
        title: path.split("/").pop() || path,
        description: fmt(w.lines, { count: content.split("\n").length }),
        fullscreenTitle: path,
        fullscreenContent: <CodeFileList files={[[path, content]]} dict={dict} onOpenFile={ctx.onOpenFile} />,
      })),
      visual: <CodeFileList files={files} dict={dict} onOpenFile={ctx.onOpenFile} />,
      raw: raw(files.map(([p]) => p)),
    };
  }

  if (stageCode === "handover") {
    switch (stepId) {
      case "manual": {
        const doc = ctx.handoverManualBook;
        if (!doc) return { ...none, raw: raw(null) };
        return {
          title: label,
          overview: <OverviewSummary title={w.manualTitle} text={w.manualDesc} />,
          visualCards: [
            {
              id: "handover-manual",
              icon: BookOpen,
              iconColor: "text-warning",
              title: w.manualTitle,
              description: w.manualDesc,
              fullscreenTitle: w.manualTitle,
              fullscreenContent: <div className="mx-auto max-w-3xl p-4"><Markdown source={doc} /></div>,
            },
          ],
          visual: <Markdown source={doc} />,
          raw: raw(doc),
        };
      }
      case "compliance": {
        const doc = ctx.handoverComplianceReport;
        if (!doc) return { ...none, raw: raw(null) };
        return {
          title: label,
          overview: <OverviewSummary title={w.complianceTitle} text={w.complianceDesc} />,
          visualCards: [
            {
              id: "handover-compliance",
              icon: ClipboardCheck,
              iconColor: "text-success",
              title: w.complianceTitle,
              description: w.complianceDesc,
              fullscreenTitle: w.complianceTitle,
              fullscreenContent: <div className="mx-auto max-w-3xl p-4"><Markdown source={doc} /></div>,
            },
          ],
          visual: <Markdown source={doc} />,
          raw: raw(doc),
        };
      }
      case "checklist": {
        const items = ctx.handoverReleaseChecklist;
        if (items.length === 0) return { ...none, raw: raw([]) };
        return {
          title: label,
          overview: <OverviewSummary title={w.checklistTitle} text={fmt(w.checklistCount, { count: items.length })} />,
          visual: (
            <div className="space-y-2">
              {items.map((item, i) => (
                <label
                  key={i}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border bg-card p-2.5 hover:bg-muted/50"
                >
                  <input id={`release-${i}`} name={`release-${i}`} type="checkbox" className="mt-1 rounded border-muted-foreground/50" />
                  <span className="text-sm text-muted-foreground">{item}</span>
                </label>
              ))}
            </div>
          ),
          raw: raw(items),
        };
      }
      case "export":
        return {
          title: label,
          overview: <OverviewSummary title={w.exportTitle} text={w.exportHint} />,
          visual: (
            <div className="rounded-lg border bg-card p-4 text-center">
              <p className="text-sm text-muted-foreground">{w.exportHint}</p>
            </div>
          ),
          raw: raw({}),
        };
      case "recommendations":
        return recommendationsResult("handover-recommendations", dict.studio.recommendations);
      default:
        return none;
    }
  }

  return none;
}
