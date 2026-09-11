"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Bug,
  CheckCheck,
  CheckCircle2,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileCode2,
  FileText,
  FolderTree,
  GitBranch,
  GitPullRequestArrow,
  Languages,
  Layout,
  Lightbulb,
  ListChecks,
  Loader2,
  Lock,
  Network,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  User,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileEditor, MonacoDiff, inferLanguage } from "@/components/studio/code-editor";
import { MermaidDiagram } from "@/components/studio/mermaid-diagram";
import { DeliverablesPanel } from "@/components/studio/deliverables-panel";
import { PlanCard, BuildResultCard } from "@/components/studio/plan-card";
import { StepResultDialog } from "@/components/studio/step-result-dialog";
import { type VisualCardDef } from "@/components/studio/step-result-dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { csrfFetch } from "@/lib/csrf-client";
import type { PlanResult } from "@/lib/ai/result";
import type { Dictionary } from "@/lib/i18n";

interface StudioStage {
  code: string;
  name: string;
  description: string;
  orderIndex: number;
  nistGroups: string[];
  nistTasks: string[];
  isoControls: string[];
  secureParams: string[];
  steps: { id: string; nistTasks: string[]; isoControls: string[] }[];
  projectStageId: string;
}

interface StudioStageDef {
  code: string;
  name: string;
  orderIndex: number;
  status: string;
  id: number;
}

interface LatestRevision {
  id: string;
  version: string;
  revisionSummary: string;
  githubPrUrl: string | null;
  status: string;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

interface RecommendationRow {
  id: string;
  category: string;
  severity: string;
  title: string;
  content: string;
  suggestedCode: string | null;
  filePath: string | null;
  isApplied: boolean;
  nistControl: { taskCode: string; iso27001Mapping: string[] } | null;
}

interface SnapshotRow {
  id: string;
  version: string;
  diffSummary: string | null;
  createdAt: string;
  fileCount: number;
}

/** Chat interaction mode: plan first, then execute the approved plan. */
export type ChatMode = "plan" | "build";

export interface StudioWorkspaceProps {
  lang: string;
  dict: Dictionary;
  project: {
    id: string;
    name: string;
    version: string;
    outputLanguage: string;
    status: string;
    badgePublic: boolean;
  };
  stage: StudioStage;
  completionGaps: string[];
  nextStageName: string | null;
  stages: StudioStageDef[];
  messages: MessageRow[];
  recommendations: RecommendationRow[];
  codeArtifacts: Record<string, string> | null;
  securityScore: number | null;
  latestRevision: LatestRevision | null;
  designDiagrams: string[];
  designArchitecture: string[];
  designThreatModel: Record<string, unknown>[];
  designUiDesign: string[];
  analysisDataClassification: string[];
  snapshots: SnapshotRow[];
  analysisStack: {
    recommendedStack: Record<string, unknown> | null;
    securityRequirements: string[];
    summary: string;
  } | null;
  designDatabaseSchema: string[];
  designErdDiagram: string;
  designAuthFlowDiagram: string;
  testingFindings: Record<string, unknown>[];
  testingFixedArtifacts: Record<string, string> | null;
  handoverManualBook: string;
  handoverComplianceReport: string;
  handoverReleaseChecklist: string[];
}

const SEVERITY_VARIANT: Record<string, "success" | "warning" | "danger" | "secondary"> = {
  low: "success",
  medium: "warning",
  high: "danger",
  critical: "danger",
};

/** Hides the structured JSON block produced by the stage engine from the chat view. */
function displayAssistantText(content: string): string {
  let text = content;
  const fence = text.indexOf("```json");
  if (fence >= 0) {
    const close = text.indexOf("```", fence + 6);
    if (close >= 0) text = `${text.slice(0, fence)}${text.slice(close + 3)}`;
  }
  const jsonStart = text.indexOf("\n{");
  if (jsonStart >= 0) text = text.slice(0, jsonStart);
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : content;
}

/** Parse SQL CREATE TABLE statements and generate a Mermaid erDiagram string. */
function generateErdFromSchema(databaseSchema: string[]): { code: string; tableCount: number; relationshipCount: number } | null {
  const allSql = databaseSchema.join("\n");
  // Strip markdown code fences and comments
  let cleaned = allSql.replace(/```[\s\S]*?```/g, (m) => m.replace(/```sql\n?/gi, "").replace(/```\n?/g, ""));
  cleaned = cleaned.replace(/--[^\n]*/g, "");
  // Also strip standalone markdown lines (### headings, bullet points, etc.)
  cleaned = cleaned.replace(/^###.*$/gm, "").replace(/^-\s.*$/gm, "");

  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?\s*\(([\s\S]*?)\)\s*;/gi;
  const tables: { name: string; columns: { name: string; type: string; pk: boolean; fk: boolean; fkRef?: string }[] }[] = [];
  const relationships: { from: string; to: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = tableRegex.exec(cleaned)) !== null) {
    const tableName = match[1].toLowerCase();
    if (tableName === "usersessions" || tableName === "accounts" || tableName === "verification_tokens") continue;
    const body = match[2];
    const columns: { name: string; type: string; pk: boolean; fk: boolean; fkRef?: string }[] = [];

    // Split by comma, but handle nested parens like CHECK (...)
    const colLines: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of body) {
      if (ch === "(") { depth++; current += ch; }
      else if (ch === ")") { depth--; current += ch; }
      else if (ch === "," && depth === 0) { colLines.push(current); current = ""; }
      else { current += ch; }
    }
    if (current.trim()) colLines.push(current);

    for (const line of colLines) {
      const trimmed = line.trim();
      if (!trimmed || /^(PRIMARY|CONSTRAINT|CHECK|UNIQUE\s*\()/i.test(trimmed)) continue;

      const pk = /\bPRIMARY\s+KEY\b/i.test(trimmed);
      const fkMatch = /REFERENCES\s+["`']?(\w+)["`']?\s*\(/i.exec(trimmed);
      const fk = !!fkMatch;
      const fkRef = fkMatch ? fkMatch[1].toLowerCase() : undefined;

      const colMatch = /^["`']?(\w+)["`']?\s+([\w()., ]+)/i.exec(trimmed);
      if (colMatch) {
        const rawType = colMatch[2].trim()
          .replace(/\s*PRIMARY\s+KEY/i, "")
          .replace(/\s*UNIQUE/i, "")
          .replace(/\s*NOT\s+NULL/i, "")
          .replace(/\s*DEFAULT.*/i, "")
          .replace(/\s*CHECK.*/i, "")
          .replace(/\s*REFERENCES.*/i, "")
          .trim();
        columns.push({
          name: colMatch[1].toLowerCase(),
          type: rawType,
          pk,
          fk,
          fkRef,
        });
      }

      if (fk && fkRef && fkRef !== tableName) {
        if (!relationships.some((r) => (r.from === fkRef && r.to === tableName) || (r.from === tableName && r.to === fkRef))) {
          relationships.push({ from: fkRef, to: tableName });
        }
      }
    }
    if (columns.length > 0) {
      tables.push({ name: tableName, columns });
    }
  }

  if (tables.length === 0) return null;

  const lines: string[] = ["erDiagram", "    direction LR"];

  for (const rel of relationships) {
    lines.push(`    ${rel.from.toUpperCase()} ||--o{ ${rel.to.toUpperCase()} : "has"`);
  }

  for (const table of tables) {
    lines.push(`    ${table.name.toUpperCase()} {`);
    for (const col of table.columns) {
      const typeStr = col.type.toUpperCase()
        .replace(/VARCHAR\(\d+\)/g, "string")
        .replace(/NUMERIC\(\s*[\d.,\s]+\)/g, "float")
        .replace(/NUMERIC/g, "float")
        .replace(/TIMESTAMP.*/g, "timestamp")
        .replace(/TEXT/g, "string")
        .replace(/UUID/g, "UUID")
        .replace(/BOOLEAN/g, "boolean")
        .replace(/INT\b/g, "int")
        .replace(/DATE\b/g, "date")
        .slice(0, 20);
      const marker = col.pk ? "PK" : col.fk ? "FK" : "";
      lines.push(`        ${typeStr || "string"} ${col.name} ${marker}`.trim());
    }
    lines.push("    }");
  }

  return { code: lines.join("\n"), tableCount: tables.length, relationshipCount: relationships.length };
}

/** Generate a simple Mermaid auth flow sequenceDiagram from architecture text. */
function generateAuthFlowFromArchitecture(architecture: string[]): string | null {
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
  ];

  if (hasMfa) {
    lines.push("    BE->>DB: Validate credentials");
    lines.push("    DB-->>BE: Valid");
    lines.push("    BE->>FE: Request MFA code (TOTP)");
    lines.push("    FE->>BE: Submit MFA code");
    lines.push("    BE->>DB: Verify TOTP");
    lines.push("    DB-->>BE: Verified");
  } else {
    lines.push("    BE->>DB: Validate credentials");
    lines.push("    DB-->>BE: Valid");
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
  if (hasRefresh) {
    lines.push("    FE->>BE: API request + Access Token");
  } else {
    lines.push("    FE->>BE: API request + JWT");
  }
  lines.push("    BE->>DB: Validate token / session");
  lines.push("    DB-->>BE: Authorized");
  lines.push("    BE-->>FE: Resource data");
  lines.push("    FE-->>User: Display resource");

  return lines.join("\n");
}

export function StudioWorkspace(props: StudioWorkspaceProps) {
  return (
    <ToastProvider>
      <StudioWorkspaceInner {...props} />
    </ToastProvider>
  );
}

function StudioWorkspaceInner(props: StudioWorkspaceProps) {
  const { dict, lang, project, stage, stages, latestRevision } = props;
  const router = useRouter();
  const { addToast } = useToast();

  const [messages, setMessages] = useState(props.messages);
  const [recommendations, setRecommendations] = useState(props.recommendations);
  const [codeArtifacts, setCodeArtifacts] = useState(props.codeArtifacts);
  const [diagrams, setDiagrams] = useState(props.designDiagrams);
  const [architecture, setArchitecture] = useState(props.designArchitecture);
  const [threatModel] = useState(props.designThreatModel);
  const [uiDesign] = useState(props.designUiDesign);
  const [analysisInfo, setAnalysisInfo] = useState(props.analysisStack);
  const [score, setScore] = useState(props.securityScore);
  const completionGaps = props.completionGaps;
  const [snapshots] = useState(props.snapshots);
  const [databaseSchema] = useState(props.designDatabaseSchema);
  const [erdDiagram] = useState(props.designErdDiagram);
  const [authFlowDiagram] = useState(props.designAuthFlowDiagram);
  const [testingFindings] = useState(props.testingFindings);
  const [testingFixedArtifacts] = useState(props.testingFixedArtifacts);
  const [handoverManualBook] = useState(props.handoverManualBook);
  const [handoverComplianceReport] = useState(props.handoverComplianceReport);
  const [handoverReleaseChecklist] = useState(props.handoverReleaseChecklist);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [reparsing, setReparsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [structuredWarning, setStructuredWarning] = useState(false);
  const [truncatedWarning, setTruncatedWarning] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [outputLanguage, setOutputLanguage] = useState(props.project.outputLanguage);

  const [activeFile, setActiveFile] = useState<string | null>(
    props.codeArtifacts ? Object.keys(props.codeArtifacts)[0] ?? null : null,
  );
  const [activeFix, setActiveFix] = useState<RecommendationRow | null>(null);
  const [chatMode, setChatMode] = useState<ChatMode>("plan");
  const [activePlan, setActivePlan] = useState<PlanResult | null>(null);
  const [buildLoading, setBuildLoading] = useState(false);
  const [buildResult, setBuildResult] = useState<{
    actionsExecuted: number;
    filesCreated: string[];
    filesModified: string[];
    recommendationsCount: number;
    securityScore: number | null;
  } | null>(null);
  const [mobileTab, setMobileTab] = useState<"navigate" | "chat" | "security">("chat");
  const [activeStepResult, setActiveStepResult] = useState<string | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Subscribing to matchMedia instead of calling setState inside an effect keeps
  // the first render correct and avoids a cascading re-render.

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /**
   * Sends a prompt. `mode` MUST be passed explicitly by any programmatic caller
   * (e.g. the Approve & Build button): reading `chatMode` from state inside this
   * function would capture the value from the render that created the callback,
   * so approving a plan would re-run plan mode instead of build mode.
   */
  async function sendPrompt(text?: string, mode?: ChatMode) {
    const activeMode = mode ?? chatMode;
    const prompt = (text ?? input).trim();
    if (!prompt || loading) return;
    setInput("");
    setError(null);
    setStructuredWarning(false);
    setTruncatedWarning(false);
    setLoading(true);
    setBuildResult(null);

    const userMsg: MessageRow = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);

    try {
      // Plan mode: call /api/chat/plan
      if (activeMode === "plan") {
        const res = await csrfFetch("/api/chat/plan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            projectStageId: stage.projectStageId,
            prompt,
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          plan?: PlanResult | null;
          truncated?: boolean;
          error?: string;
          message?: string;
        };

        if (!res.ok) {
          setError(data.message ?? data.error ?? dict.studio.requestFailed);
          setMessages((m) => m.filter((x) => x.id !== userMsg.id));
          return;
        }

        const assistantMsg: MessageRow = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? "",
          createdAt: new Date().toISOString(),
        };
        setMessages((m) => [...m, assistantMsg]);

        if (data.plan) {
          setActivePlan(data.plan);
          addToast("info", `Plan generated: ${data.plan.actions.length} actions`);
        } else {
          setStructuredWarning(true);
        }
        if (data.truncated) setTruncatedWarning(true);
        return;
      }

      // Build mode: call /api/chat/build
      if (activeMode === "build" && activePlan) {
        setBuildLoading(true);
        const res = await csrfFetch("/api/chat/build", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            projectStageId: stage.projectStageId,
            prompt,
            approvedPlan: activePlan,
          }),
        });

        const data = (await res.json()) as {
          reply?: string;
          result?: {
            summary?: string;
            codeArtifacts?: Record<string, string>;
            mermaid?: string[];
            architecture?: string[];
            recommendedStack?: Record<string, unknown>;
            securityRequirements?: string[];
            securityScore?: number;
          } | null;
          securityScore?: number | null;
          recommendations?: RecommendationRow[];
          truncated?: boolean;
          error?: string;
          message?: string;
        };

        if (!res.ok) {
          setError(data.message ?? data.error ?? dict.studio.requestFailed);
          setMessages((m) => m.filter((x) => x.id !== userMsg.id));
          setBuildLoading(false);
          return;
        }

        const assistantMsg: MessageRow = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.reply ?? "",
          createdAt: new Date().toISOString(),
        };
        setMessages((m) => [...m, assistantMsg]);

        const result = data.result;
        if (result) {
          if (result.codeArtifacts) {
            const merged = { ...(codeArtifacts ?? {}), ...result.codeArtifacts };
            setCodeArtifacts(merged);
            setActiveFile(Object.keys(merged)[0] ?? null);
          }
          if (result.mermaid?.length) setDiagrams(result.mermaid);
          if (result.architecture?.length) setArchitecture(result.architecture);
          if (result.recommendedStack || result.securityRequirements) {
            setAnalysisInfo({
              recommendedStack: result.recommendedStack ?? analysisInfo?.recommendedStack ?? null,
              securityRequirements: result.securityRequirements ?? analysisInfo?.securityRequirements ?? [],
              summary: result.summary ?? analysisInfo?.summary ?? "",
            });
          }
        }
        if (typeof data.securityScore === "number") setScore(Math.round(data.securityScore));
        if (data.recommendations?.length) setRecommendations(data.recommendations);
        if (data.truncated) setTruncatedWarning(true);

        // Build summary
        const createdFiles = result?.codeArtifacts
          ? Object.keys(result.codeArtifacts).filter((f) => !codeArtifacts?.[f])
          : [];
        const modifiedFiles = result?.codeArtifacts
          ? Object.keys(result.codeArtifacts).filter((f) => codeArtifacts?.[f])
          : [];
        setBuildResult({
          actionsExecuted: activePlan.actions.length,
          filesCreated: createdFiles,
          filesModified: modifiedFiles,
          recommendationsCount: data.recommendations?.length ?? 0,
          securityScore: data.securityScore ?? null,
        });
        addToast("success", `Build complete! ${createdFiles.length} files created, ${modifiedFiles.length} modified`);
        setActivePlan(null);
        setBuildLoading(false);
        setChatMode("plan");
        router.refresh();
        return;
      }

      // Fallback: direct chat (no plan)
      const res = await csrfFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: project.id,
          projectStageId: stage.projectStageId,
          prompt,
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        result?: {
          summary?: string;
          codeArtifacts?: Record<string, string>;
          mermaid?: string[];
          architecture?: string[];
          recommendedStack?: Record<string, unknown>;
          securityRequirements?: string[];
          securityScore?: number;
        } | null;
        securityScore?: number | null;
        recommendationsSaved?: number;
        recommendations?: RecommendationRow[];
        truncated?: boolean;
        error?: string;
        message?: string;
      };

      if (!res.ok) {
        setError(data.message ?? data.error ?? dict.studio.requestFailed);
        // Remove optimistic message and keep history minimal
        setMessages((m) => m.filter((x) => x.id !== userMsg.id));
        return;
      }

      const assistantMsg: MessageRow = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply ?? "",
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, assistantMsg]);

      const result = data.result;
      if (result) {
        if (result.codeArtifacts) {
          const merged = { ...(codeArtifacts ?? {}), ...result.codeArtifacts };
          setCodeArtifacts(merged);
          setActiveFile(Object.keys(merged)[0] ?? null);
        }
        if (result.mermaid?.length) setDiagrams(result.mermaid);
        if (result.architecture?.length) setArchitecture(result.architecture);
        if (result.recommendedStack || result.securityRequirements) {
          setAnalysisInfo({
            recommendedStack: result.recommendedStack ?? analysisInfo?.recommendedStack ?? null,
            securityRequirements: result.securityRequirements ?? analysisInfo?.securityRequirements ?? [],
            summary: result.summary ?? analysisInfo?.summary ?? "",
          });
        }
        setStructuredWarning(false);
      } else {
        setStructuredWarning(true);
      }
      if (typeof data.securityScore === "number") setScore(Math.round(data.securityScore));
      if (data.recommendations?.length) setRecommendations(data.recommendations);
      if (data.truncated) setTruncatedWarning(true);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
      setMessages((m) => m.filter((x) => x.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }

  async function reparse() {
    setReparsing(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/chat/reparse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        result?: {
          codeArtifacts?: Record<string, string>;
          mermaid?: string[];
          architecture?: string[];
          recommendedStack?: Record<string, unknown>;
          securityRequirements?: string[];
          securityScore?: number;
        } | null;
        recommendations?: RecommendationRow[];
        securityScore?: number | null;
      };
      if (!res.ok || !data.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      if (data.result) {
        if (data.result.codeArtifacts) {
          const merged = { ...(codeArtifacts ?? {}), ...data.result.codeArtifacts };
          setCodeArtifacts(merged);
          setActiveFile(Object.keys(merged)[0] ?? null);
        }
        if (data.result.mermaid?.length) setDiagrams(data.result.mermaid);
        if (data.result.architecture?.length) setArchitecture(data.result.architecture);
      }
      if (data.recommendations?.length) setRecommendations(data.recommendations);
      if (typeof data.securityScore === "number") setScore(Math.round(data.securityScore));
      setStructuredWarning(false);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setReparsing(false);
    }
  }

  async function completeStage() {
    setCompleting(true);
    setError(null);
    try {
      const res = await csrfFetch("/api/stages/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId }),
      });
      const data = (await res.json()) as { error?: string; gaps?: string[] };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setCompleting(false);
    }
  }

  function downloadArtifacts() {
    const link = document.createElement("a");
    link.href = `/api/export/artifacts?projectId=${project.id}`;
    link.click();
  }

  async function toggleApplied(rec: RecommendationRow) {
    const next = !rec.isApplied;
    try {
      const res = await csrfFetch(`/api/recommendations/${rec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isApplied: next }),
      });
      if (!res.ok) {
        setError(dict.studio.requestFailed);
        return;
      }
      setRecommendations((rs) => rs.map((r) => (r.id === rec.id ? { ...r, isApplied: next } : r)));
    } catch {
      setError(dict.studio.networkError);
    }
  }

  async function applyFix(rec: RecommendationRow) {
    if (!rec.suggestedCode || !rec.filePath) return;
    setError(null);
    try {
      const res = await csrfFetch("/api/artifacts/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectStageId: stage.projectStageId,
          file: rec.filePath,
          content: rec.suggestedCode,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      const next = { ...codeArtifacts, [rec.filePath]: rec.suggestedCode };
      setCodeArtifacts(next);
      setActiveFile(rec.filePath);
      setActiveFix(null);
      if (!rec.isApplied) await toggleApplied({ ...rec, isApplied: false });
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    }
  }

  async function changeOutputLanguage(next: string) {
    setOutputLanguage(next);
    setSavingLanguage(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outputLanguage: next }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? dict.studio.requestFailed);
        setOutputLanguage(props.project.outputLanguage);
        return;
      }
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
      setOutputLanguage(props.project.outputLanguage);
    } finally {
      setSavingLanguage(false);
    }
  }

  const stageDict = dict.stages[stage.code as keyof Dictionary["stages"]];
  const stepMeta = (id: string) => {
    const steps =
      stageDict && typeof stageDict === "object" && "steps" in stageDict
        ? (stageDict as { steps: Record<string, { label: string; detail: string }> }).steps
        : null;
    return steps?.[id] ?? { label: id, detail: "" };
  };
  const stageName = (code: string) => dict.stages[code as keyof Dictionary["stages"]]?.name ?? code;
  const stageSecureParams: string[] =
    stageDict && "secureParams" in stageDict ? (stageDict.secureParams as string[]) : [];
  const stageDesc = stageDict && "desc" in stageDict ? (stageDict.desc as string) : stage.description;

  // Sub-step checklist state: sequential lock based on completionGaps.
  const gapSet = new Set(completionGaps);
  const firstUnmetIndex = stage.steps.findIndex((s) => !gapSet.has(s.id));
  const stepRows = stage.steps.map((s, i) => {
    const met = !gapSet.has(s.id);
    if (met) return { ...s, met: true, locked: false, current: false };
    const current = i === firstUnmetIndex;
    return { ...s, met: false, locked: !current, current };
  });

  const sortedFiles = codeArtifacts ? Object.keys(codeArtifacts).sort() : [];

  function getStepResultContent(stepId: string): { title: string; overview: React.ReactNode; visual: React.ReactNode; raw: React.ReactNode; visualCards?: VisualCardDef[] } {
    const meta = stepMeta(stepId);
    const label = meta.label || stepId;
    const empty = <p className="text-muted-foreground italic">Belum ada hasil. Jalankan stage terlebih dahulu.</p>;

    if (stage.code === "analysis") {
      switch (stepId) {
        case "scope":
          return {
            title: label,
            overview: analysisInfo?.summary ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Project Overview</h4>
                <p className="whitespace-pre-line text-muted-foreground leading-relaxed">{analysisInfo.summary}</p>
              </div>
            ) : empty,
            visualCards: analysisInfo?.summary ? [
              {
                id: "scope-overview",
                icon: FileText,
                iconColor: "text-blue-400",
                title: "Project Scope Summary",
                description: "Ringkasan proyek dan scope",
                fullscreenTitle: "Project Scope",
                fullscreenContent: (
                  <div className="p-4">
                    <p className="whitespace-pre-line text-sm">{analysisInfo.summary}</p>
                  </div>
                ),
              },
            ] : undefined,
            visual: analysisInfo?.summary ? (
              <div className="rounded-lg border bg-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-900 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-sm">Project Scope Summary</h4>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{analysisInfo.summary}</p>
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(analysisInfo?.summary ?? null, null, 2)}</pre>,
          };
        case "stack":
          return {
            title: label,
            overview: analysisInfo?.recommendedStack ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Technology Stack</h4>
                <p className="text-muted-foreground">Rekomendasi teknologi yang sesuai untuk proyek ini berdasarkan kebutuhan analisis.</p>
              </div>
            ) : empty,
            visualCards: analysisInfo?.recommendedStack ? [
              {
                id: "stack-recommendations",
                icon: Terminal,
                iconColor: "text-gray-400",
                title: "Tech Stack Recommendations",
                description: "Daftar teknologi direkomendasikan",
                fullscreenTitle: "Technology Stack Detail",
                fullscreenContent: (
                  <div className="p-4">
                    {Object.entries(analysisInfo.recommendedStack).map(([k, v], i) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-primary">{k[0].toUpperCase()}</span>
                        </div>
                        <span className="text-sm font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                        <p className="text-sm font-mono text-foreground">{Array.isArray(v) ? v.join(", ") : String(v)}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ] : undefined,
            visual: analysisInfo?.recommendedStack ? (
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(analysisInfo.recommendedStack).map(([k, v]) => (
                  <div key={k} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded bg-primary/15 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-primary">{k[0].toUpperCase()}</span>
                      </div>
                      <span className="text-xs font-medium capitalize">{k.replace(/([A-Z])/g, " $1")}</span>
                    </div>
                    <p className="text-sm font-mono text-foreground">
                      {Array.isArray(v) ? v.join(", ") : String(v)}
                    </p>
                  </div>
                ))}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(analysisInfo?.recommendedStack ?? null, null, 2)}</pre>,
          };
        case "security":
          return {
            title: label,
            overview: analysisInfo?.securityRequirements?.length ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Security Requirements</h4>
                <p className="text-muted-foreground">{analysisInfo.securityRequirements.length} persyaratan keamanan teridentifikasi untuk proyek ini.</p>
              </div>
            ) : empty,
            visualCards: analysisInfo?.securityRequirements?.length ? [
              {
                id: "security-requirements",
                icon: ShieldCheck,
                iconColor: "text-emerald-400",
                title: "Security Requirements",
                description: `${analysisInfo.securityRequirements.length} persyaratan teridentifikasi`,
                fullscreenTitle: "Security Requirements Detail",
                fullscreenContent: (
                  <div className="p-4">
                    {analysisInfo.securityRequirements.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5 mb-1">
                        <div className="w-5 h-5 rounded-full bg-emerald-900 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-emerald-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{r}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ] : undefined,
            visual: analysisInfo?.securityRequirements?.length ? (
              <div className="space-y-2">
                {analysisInfo.securityRequirements.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                    <div className="w-5 h-5 rounded-full bg-emerald-900 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{r}</p>
                  </div>
                ))}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(analysisInfo?.securityRequirements ?? [], null, 2)}</pre>,
          };
        case "data":
          return {
            title: label,
            overview: props.analysisDataClassification.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Data Classification</h4>
                <p className="text-muted-foreground">{props.analysisDataClassification.length} kategori data teridentifikasi.</p>
              </div>
            ) : empty,
            visualCards: props.analysisDataClassification.length > 0 ? [
              {
                id: "data-classification",
                icon: ShieldCheck,
                iconColor: "text-red-400",
                title: "Data Classification",
                description: `${props.analysisDataClassification.length} kategori data teridentifikasi`,
                fullscreenTitle: "Data Classification Detail",
                fullscreenContent: (
                  <div className="p-4">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          <th className="py-1.5 pr-3 font-medium">#</th>
                          <th className="py-1.5 pr-3 font-medium">Data Type</th>
                          <th className="py-1.5 font-medium">Classification</th>
                        </tr>
                      </thead>
                      <tbody>
                        {props.analysisDataClassification.map((d, i) => {
                          const lower = d.toLowerCase();
                          const level = lower.includes("pii") || lower.includes("personal") ? "Sensitive" :
                                    lower.includes("phi") || lower.includes("health") ? "Restricted" :
                                    lower.includes("public") ? "Public" : "Internal";
                          const color = level === "Restricted" ? "bg-red-900 text-red-300" :
                                    level === "Sensitive" ? "bg-yellow-900 text-yellow-300" :
                                    level === "Public" ? "bg-green-900 text-green-300" :
                                    "bg-blue-900 text-blue-300";
                          return (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                              <td className="py-1.5 pr-3 font-medium">{d}</td>
                              <td className="py-1.5"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${color}`}>{level}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ),
              },
            ] : undefined,
            visual: props.analysisDataClassification.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-1.5 pr-3 font-medium">#</th>
                      <th className="py-1.5 pr-3 font-medium">Data Type</th>
                      <th className="py-1.5 font-medium">Classification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {props.analysisDataClassification.map((d, i) => {
                      const lower = d.toLowerCase();
                      const level = lower.includes("pii") || lower.includes("personal") ? "Sensitive" :
                                    lower.includes("phi") || lower.includes("health") ? "Restricted" :
                                    lower.includes("public") ? "Public" : "Internal";
                      const color = level === "Restricted" ? "bg-red-900 text-red-300" :
                                    level === "Sensitive" ? "bg-yellow-900 text-yellow-300" :
                                    level === "Public" ? "bg-green-900 text-green-300" :
                                    "bg-blue-900 text-blue-300";
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 pr-3 text-muted-foreground">{i + 1}</td>
                          <td className="py-1.5 pr-3 font-medium">{d}</td>
                          <td className="py-1.5"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${color}`}>{level}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(props.analysisDataClassification, null, 2)}</pre>,
          };
        case "recommendations":
          return {
            title: label,
            overview: recommendations.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Recommendations</h4>
                <p className="text-muted-foreground">{recommendations.length} rekomendasi keamanan tersedia.</p>
              </div>
            ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
            visualCards: recommendations.length > 0 ? [
              {
                id: "analysis-recommendations",
                icon: Lightbulb,
                iconColor: "text-amber-400",
                title: "Analysis Recommendations",
                description: `${recommendations.length} rekomendasi dari analisis`,
                fullscreenTitle: "Recommendations Detail",
                fullscreenContent: (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recommendations.map((r, i) => (
                      <div key={i} className="rounded-md border p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-amber-900 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-bold text-amber-400">{i + 1}</span>
                          </span>
                          <span className="text-sm font-medium">{r.title}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{r.content}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ] : undefined,
            visual: recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                      <Badge variant="muted">{r.category}</Badge>
                    </div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.content}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(recommendations.map(r => ({ title: r.title, severity: r.severity, category: r.category })), null, 2)}</pre>,
          };
        default:
          return { title: label, overview: empty, visual: empty, raw: empty };
      }
    }

    if (stage.code === "design") {
      switch (stepId) {
        case "ui":
          return {
            title: label,
            overview: uiDesign.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">UI Design</h4>
                <p className="text-muted-foreground">{uiDesign.length} komponen UI teridentifikasi.</p>
              </div>
            ) : empty,
            visualCards: uiDesign.length > 0 ? [
              {
                id: "ui-components",
                icon: Layout,
                iconColor: "text-purple-400",
                title: "UI Components",
                description: `${uiDesign.length} komponen UI teridentifikasi`,
                fullscreenTitle: "UI/UX Layout & Components",
                fullscreenContent: (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {uiDesign.map((u, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                        <div className="w-6 h-6 rounded bg-purple-900 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-purple-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{u}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ] : undefined,
            visual: uiDesign.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uiDesign.map((u, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                    <div className="w-6 h-6 rounded bg-purple-900 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-purple-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{u}</p>
                  </div>
                ))}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(uiDesign, null, 2)}</pre>,
          };
        case "architecture":
          return {
            title: label,
            overview: architecture.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Architecture</h4>
                <p className="text-muted-foreground">{architecture.length} komponen arsitektur.</p>
              </div>
            ) : empty,
            visualCards: architecture.length > 0 ? [
              {
                id: "architecture-components",
                icon: Network,
                iconColor: "text-cyan-400",
                title: "Arsitektur Components",
                description: `${architecture.length} komponen arsitektur`,
                fullscreenTitle: "Arsitektur Detail",
                fullscreenContent: (
                  <div className="p-4">
                    {architecture.map((a, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5 mb-1">
                        <div className="w-6 h-6 rounded bg-cyan-900 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-cyan-400">{i + 1}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{a}</p>
                      </div>
                    ))}
                  </div>
                ),
              },
            ] : undefined,
            visual: architecture.length > 0 ? (
              <div className="space-y-2">
                {architecture.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                    <div className="w-6 h-6 rounded bg-cyan-900 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-cyan-400">{i + 1}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{a}</p>
                  </div>
                ))}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(architecture, null, 2)}</pre>,
          };
        case "stride":
          return {
            title: label,
            overview: threatModel.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">STRIDE Threat Model</h4>
                <p className="text-muted-foreground">{threatModel.length} ancaman teridentifikasi.</p>
              </div>
            ) : empty,
            visualCards: threatModel.length > 0 ? [
              {
                id: "stride-threats",
                icon: ShieldAlert,
                iconColor: "text-red-400",
                title: "STRIDE Threat Model",
                description: `${threatModel.length} ancaman teridentifikasi`,
                fullscreenTitle: "STRIDE Threat Model Detail",
                fullscreenContent: (
                  <div className="p-4 space-y-4">
                    {/* Risk heat map */}
                    <div>
                      <h5 className="font-semibold text-sm mb-2">Risk Heat Map</h5>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        {["Low", "Medium", "High"].map((level) => {
                          const count = threatModel.filter((t) => String(t.likelihood ?? "").toLowerCase() === level.toLowerCase()).length;
                          const color = level === "High" ? "bg-red-900 border-red-700" : level === "Medium" ? "bg-yellow-900 border-yellow-700" : "bg-green-900 border-green-700";
                          return (
                            <div key={level} className={`${color} border rounded-lg p-2 text-center`}>
                              <p className="text-lg font-bold">{count}</p>
                              <p className="text-[10px] text-muted-foreground">{level} Likelihood</p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* Table */}
                    <div>
                      <h5 className="font-semibold text-sm mb-2">Threat Table</h5>
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[400px] text-left text-sm">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="py-1 pr-2 font-medium">Threat</th>
                              <th className="py-1 pr-2 font-medium">Likelihood</th>
                              <th className="py-1 pr-2 font-medium">Impact</th>
                              <th className="py-1 font-medium">Mitigation</th>
                            </tr>
                          </thead>
                          <tbody>
                            {threatModel.map((t, i) => (
                              <tr key={i} className="border-b last:border-0">
                                <td className="py-1.5 pr-2 align-top">{String(t.threat ?? "")}</td>
                                <td className="py-1.5 pr-2 align-top">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    String(t.likelihood ?? "").toLowerCase() === "high" ? "bg-red-900 text-red-300" :
                                    String(t.likelihood ?? "").toLowerCase() === "medium" ? "bg-yellow-900 text-yellow-300" :
                                    "bg-green-900 text-green-300"
                                  }`}>{String(t.likelihood ?? "—")}</span>
                                </td>
                                <td className="py-1.5 pr-2 align-top">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    String(t.impact ?? "").toLowerCase() === "high" ? "bg-red-900 text-red-300" :
                                    String(t.impact ?? "").toLowerCase() === "medium" ? "bg-yellow-900 text-yellow-300" :
                                    "bg-green-900 text-green-300"
                                  }`}>{String(t.impact ?? "—")}</span>
                                </td>
                                <td className="py-1.5 align-top">{String(t.mitigation ?? "—")}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ),
              },
            ] : undefined,
            visual: threatModel.length > 0 ? (
              <div className="space-y-3">
                {/* Risk heat map */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {["Low", "Medium", "High"].map((level) => {
                    const count = threatModel.filter((t) => String(t.likelihood ?? "").toLowerCase() === level.toLowerCase()).length;
                    const color = level === "High" ? "bg-red-900 border-red-700" : level === "Medium" ? "bg-yellow-900 border-yellow-700" : "bg-green-900 border-green-700";
                    return (
                      <div key={level} className={`${color} border rounded-lg p-2 text-center`}>
                        <p className="text-lg font-bold">{count}</p>
                        <p className="text-[10px] text-muted-foreground">{level} Likelihood</p>
                      </div>
                    );
                  })}
                </div>
                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="py-1 pr-2 font-medium">Threat</th>
                        <th className="py-1 pr-2 font-medium">Likelihood</th>
                        <th className="py-1 pr-2 font-medium">Impact</th>
                        <th className="py-1 font-medium">Mitigation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {threatModel.map((t, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1.5 pr-2 align-top">{String(t.threat ?? "")}</td>
                          <td className="py-1.5 pr-2 align-top">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              String(t.likelihood ?? "").toLowerCase() === "high" ? "bg-red-900 text-red-300" :
                              String(t.likelihood ?? "").toLowerCase() === "medium" ? "bg-yellow-900 text-yellow-300" :
                              "bg-green-900 text-green-300"
                            }`}>{String(t.likelihood ?? "—")}</span>
                          </td>
                          <td className="py-1.5 pr-2 align-top">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              String(t.impact ?? "").toLowerCase() === "high" ? "bg-red-900 text-red-300" :
                              String(t.impact ?? "").toLowerCase() === "medium" ? "bg-yellow-900 text-yellow-300" :
                              "bg-green-900 text-green-300"
                            }`}>{String(t.impact ?? "—")}</span>
                          </td>
                          <td className="py-1.5 align-top">{String(t.mitigation ?? "—")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(threatModel, null, 2)}</pre>,
          };
        case "diagram":
          return {
            title: label,
            overview: diagrams.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Architecture Diagrams</h4>
                <p className="text-muted-foreground">{diagrams.length} diagram Mermaid tersedia.</p>
              </div>
            ) : empty,
            visualCards: diagrams.length > 0 ? diagrams.map((d, i) => ({
              id: `diagram-${i}`,
              icon: GitBranch,
              iconColor: "text-cyan-400",
              title: `Diagram ${i + 1}`,
              description: "Architecture / Data Flow diagram",
              fullscreenTitle: `Architecture Diagram ${i + 1}`,
              fullscreenContent: <MermaidDiagram code={d} id={`fullscreen-diagram-${i}`} />,
            })) : undefined,
            visual: diagrams.length > 0 ? (
              <div className="space-y-4">
                {diagrams.map((d, i) => (
                  <MermaidDiagram key={i} code={d} id={`popup-diagram-${i}`} />
                ))}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(diagrams, null, 2)}</pre>,
          };
        case "schema": {
          const erdResult = erdDiagram ? { code: erdDiagram, tableCount: 0, relationshipCount: 0 } : generateErdFromSchema(databaseSchema);
          const autoErdCode = erdResult?.code ?? null;
          const autoAuth = authFlowDiagram || generateAuthFlowFromArchitecture(architecture);
          return {
            title: label,
            overview: databaseSchema.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Database Schema & Auth Flow</h4>
                <p className="text-muted-foreground">{databaseSchema.length} entitas database.</p>
              </div>
            ) : empty,
            visualCards: databaseSchema.length > 0 ? [
              {
                id: "tables",
                icon: Database,
                iconColor: "text-orange-400",
                title: "Table Definitions",
                description: `${databaseSchema.length} SQL definitions`,
                fullscreenTitle: "Table Definitions",
                fullscreenContent: (
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-muted rounded-lg p-6 sm:p-8">
                    {databaseSchema.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}
                  </pre>
                ),
              },
              ...(autoErdCode ? [{
                id: "erd",
                icon: GitPullRequestArrow,
                iconColor: "text-blue-400",
                title: "ERD Diagram",
                description: `${erdResult?.tableCount ?? 0} entities, ${erdResult?.relationshipCount ?? 0} relationships`,
                fullscreenTitle: "Entity Relationship Diagram",
                fullscreenContent: <MermaidDiagram code={autoErdCode} id="fullscreen-erd" />,
              }] : []),
              ...(autoAuth ? [{
                id: "auth",
                icon: Lock,
                iconColor: "text-green-400",
                title: "Auth Flow",
                description: "Sequence diagram",
                fullscreenTitle: "Authentication Flow",
                fullscreenContent: <MermaidDiagram code={autoAuth} id="fullscreen-auth" />,
              }] : []),
            ] : undefined,
            visual: databaseSchema.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h5 className="font-semibold text-sm mb-2">Table Definitions</h5>
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-muted rounded-lg p-4">{databaseSchema.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}</pre>
                </div>
                {autoErdCode && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2">ERD Diagram</h5>
                    <MermaidDiagram code={autoErdCode} id="popup-erd" />
                  </div>
                )}
                {autoAuth && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2">Auth Flow</h5>
                    <MermaidDiagram code={autoAuth} id="popup-auth" />
                  </div>
                )}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify({ databaseSchema, erdDiagram, authFlowDiagram }, null, 2)}</pre>,
          };
        }
        case "recommendations":
          return {
            title: label,
            overview: recommendations.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Recommendations</h4>
                <p className="text-muted-foreground">{recommendations.length} rekomendasi keamanan tersedia.</p>
              </div>
            ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
            visual: recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                      <Badge variant="muted">{r.category}</Badge>
                    </div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.content}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(recommendations.map(r => ({ title: r.title, severity: r.severity })), null, 2)}</pre>,
          };
        default:
          return { title: label, overview: empty, visual: empty, raw: empty };
      }
    }

    if (stage.code === "development" || stage.code === "testing") {
      const matchingFiles = codeArtifacts
        ? Object.entries(codeArtifacts).filter(([path, content]) => {
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
                return stage.code === "testing";
              case "score":
                return stage.code === "testing";
              case "remediation":
                return stage.code === "testing";
              case "recommendations":
                return false;
              default:
                return true;
            }
          })
        : [];

      if (stepId === "owasp") {
        return {
          title: label,
          overview: testingFindings.length > 0 ? (
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold text-foreground">OWASP Findings</h4>
              <p className="text-muted-foreground">{testingFindings.length} temuan keamanan teridentifikasi.</p>
            </div>
          ) : empty,
          visualCards: testingFindings.length > 0 ? [
            {
              id: "owasp-findings",
              icon: Bug,
              iconColor: "text-red-400",
              title: "OWASP Findings",
              description: `${testingFindings.length} temuan keamanan`,
              fullscreenTitle: "OWASP Findings Detail",
              fullscreenContent: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {testingFindings.map((f, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant={SEVERITY_VARIANT[String(f.severity)] ?? "secondary"}>{String(f.severity)}</Badge>
                        <span className="text-sm font-medium">{String(f.title)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{String(f.description ?? "")}</p>
                      {typeof f.fix === "string" && <p className="mt-1 text-xs text-success">{f.fix}</p>}
                    </div>
                  ))}
                </div>
              ),
            },
          ] : undefined,
          visual: testingFindings.length > 0 ? (
            <div className="space-y-3">
              {/* Severity distribution */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {["critical", "high", "medium", "low"].map((sev) => {
                  const count = testingFindings.filter((f) => String(f.severity ?? "").toLowerCase() === sev).length;
                  const color = sev === "critical" ? "bg-red-900 border-red-700" : sev === "high" ? "bg-orange-900 border-orange-700" : sev === "medium" ? "bg-yellow-900 border-yellow-700" : "bg-green-900 border-green-700";
                  return (
                    <div key={sev} className={`${color} border rounded-lg p-2 text-center`}>
                      <p className="text-lg font-bold">{count}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{sev}</p>
                    </div>
                  );
                })}
              </div>
              {/* Finding cards */}
              {testingFindings.map((f, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[String(f.severity)] ?? "secondary"}>{String(f.severity)}</Badge>
                    <span className="text-sm font-medium">{String(f.title)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{String(f.description ?? "")}</p>
                  {typeof f.fix === "string" && <p className="mt-1 text-xs text-success">{f.fix}</p>}
                </div>
              ))}
            </div>
          ) : empty,
          raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(testingFindings, null, 2)}</pre>,
        };
      }
      if (stepId === "score") {
        return {
          title: label,
          overview: score != null ? (
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold text-foreground">Security Score</h4>
              <p className="text-muted-foreground">Skor keamanan keseluruhan proyek.</p>
            </div>
          ) : empty,
          visualCards: score != null ? [
            {
              id: "security-score",
              icon: Layout,
              iconColor: "text-emerald-400",
              title: "Security Score",
              description: `Skor ${score} / 100`,
              fullscreenTitle: "Security Score Detail",
              fullscreenContent: (
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={score >= 85 ? "success" : score >= 60 ? "warning" : "danger"} className="text-lg px-3 py-1">
                      {score} / 100
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {score >= 85 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement"}
                    </span>
                  </div>
                  <Progress value={score} />
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: "Authentication", score: Math.min(100, score + 10) },
                      { label: "Data Protection", score: Math.max(0, score - 5) },
                      { label: "Input Validation", score: Math.min(100, score + 5) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-lg border bg-card p-2 text-center">
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                        <p className="text-lg font-bold">{item.score}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
          ] : undefined,
          visual: score != null ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={score >= 85 ? "success" : score >= 60 ? "warning" : "danger"} className="text-lg px-3 py-1">
                  {score} / 100
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {score >= 85 ? "Excellent" : score >= 60 ? "Good" : "Needs Improvement"}
                </span>
              </div>
              <Progress value={score} />
              {/* Score breakdown */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Authentication", score: Math.min(100, score + 10) },
                  { label: "Data Protection", score: Math.max(0, score - 5) },
                  { label: "Input Validation", score: Math.min(100, score + 5) },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border bg-card p-2 text-center">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <p className="text-lg font-bold">{item.score}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : empty,
          raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify({ securityScore: score }, null, 2)}</pre>,
        };
      }
      if (stepId === "remediation") {
        return {
          title: label,
          overview: testingFixedArtifacts && Object.keys(testingFixedArtifacts).length > 0 ? (
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold text-foreground">Remediation</h4>
              <p className="text-muted-foreground">{Object.keys(testingFixedArtifacts).length} file diperbaiki.</p>
            </div>
          ) : empty,
          visualCards: testingFixedArtifacts && Object.keys(testingFixedArtifacts).length > 0 ? [
            {
              id: "remediation-files",
              icon: Wrench,
              iconColor: "text-amber-400",
              title: "Remediation Files",
              description: `${Object.keys(testingFixedArtifacts).length} file diperbaiki`,
              fullscreenTitle: "Remediation Detail",
              fullscreenContent: (
                <div className="space-y-4">
                  {Object.entries(testingFixedArtifacts).map(([path, content], i) => (
                    <div key={i} className="rounded-md border p-4">
                      <p className="font-mono text-xs font-medium text-muted-foreground">{path}</p>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{content}</pre>
                    </div>
                  ))}
                </div>
              ),
            },
          ] : undefined,
          visual: testingFixedArtifacts && Object.keys(testingFixedArtifacts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(testingFixedArtifacts).map(([path, content]) => (
                <div key={path} className="rounded-md border p-2">
                  <p className="font-mono text-xs font-medium">{path}</p>
                  <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{content}</pre>
                </div>
              ))}
            </div>
          ) : empty,
          raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(testingFixedArtifacts ?? {}, null, 2)}</pre>,
        };
      }
      if (stepId === "recommendations") {
        return {
          title: label,
          overview: recommendations.length > 0 ? (
            <div className="space-y-3 text-sm">
              <h4 className="font-semibold text-foreground">Recommendations</h4>
              <p className="text-muted-foreground">{recommendations.length} rekomendasi keamanan tersedia.</p>
            </div>
          ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
          visualCards: recommendations.length > 0 ? [
            {
              id: "dev-recommendations",
              icon: Lightbulb,
              iconColor: "text-amber-400",
              title: "Development Recommendations",
              description: `${recommendations.length} rekomendasi`,
              fullscreenTitle: "Recommendations Detail",
              fullscreenContent: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.map((r, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-amber-900 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-amber-400">{i + 1}</span>
                        </span>
                        <span className="text-sm font-medium">{r.title}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{r.content}</p>
                    </div>
                  ))}
                </div>
              ),
            },
          ] : undefined,
          visual: recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((r) => (
                <div key={r.id} className="rounded-md border p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                    <Badge variant="muted">{r.category}</Badge>
                  </div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{r.content}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
          raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(recommendations.map(r => ({ title: r.title, severity: r.severity })), null, 2)}</pre>,
        };
      }
      return {
        title: label,
        overview: matchingFiles.length > 0 ? (
          <div className="space-y-3 text-sm">
            <h4 className="font-semibold text-foreground">Code Files</h4>
            <p className="text-muted-foreground">{matchingFiles.length} file cocok untuk langkah ini.</p>
          </div>
        ) : empty,
        visualCards: matchingFiles.length > 0 ? matchingFiles.map(([path, content]) => ({
          id: path,
          icon: FileCode2,
          iconColor: "text-emerald-400",
          title: path.split("/").pop() || path,
          description: `${content.split("\n").length} lines`,
          fullscreenTitle: path.split("/").pop() || path,
          fullscreenContent: (
            <pre className="text-xs sm:text-sm font-mono whitespace-pre-wrap bg-muted rounded-lg p-3 sm:p-4">
              {content}
            </pre>
          ),
        })) : undefined,
        visual: matchingFiles.length > 0 ? (
          <div className="space-y-2">
            {matchingFiles.map(([path, content]) => (
              <div key={path} className="rounded-md border p-2">
                <p className="font-mono text-xs font-medium">{path}</p>
                <pre className="mt-1 max-h-40 overflow-auto rounded bg-muted p-2 text-xs">{content}</pre>
              </div>
            ))}
          </div>
        ) : empty,
        raw: matchingFiles.length > 0 ? (
          <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(matchingFiles.map(([p]) => p), null, 2)}</pre>
        ) : empty,
      };
    }

    if (stage.code === "handover") {
      switch (stepId) {
        case "manual":
          return {
            title: label,
            overview: handoverManualBook ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Manual Book</h4>
                <p className="text-muted-foreground">Dokumentasi manual untuk deployment dan penggunaan.</p>
              </div>
            ) : empty,
            visualCards: handoverManualBook ? [
              {
                id: "handover-manual",
                icon: BookOpen,
                iconColor: "text-amber-400",
                title: "Manual Book",
                description: "Dokumentasi deployment dan penggunaan",
                fullscreenTitle: "Manual Book Detail",
                fullscreenContent: (
                  <div className="p-4 whitespace-pre-line">
                    {handoverManualBook}
                  </div>
                ),
              },
            ] : undefined,
            visual: handoverManualBook ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-sm">{handoverManualBook}</div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{handoverManualBook || "null"}</pre>,
          };
        case "compliance":
          return {
            title: label,
            overview: handoverComplianceReport ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Compliance Report</h4>
                <p className="text-muted-foreground">Laporan kepatuhan terhadap framework keamanan.</p>
              </div>
            ) : empty,
            visualCards: handoverComplianceReport ? [
              {
                id: "handover-compliance",
                icon: ClipboardCheck,
                iconColor: "text-emerald-400",
                title: "Compliance Report",
                description: "Laporan kepatuhan terhadap framework keamanan",
                fullscreenTitle: "Compliance Report Detail",
                fullscreenContent: (
                  <div className="p-4 whitespace-pre-line">
                    {handoverComplianceReport}
                  </div>
                ),
              },
            ] : undefined,
            visual: handoverComplianceReport ? (
              <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-sm">{handoverComplianceReport}</div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{handoverComplianceReport || "null"}</pre>,
          };
        case "checklist":
          return {
            title: label,
            overview: handoverReleaseChecklist.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Release Checklist</h4>
                <p className="text-muted-foreground">{handoverReleaseChecklist.length} item untuk release.</p>
              </div>
            ) : empty,
            visual: handoverReleaseChecklist.length > 0 ? (
              <div className="space-y-2">
                {handoverReleaseChecklist.map((item, i) => (
                  <label key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5 cursor-pointer hover:bg-muted/50">
                    <input type="checkbox" className="mt-1 rounded border-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </label>
                ))}
              </div>
            ) : empty,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(handoverReleaseChecklist, null, 2)}</pre>,
          };
        case "export":
          return {
            title: label,
            overview: (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Export</h4>
                <p className="text-muted-foreground">Gunakan tombol Download ZIP atau Push to GitHub di panel Deliverables.</p>
              </div>
            ),
            visual: (
              <div className="rounded-lg border bg-card p-4 text-center">
                <p className="text-sm text-muted-foreground">Gunakan tombol Download ZIP atau Push to GitHub di panel Deliverables.</p>
              </div>
            ),
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{"{}"}</pre>,
          };
        case "recommendations":
          return {
            title: label,
            overview: recommendations.length > 0 ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">Recommendations</h4>
                <p className="text-muted-foreground">{recommendations.length} rekomendasi keamanan tersedia.</p>
              </div>
            ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
            visualCards: recommendations.length > 0 ? recommendations.map((r) => ({
              id: r.id,
              icon: ShieldCheck,
              iconColor: r.severity === "critical" || r.severity === "high" ? "text-red-400" : "text-amber-400",
              title: r.title,
              description: r.category,
              fullscreenTitle: r.title,
              fullscreenContent: (
                <div className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={SEVERITY_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                    <Badge variant="muted">{r.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.content}</p>
                </div>
              ),
            })) : undefined,
            visual: recommendations.length > 0 ? (
              <div className="space-y-3">
                {recommendations.map((r) => (
                  <div key={r.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge variant={SEVERITY_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                      <Badge variant="muted">{r.category}</Badge>
                    </div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{r.content}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground italic">Belum ada rekomendasi.</p>,
            raw: <pre className="text-xs bg-muted rounded p-3 overflow-auto">{JSON.stringify(recommendations.map(r => ({ title: r.title, severity: r.severity })), null, 2)}</pre>,
          };
        default:
          return { title: label, overview: empty, visual: empty, raw: empty };
      }
    }

    return { title: label, overview: empty, visual: empty, raw: empty };
  }

  const isDesign = stage.code === "design";
  const isAnalysis = stage.code === "analysis";
  const isCodeStage = stage.code === "development" || stage.code === "testing";
  const isHandover = stage.code === "handover";
  const currentStageStatus = stages.find((s) => s.code === stage.code)?.status;
  const stageAlreadyCompleted = currentStageStatus === "completed";

  return (
    <div className="flex h-[calc(100svh-3.5rem)] flex-col max-md:h-auto max-md:min-h-[calc(100svh-3.5rem)]">
      {/* Top bar + stepper */}
      <div className="border-b">
        <div className="flex flex-col gap-2 px-4 py-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link href={`/${lang}/dashboard`} className="text-muted-foreground hover:text-foreground">
              {dict.studio.back}
            </Link>
            <ArrowRight className="size-3 text-muted-foreground" />
            <span className="font-medium">{project.name}</span>
            <Badge variant="secondary">{project.version}</Badge>
            {project.outputLanguage !== "en" && (
              <Badge variant="outline">{project.outputLanguage.toUpperCase()}</Badge>
            )}
          </div>

          <nav className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {stages.map((s) => {
              const active = s.code === stage.code;
              const completed = s.status === "completed";
              const reachable = stages
                .filter((x) => x.orderIndex < s.orderIndex)
                .every((x) => x.status === "completed");
              const locked = !completed && !active && !reachable;
              const linkClass = `flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : completed
                    ? "text-success hover:bg-accent"
                    : locked
                      ? "cursor-not-allowed text-muted-foreground/50"
                      : "text-muted-foreground hover:bg-accent"
              }`;
              return locked ? (
                <span key={s.code} className={linkClass} title={dict.studio.lockHint}>
                  <Lock className="size-3.5" />
                  {s.orderIndex + 1}. {stageName(s.code)}
                </span>
              ) : (
                <Link
                  key={s.code}
                  href={`/${lang}/studio/${project.id}/${s.code}`}
                  className={linkClass}
                >
                  {completed && !active && <CheckCircle2 className="size-3.5" />}
                  {s.orderIndex + 1}. {stageName(s.code)}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex flex-col gap-2 px-4 pb-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Lock className="size-3.5 text-success" />
              {stageDesc}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={completeStage}
              disabled={completing || completionGaps.length > 0 || stageAlreadyCompleted}
              title={completionGaps.length > 0 ? stepMeta(completionGaps[0]).label : undefined}
            >
              {completing ? <Loader2 className="animate-spin" /> : <CheckCheck className="size-4" />}
              {isHandover ? dict.studio.finishProject : dict.studio.completeStage}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="flex border-b md:hidden">
        {(["navigate", "chat", "security"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex flex-1 items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors ${
              mobileTab === tab
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "navigate" && <ListChecks className="size-3.5" />}
            {tab === "chat" && <Bot className="size-3.5" />}
            {tab === "security" && <ShieldCheck className="size-3.5" />}
            {tab === "navigate" ? dict.studio.subSteps : tab === "chat" ? dict.studio.chatTitle : dict.studio.securityPanel}
          </button>
        ))}
      </div>

      {/* 3-column body */}
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-6 lg:grid-cols-12">
        {/* Left: Sub-steps & Deliverables */}
        <aside className={`flex min-h-0 flex-col border-b md:flex md:col-span-2 lg:col-span-3 lg:border-r lg:border-b-0 ${mobileTab !== "navigate" ? "max-md:hidden" : ""}`}>
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-2"><ListChecks className="size-4" /> {dict.studio.subSteps}</span>
            <Badge variant="secondary" className="text-[9px]">
              {stepRows.filter((s) => s.met).length}/{stepRows.length}
            </Badge>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            <ol className="space-y-1.5">
              {stepRows.map((s) => {
                const meta = stepMeta(s.id);
                return (
                  <li key={s.id} className="flex items-start gap-2">
                    {s.met ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : s.locked ? (
                      <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground/40" />
                    ) : (
                      <X className="mt-0.5 size-4 shrink-0 text-warning" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-xs font-medium ${
                          s.met ? "text-foreground" : s.locked ? "text-muted-foreground/40" : "text-foreground"
                        }`}
                      >
                        {meta.label}
                        {s.current && (
                          <span className="ml-1 text-[10px] font-semibold text-warning">
                            ({dict.studio.advanceCriteria})
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setActiveStepResult(s.id)}
                          className="ml-1 inline-flex rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground align-middle"
                          title={`Lihat hasil: ${meta.label}`}
                        >
                          <Eye className="size-3" />
                        </button>
                      </p>
                      {meta.detail && (
                        <p className="hidden text-[11px] text-muted-foreground md:block">{meta.detail}</p>
                      )}
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {s.nistTasks.map((t) => (
                          <Badge key={t} variant="secondary" className="font-mono text-[9px]">{t}</Badge>
                        ))}
                        {s.isoControls.map((iso) => (
                          <Badge key={iso} variant="outline" className="font-mono text-[9px]">{iso}</Badge>
                        ))}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
            {completionGaps.length > 0 && (
              <div className="mt-3 rounded-md border border-warning/40 bg-warning/5 px-3 py-2">
                <p className="mb-1 text-[11px] font-semibold text-warning">{dict.studio.criteriaTitle}</p>
                <ul className="space-y-0.5">
                  {completionGaps.map((g) => (
                    <li key={g} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                      <X className="mt-0.5 size-3 shrink-0 text-warning" />
                      {stepMeta(g).label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {completionGaps.length > 0 && props.nextStageName && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {dict.studio.nextStage}{" "}
                <span className="font-semibold text-foreground">{props.nextStageName}</span>
              </p>
            )}
            {isHandover && (
              <div className="mt-4 border-t pt-4">
                <DeliverablesPanel
                  projectId={project.id}
                  version={project.version}
                  codeArtifacts={codeArtifacts}
                  latestRevision={latestRevision}
                  badgePublic={project.badgePublic}
                  projectStatus={project.status}
                  completedStages={stages.filter((s) => s.status === "completed").length}
                  totalStages={stages.length}
                  dict={dict}
                  lang={lang}
                />
              </div>
            )}
          </div>
        </aside>

        {/* Center: AI Prompt Engine + Stage Results */}
        <section className={`flex min-h-0 flex-col md:flex md:col-span-2 lg:col-span-6 ${mobileTab !== "chat" ? "max-md:hidden" : ""}`}>
          <div className="flex items-center justify-between border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-2"><Bot className="size-4" /> AI Prompt Engine</span>
            <div className="flex items-center gap-2">
              {!isHandover && !isAnalysis && !isDesign && codeArtifacts && Object.keys(codeArtifacts).length > 0 && (
                <Button size="sm" variant="outline" onClick={downloadArtifacts}>
                  <Download className="size-3.5" /> {dict.studio.downloadArtifacts}
                </Button>
              )}
              {project.status === "in_revision" && (
                <Badge variant="warning">
                  <GitPullRequestArrow className="size-3" /> {dict.studio.revisionBadge}
                </Badge>
              )}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {/* Stage results (above chat) */}
            {isAnalysis && (
              <div className="space-y-4 border-b p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Languages className="size-4 text-primary" /> {dict.studio.outputLanguage}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={outputLanguage} onValueChange={changeOutputLanguage} disabled={savingLanguage}>
                      <SelectTrigger className="h-8 w-full max-w-[160px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(dict.dashboard.languages).map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {savingLanguage && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
                  </div>
                </div>
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 text-sm font-semibold">{dict.studio.stackTitle}</h3>
                  {analysisInfo?.recommendedStack ? (
                    <div className="space-y-1 font-mono text-xs">
                      {Object.entries(analysisInfo.recommendedStack).map(([k, v]) => (
                        <div key={k}>
                          <span className="text-muted-foreground">{k}:</span>{" "}
                          {Array.isArray(v) ? v.join(", ") : String(v)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">{dict.studio.askAnalyze}</p>
                      <Button size="sm" variant="outline" className="self-start" onClick={() => sendPrompt("Run the stage analysis for this project and output the full structured JSON result (recommendedStack, securityRequirements, recommendations).")} disabled={loading}>
                        <Wand2 className="size-3" /> {dict.studio.startStage}
                      </Button>
                    </div>
                  )}
                </div>
                {analysisInfo?.securityRequirements && analysisInfo.securityRequirements.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.securityRequirementsTitle}</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {analysisInfo.securityRequirements.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
                {props.analysisDataClassification.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">Data Classification</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {props.analysisDataClassification.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {isDesign && (
              <div className="space-y-4 border-b p-4">
                {uiDesign.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.uiDesignTitle}</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {uiDesign.map((u, i) => <li key={i}>{u}</li>)}
                    </ul>
                  </div>
                )}
                {architecture.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.architectureTitle}</h3>
                    <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">
                      {architecture.map((a, i) => <li key={i}>{a}</li>)}
                    </ul>
                  </div>
                )}
                {threatModel.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.threatModelTitle}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[500px] text-left text-[11px]">
                        <thead>
                          <tr className="border-b text-muted-foreground">
                            <th className="py-1 pr-2 font-medium">Threat</th>
                            <th className="py-1 pr-2 font-medium">Likelihood</th>
                            <th className="py-1 pr-2 font-medium">Impact</th>
                            <th className="py-1 font-medium">Mitigation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {threatModel.map((t, i) => (
                            <tr key={i} className="border-b last:border-0">
                              <td className="py-1.5 pr-2 align-top">{String(t.threat ?? "")}</td>
                              <td className="py-1.5 pr-2 align-top">{String(t.likelihood ?? "—")}</td>
                              <td className="py-1.5 pr-2 align-top">{String(t.impact ?? "—")}</td>
                              <td className="py-1.5 align-top">{String(t.mitigation ?? "—")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {diagrams.map((d, i) => (
                  <div key={i} className="rounded-lg border p-4">
                    <h3 className="mb-2 text-sm font-semibold">{dict.studio.diagram} {i + 1}</h3>
                    <MermaidDiagram code={d} id={`${stage.code}-${i}`} />
                  </div>
                ))}
                {diagrams.length === 0 && threatModel.length === 0 && (
                  <div className="flex flex-col gap-2 rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                    <p>{dict.studio.askThreatModel}</p>
                    <Button size="sm" variant="outline" className="self-center" onClick={() => sendPrompt("Produce the STRIDE threat model and architecture design with Mermaid diagrams, and output the full structured JSON result (architecture, threatModel, mermaid, recommendations).")} disabled={loading}>
                      <Wand2 className="size-3" /> {dict.studio.startStage}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {(isCodeStage || isHandover) && codeArtifacts && (
              <div className="border-b">
                <div className="flex gap-1 overflow-x-auto scrollbar-none border-b p-2">
                  {sortedFiles.map((f) => (
                    <button key={f} onClick={() => { setActiveFile(f); setActiveFix(null); }} className={`flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs transition-colors ${activeFile === f ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-accent"}`}>
                      <FolderTree className="size-3" />
                      {f}
                    </button>
                  ))}
                  {sortedFiles.length === 0 && <span className="px-2 py-1 text-xs text-muted-foreground">{dict.studio.noFilesHint}</span>}
                </div>
                {snapshots.length > 0 && (
                  <details className="border-b px-4 py-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">{dict.studio.snapshots} ({snapshots.length})</summary>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-2">
                      {snapshots.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 border-b py-1 text-[11px] last:border-0">
                          <span className="font-mono text-muted-foreground">{s.version}</span>
                          <span className="line-clamp-1 flex-1 text-muted-foreground">{s.diffSummary}</span>
                          <span className="text-muted-foreground">{s.fileCount} {dict.studio.files}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="min-h-0" style={{ height: "calc(100% - 40px)" }}>
                  {activeFix?.suggestedCode && activeFix?.filePath ? (
                    <div className="flex h-full flex-col">
                      <div className="flex items-center justify-between gap-2 border-b bg-success/5 px-4 py-2">
                        <span className="text-xs font-semibold text-success">
                          {dict.studio.suggestedFixTitle}{activeFix.nistControl?.taskCode ?? "NIST"}
                          {activeFix.filePath ? ` · ${activeFix.filePath}` : ""}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => setActiveFix(null)}>
                            <X className="size-3" /> {dict.studio.rejectFix}
                          </Button>
                          <Button size="sm" onClick={() => applyFix(activeFix)}>
                            <CheckCheck className="size-3" /> {dict.studio.applyFix}
                          </Button>
                        </div>
                      </div>
                      <div className="min-h-0 flex-1">
                        <MonacoDiff
                          original={activeFix.filePath ? codeArtifacts?.[activeFix.filePath] ?? "" : activeFix.content}
                          modified={activeFix.suggestedCode}
                          language={activeFix.filePath ? inferLanguage(activeFix.filePath) : "javascript"}
                        />
                      </div>
                    </div>
                  ) : activeFile && codeArtifacts?.[activeFile] !== undefined ? (
                    <FileEditor value={codeArtifacts[activeFile]} language={inferLanguage(activeFile)} readOnly loadingLabel={dict.studio.loadingEditor} />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-xs text-muted-foreground">
                      {dict.studio.emptyFiller}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Chat messages */}
            <div className="space-y-3 p-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">
                  <Wand2 className="size-6" />
                  <span>
                    {isAnalysis ? dict.studio.analysisEmpty : isDesign ? dict.studio.designEmpty : isCodeStage ? dict.studio.codeEmpty : dict.studio.handoverEmpty}
                  </span>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Bot className="size-3.5" />
                    </span>
                  )}
                  <div className={`whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card"}`}>
                    {m.role === "assistant" ? displayAssistantText(m.content) : m.content}
                  </div>
                  {m.role === "user" && (
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-muted">
                      <User className="size-3.5" />
                    </span>
                  )}
                </div>
              ))}

              {/* Active Plan Card */}
              {activePlan && (
                <PlanCard
                  plan={activePlan}
                  onApprove={() => {
                    setChatMode("build");
                    const buildPrompt = `Execute the approved plan: ${activePlan.summary}`;
                    setInput(buildPrompt);
                    // Pass the mode explicitly: the plan must actually be built,
                    // not re-planned (see sendPrompt's `mode` parameter).
                    void sendPrompt(buildPrompt, "build");
                  }}
                  onCancel={() => {
                    setActivePlan(null);
                    setChatMode("plan");
                  }}
                  loading={buildLoading}
                />
              )}

              {/* Build Result Card */}
              {buildResult && (
                <BuildResultCard
                  result={buildResult}
                  onViewChanges={() => {
                    if (codeArtifacts) {
                      const firstFile = Object.keys(codeArtifacts)[0];
                      if (firstFile) setActiveFile(firstFile);
                    }
                  }}
                />
              )}
              {loading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  <Bot className="size-4" /> {dict.studio.thinking}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {error && (
            <div className="mx-4 mb-2 flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          )}
          {structuredWarning && (
            <div className="mx-4 mb-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <div className="flex-1">
                  <p>{dict.studio.structuredFailed}</p>
                  <Button size="sm" variant="outline" className="mt-2 h-7 text-xs" onClick={reparse} disabled={reparsing}>
                    {reparsing ? <Loader2 className="animate-spin" /> : <RotateCcw className="size-3" />}
                    {dict.studio.reparse}
                  </Button>
                </div>
              </div>
            </div>
          )}
          {truncatedWarning && (
            <div className="mx-4 mb-2 flex items-start gap-2 rounded-md border border-warning/50 bg-warning/10 px-3 py-2 text-xs text-warning">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
              {dict.studio.truncatedWarning}
            </div>
          )}

          <div className="border-t p-3">
            {/* Mode selector */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex rounded-lg border bg-muted p-0.5">
                <button
                  onClick={() => setChatMode("plan")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chatMode === "plan"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📋 Plan
                </button>
                <button
                  onClick={() => setChatMode("build")}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    chatMode === "build"
                      ? "bg-emerald-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔨 Build
                </button>
              </div>
              {activePlan && chatMode === "build" && (
                <span className="text-[10px] text-emerald-400">
                  {activePlan.actions.length} actions ready
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendPrompt();
                  }
                }}
                placeholder={
                  chatMode === "plan"
                    ? dict.studio.chatPlaceholder
                    : activePlan
                      ? "Describe what to build based on the approved plan..."
                      : "Direct mode — AI will execute immediately"
                }
                rows={3}
                className="resize-none font-mono text-xs"
              />
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{dict.studio.shortcutHint}</span>
              <Button size="sm" onClick={() => sendPrompt()} disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                {chatMode === "plan" ? dict.studio.send : "Build"}
              </Button>
            </div>
          </div>
        </section>

        {/* Right: Security & Compliance */}
        <aside className={`flex min-h-0 flex-col border-t md:border-l md:border-t-0 lg:col-span-3 ${mobileTab !== "security" ? "max-md:hidden" : ""}`}>
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-4" /> Security & Compliance
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">{dict.studio.score}</span>
                {score == null ? (
                  <Badge variant="secondary">{dict.studio.notScored}</Badge>
                ) : (
                  <Badge variant={score >= 85 ? "success" : score >= 60 ? "warning" : "danger"}>
                    {score} / 100
                  </Badge>
                )}
              </div>
              <Progress
                value={score ?? 0}
                indicatorClassName={
                  score == null
                    ? "bg-muted"
                    : score >= 85
                      ? "bg-success"
                      : score >= 60
                        ? "bg-warning"
                        : "bg-danger"
                }
              />
            </div>

            <div className="rounded-lg border p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium">{dict.studio.stageSecurityParams}</span>
                <div className="flex gap-1">
                  {stage.nistGroups.map((g) => (
                    <Badge key={g} variant="outline">{g}</Badge>
                  ))}
                </div>
              </div>

              <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                NIST SSDF → ISO 27001
              </div>
              <div className="flex flex-wrap gap-1">
                {stage.nistTasks.map((t) => (
                  <Badge key={t} variant="secondary" className="font-mono text-[10px]">{t}</Badge>
                ))}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {stage.isoControls.map((iso) => (
                  <Badge key={iso} variant="outline" className="font-mono text-[10px]">{iso}</Badge>
                ))}
              </div>

              <div className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {dict.studio.secureParams}
              </div>
              <ul className="space-y-1">
                {stageSecureParams.map((p) => (
                  <li key={p} className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="mt-0.5 size-3 shrink-0 text-success" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            {recommendations.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                {dict.studio.noRecommendations}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground">{dict.studio.nistChecks}</div>
                  {(["PO", "PW", "PS", "RV"] as const).map((group) => {
                    const groupTasks = stage.nistTasks
                      .filter((t) => t.startsWith(`${group}.`))
                      .filter((task) => recommendations.some((r) => r.nistControl?.taskCode === task));
                    if (groupTasks.length === 0) return null;
                    const allApplied = groupTasks.every((task) =>
                      recommendations.some((r) => r.isApplied && r.nistControl?.taskCode === task),
                    );
                    return (
                      <div key={group} className="min-w-0 rounded-md border border-dashed p-2">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-[11px] font-bold">{group}</span>
                          {allApplied ? (
                            <CheckCircle2 className="size-3.5 text-success" />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">·</span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          {groupTasks.slice(0, 6).map((task) => {
                            const applied = recommendations.some(
                              (r) => r.isApplied && r.nistControl?.taskCode === task,
                            );
                            return (
                              <div key={task} className="flex items-center justify-between text-xs">
                                <span className="font-mono">{task}</span>
                                {applied ? (
                                  <CheckCircle2 className="size-3.5 text-success" />
                                ) : (
                                  <span className="text-muted-foreground">·</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="text-xs font-semibold text-muted-foreground">{dict.studio.isoMapping}</div>
                  {recommendations
                    .flatMap((r) => r.nistControl?.iso27001Mapping ?? [])
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .slice(0, 14)
                    .map((iso) => (
                      <div key={iso} className="flex items-center justify-between font-mono text-xs">
                        <span>{iso}</span>
                        {recommendations.some((r) => r.isApplied && r.nistControl?.iso27001Mapping.includes(iso)) ? (
                          <CheckCircle2 className="size-3.5 text-success" />
                        ) : (
                          <span className="text-muted-foreground">·</span>
                        )}
                      </div>
                    ))}
                </div>

                <div className="flex flex-col gap-2">
                  <div className="text-xs font-semibold text-muted-foreground">{dict.studio.recommendations}</div>
                  {recommendations.map((r) => (
                    <div key={r.id} className="rounded-lg border p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <Badge variant={SEVERITY_VARIANT[r.severity] ?? "secondary"}>{r.severity}</Badge>
                        <Badge variant="muted">{r.category}</Badge>
                        <button
                          onClick={() => toggleApplied(r)}
                          title={r.isApplied ? dict.studio.markNotApplied : dict.studio.markApplied}
                          className={`ml-auto rounded-md p-1 transition-colors ${
                            r.isApplied
                              ? "text-success hover:bg-success/10"
                              : "text-muted-foreground hover:bg-accent"
                          }`}
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                      </div>
                      <p className="text-xs font-medium">{r.title}</p>
                      <p className="mt-1 text-[11px] font-semibold text-success">{dict.studio.actionSteps}</p>
                      <p className="mt-1 whitespace-pre-line text-[11px] text-muted-foreground">{r.content}</p>
                      {isCodeStage && r.suggestedCode && (
                        <Button size="sm" variant="outline" className="mt-2" onClick={() => setActiveFix(r)}>
                          <Wand2 className="size-3" /> {dict.studio.autoFix}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <Dialog open={activeStepResult !== null} onOpenChange={(open) => { if (!open) setActiveStepResult(null); }}>
        <DialogContent
          className="max-h-[90vh] overflow-y-auto sm:max-w-5xl"
          onEscapeKeyDown={(e) => { if (fullscreenOpen) e.preventDefault(); }}
        >
          <DialogHeader>
            <DialogTitle>{activeStepResult ? getStepResultContent(activeStepResult).title : ""}</DialogTitle>
            <DialogDescription>
              {stage.name} — {dict.studio.subSteps}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            {activeStepResult && (
              <StepResultDialog
                title={getStepResultContent(activeStepResult).title}
                stageName={stage.name}
                overview={getStepResultContent(activeStepResult).overview}
                visual={getStepResultContent(activeStepResult).visual}
                visualCards={getStepResultContent(activeStepResult).visualCards}
                raw={getStepResultContent(activeStepResult).raw}
                onFullscreenStateChange={setFullscreenOpen}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    );
}
