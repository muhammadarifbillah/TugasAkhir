"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  Bot,
  Bug,
  CheckCheck,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileCode2,
  FileText,
  GitBranch,
  GitPullRequestArrow,
  Languages,
  Layout,
  Lightbulb,
  ListChecks,
  Loader2,
  Lock,
  Maximize2,
  MoreHorizontal,
  Network,
  Play,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  User,
  Wand2,
  Wrench,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
import { MonacoDiff, inferLanguage } from "@/components/studio/code-editor";
import { CodeWorkspace } from "@/components/studio/code-workspace";
import { SecurityScanPanel } from "@/components/studio/security-scan-panel";
import { TraceabilityPanel } from "@/components/studio/traceability-panel";
import { DesignScreen } from "@/components/studio/design-screen";
import { FullscreenViewer } from "@/components/studio/fullscreen-viewer";
import { RunWorkspace } from "@/components/studio/run-workspace";
import { DesignStudioDialog } from "@/components/studio/design-studio-dialog";
import { normalizeScreens, type DesignScreen as DesignScreenType } from "@/lib/design";
import { MermaidDiagram } from "@/components/studio/mermaid-diagram";
import { DeliverablesPanel } from "@/components/studio/deliverables-panel";
import { PlanCard, BuildResultCard } from "@/components/studio/plan-card";
import { StepResultDialog } from "@/components/studio/step-result-dialog";
import { type VisualCardDef } from "@/components/studio/step-result-dialog";
import { ToastProvider, useToast } from "@/components/ui/toast";
import { csrfFetch } from "@/lib/csrf-client";
import { erdCardinalitySummary, generateErdFromSchema } from "@/lib/erd";
import { levelBadgeClass } from "@/lib/severity";
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
export type ChatMode = "plan" | "build" | "direct";

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
    finalizedAt: string | null;
    database: { service: string; hostPort: number; url: string; status: string } | null;
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
  designScreens: unknown;
  designPlan: unknown;
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
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingFiles, setSavingFiles] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [showDesignCanvas, setShowDesignCanvas] = useState(false);
  const [designFullscreen, setDesignFullscreen] = useState<DesignScreenType | null>(null);
  const [designFsMax, setDesignFsMax] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(props.project.finalizedAt);
  const [database, setDatabase] = useState(props.project.database);
  const [dbBusy, setDbBusy] = useState(false);
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
  const [maximized, setMaximized] = useState(false);
  const [promptCollapsed, setPromptCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [morePos, setMorePos] = useState<{ top: number; right: number } | null>(null);
  const moreBtnRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const toggleMoreMenu = useCallback(() => {
    if (moreOpen) {
      setMoreOpen(false);
      return;
    }
    const rect = moreBtnRef.current?.getBoundingClientRect();
    if (rect) setMorePos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setMoreOpen(true);
  }, [moreOpen]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!moreBtnRef.current?.contains(t) && !moreMenuRef.current?.contains(t)) setMoreOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [moreOpen]);

  // Stable identity: StepResultDialog syncs this in an effect, so an inline
  // callback would re-run it on every render and immediately undo maximize.
  const handleFullscreenChange = useCallback((open: boolean) => {
    setFullscreenOpen(open);
    // Always reset: closing a maximized popup must not leave the underlying
    // step-result dialog fullscreen, and reopening must start minimized.
    setMaximized(false);
  }, []);

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

  const dirtyFiles = useMemo(
    () => new Set(Object.keys(drafts).filter((f) => drafts[f] !== codeArtifacts?.[f])),
    [drafts, codeArtifacts],
  );

  const designScreens = useMemo(() => normalizeScreens(props.designScreens), [props.designScreens]);

  function handleFileChange(file: string, value: string) {
    setDrafts((prev) => ({ ...prev, [file]: value }));
  }

  async function saveFiles(files: string[]) {
    if (files.length === 0) return;
    const payload: Record<string, string> = {};
    for (const file of files) payload[file] = drafts[file] ?? codeArtifacts?.[file] ?? "";
    setSavingFiles(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/artifacts`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectStageId: stage.projectStageId, files: payload }),
      });
      const data = (await res.json()) as { error?: string; problems?: string[] };
      if (!res.ok) {
        setError(data.problems?.join("; ") ?? data.error ?? dict.studio.requestFailed);
        return;
      }
      setCodeArtifacts((prev) => ({ ...(prev ?? {}), ...payload }));
      setDrafts((prev) => {
        const next = { ...prev };
        for (const file of files) delete next[file];
        return next;
      });
      addToast("success", dict.studio.filesSaved);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setSavingFiles(false);
    }
  }

  async function restoreSnapshot(snapshotId: string) {
    setRestoringId(snapshotId);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/snapshots/${snapshotId}/restore`, {
        method: "POST",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      addToast("success", dict.studio.snapshotRestored);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setRestoringId(null);
    }
  }

  async function toggleFinalize() {
    setDbBusy(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/finalize`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalized: !finalizedAt }),
      });
      const data = (await res.json()) as { error?: string; finalizedAt?: string | null };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      setFinalizedAt(data.finalizedAt ?? null);
      addToast("success", data.finalizedAt ? dict.studio.markedFixed : dict.studio.unmarkedFixed);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setDbBusy(false);
    }
  }

  async function createDatabase() {
    setDbBusy(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/database`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        database?: { service: string; hostPort: number; url: string; status: string };
      };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      setDatabase(data.database ?? null);
      addToast("success", dict.studio.databaseCreated);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setDbBusy(false);
    }
  }

  async function deleteDatabase() {
    setDbBusy(true);
    setError(null);
    try {
      const res = await csrfFetch(`/api/projects/${project.id}/database`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? dict.studio.requestFailed);
        return;
      }
      setDatabase(null);
      addToast("success", dict.studio.databaseDeleted);
      router.refresh();
    } catch {
      setError(dict.studio.networkError);
    } finally {
      setDbBusy(false);
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
                iconColor: "text-primary",
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
                  <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-primary" />
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
                iconColor: "text-muted-foreground",
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
                iconColor: "text-success",
                title: "Security Requirements",
                description: `${analysisInfo.securityRequirements.length} persyaratan teridentifikasi`,
                fullscreenTitle: "Security Requirements Detail",
                fullscreenContent: (
                  <div className="p-4">
                    {analysisInfo.securityRequirements.map((r, i) => (
                      <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5 mb-1">
                        <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-bold text-success">{i + 1}</span>
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
                    <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-success">{i + 1}</span>
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
                iconColor: "text-danger",
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
                          const color = levelBadgeClass(level);
                          return (
                            <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
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
                      const color = levelBadgeClass(level);
                      return (
                        <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
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
                iconColor: "text-warning",
                title: "Analysis Recommendations",
                description: `${recommendations.length} rekomendasi dari analisis`,
                fullscreenTitle: "Recommendations Detail",
                fullscreenContent: (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {recommendations.map((r, i) => (
                      <div key={i} className="rounded-md border p-3">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="w-3 h-3 rounded bg-warning/15 flex items-center justify-center shrink-0">
                            <span className="text-[8px] font-bold text-warning">{i + 1}</span>
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
        case "ui": {
          const hasDesigns = designScreens.length > 0;
          const mockupGrid = (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {designScreens.map((s) => (
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
          return {
            title: label,
            overview: uiDesign.length > 0 || hasDesigns ? (
              <div className="space-y-3 text-sm">
                <h4 className="font-semibold text-foreground">UI Design</h4>
                <p className="text-muted-foreground">
                  {uiDesign.length} komponen UI teridentifikasi · {designScreens.length} mockup tersimpan.
                </p>
              </div>
            ) : empty,
            visualCards: hasDesigns
              ? [
                  {
                    id: "ui-mockups",
                    icon: Layout,
                    iconColor: "text-purple-400",
                    title: "UI Mockups",
                    description: `${designScreens.length} mockup`,
                    fullscreenTitle: "UI Mockups",
                    fullscreenContent: <div className="p-4">{mockupGrid}</div>,
                  },
                ]
              : undefined,
            visual:
              uiDesign.length > 0 || hasDesigns ? (
                <div className="space-y-3">
                  {hasDesigns && mockupGrid}
                  {uiDesign.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {uiDesign.map((u, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border bg-card p-2.5">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-purple-900">
                            <span className="text-[10px] font-bold text-purple-400">{i + 1}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{u}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : empty,
            raw: (
              <pre className="text-xs bg-muted rounded p-3 overflow-auto">
                {JSON.stringify({ uiDesign, mockups: designScreens.length }, null, 2)}
              </pre>
            ),
          };
        }
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
                iconColor: "text-danger",
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
                          const color = levelBadgeClass(level);
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
                              <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
                                <td className="py-1.5 pr-2 align-top">{String(t.threat ?? "")}</td>
                                <td className="py-1.5 pr-2 align-top">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    levelBadgeClass(String(t.likelihood ?? ""))
                                  }`}>{String(t.likelihood ?? "—")}</span>
                                </td>
                                <td className="py-1.5 pr-2 align-top">
                                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                    levelBadgeClass(String(t.impact ?? ""))
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
                    const color = levelBadgeClass(level);
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
                        <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
                          <td className="py-1.5 pr-2 align-top">{String(t.threat ?? "")}</td>
                          <td className="py-1.5 pr-2 align-top">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              levelBadgeClass(String(t.likelihood ?? ""))
                            }`}>{String(t.likelihood ?? "—")}</span>
                          </td>
                          <td className="py-1.5 pr-2 align-top">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              levelBadgeClass(String(t.impact ?? ""))
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
              fullscreenContent: <MermaidDiagram code={d} id={`fullscreen-diagram-${i}`} variant="fullscreen" />,
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
          // Prefer the deterministic, cardinality-aware generator; the AI's own
          // erDiagram is only a fallback when the schema text yields nothing.
          const erdResult =
            generateErdFromSchema(databaseSchema) ??
            (erdDiagram ? { code: erdDiagram, tableCount: 0, relationshipCount: 0 } : null);
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
              ...(autoErdCode ? [{
                id: "erd",
                icon: GitPullRequestArrow,
                iconColor: "text-primary",
                title: "ERD Diagram",
                description: `${erdResult?.tableCount ?? 0} entities, ${erdResult?.relationshipCount ?? 0} relationships (${erdCardinalitySummary(autoErdCode)})`,
                fullscreenTitle: "Entity Relationship Diagram",
                fullscreenContent: <MermaidDiagram code={autoErdCode} id="fullscreen-erd" variant="fullscreen" />,
              }] : []),
              {
                id: "tables",
                icon: Database,
                iconColor: "text-warning",
                title: "Table Definitions",
                description: `${databaseSchema.length} definitions`,
                fullscreenTitle: "Table Definitions",
                fullscreenContent: (
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-muted rounded-lg p-6 sm:p-8">
                    {databaseSchema.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}
                  </pre>
                ),
              },
              ...(autoAuth ? [{
                id: "auth",
                icon: Lock,
                iconColor: "text-success",
                title: "Auth Flow",
                description: "Sequence diagram",
                fullscreenTitle: "Authentication Flow",
                fullscreenContent: <MermaidDiagram code={autoAuth} id="fullscreen-auth" variant="fullscreen" />,
              }] : []),
            ] : undefined,
            visual: databaseSchema.length > 0 ? (
              <div className="space-y-4">
                {autoErdCode && (
                  <div>
                    <h5 className="font-semibold text-sm mb-2">ERD Diagram</h5>
                    <MermaidDiagram code={autoErdCode} id="popup-erd" />
                  </div>
                )}
                <div>
                  <h5 className="font-semibold text-sm mb-2">Table Definitions</h5>
                  <pre className="text-sm font-mono whitespace-pre-wrap bg-muted rounded-lg p-4">{databaseSchema.map((s, i) => `${i + 1}. ${s}`).join("\n\n")}</pre>
                </div>
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
              iconColor: "text-danger",
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
                  const color = levelBadgeClass(sev);
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
        const severityBreakdown = {
          critical: testingFindings.filter((f) => String(f.severity ?? "").toLowerCase() === "critical").length,
          high: testingFindings.filter((f) => String(f.severity ?? "").toLowerCase() === "high").length,
          medium: testingFindings.filter((f) => String(f.severity ?? "").toLowerCase() === "medium").length,
          low: testingFindings.filter((f) => String(f.severity ?? "").toLowerCase() === "low").length,
          total: testingFindings.length,
        };
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
              iconColor: "text-success",
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
                  <p className="text-xs text-muted-foreground">
                    {severityBreakdown.total > 0
                      ? `Based on ${severityBreakdown.total} finding(s): ${severityBreakdown.critical} critical, ${severityBreakdown.high} high, ${severityBreakdown.medium} medium, ${severityBreakdown.low} low.`
                      : "No findings recorded for this stage yet."}
                  </p>
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
              {/* Real counts from the model's own findings — no derived numbers. */}
              <p className="text-xs text-muted-foreground">
                {severityBreakdown.total > 0
                  ? `Based on ${severityBreakdown.total} finding(s): ${severityBreakdown.critical} critical, ${severityBreakdown.high} high, ${severityBreakdown.medium} medium, ${severityBreakdown.low} low.`
                  : "No findings recorded for this stage yet."}
              </p>
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
              iconColor: "text-warning",
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
              iconColor: "text-warning",
              title: "Development Recommendations",
              description: `${recommendations.length} rekomendasi`,
              fullscreenTitle: "Recommendations Detail",
              fullscreenContent: (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {recommendations.map((r, i) => (
                    <div key={i} className="rounded-md border p-3">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="w-3 h-3 rounded bg-warning/15 flex items-center justify-center shrink-0">
                          <span className="text-[8px] font-bold text-warning">{i + 1}</span>
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
          iconColor: "text-success",
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
                iconColor: "text-warning",
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
                iconColor: "text-success",
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
                    <input id={`release-${i}`} name={`release-${i}`} aria-label={item} type="checkbox" className="mt-1 rounded border-muted-foreground/50" />
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
              iconColor: r.severity === "critical" || r.severity === "high" ? "text-danger" : "text-warning",
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
    <div className="flex h-auto min-h-0 flex-col lg:h-[calc(100dvh-3.5rem)]">
      {/* Top bar + stepper */}
      <div className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="flex flex-col gap-2 px-4 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <Link href={`/${lang}/dashboard`} className="shrink-0 text-muted-foreground hover:text-foreground">
              {dict.studio.back}
            </Link>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate font-medium">{project.name}</span>
            <Badge variant="secondary">{project.version}</Badge>
            <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
            <span className="truncate text-muted-foreground" title={stageDesc}>{stage.name}</span>
            {project.outputLanguage !== "en" && (
              <Badge variant="outline">{project.outputLanguage.toUpperCase()}</Badge>
            )}
          </div>

          <div className="flex min-w-0 items-center gap-2">
          <nav className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-none">
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
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={completeStage}
              disabled={completing || completionGaps.length > 0 || stageAlreadyCompleted}
              title={completionGaps.length > 0 ? stepMeta(completionGaps[0]).label : stageDesc}
            >
              {completing ? <Loader2 className="animate-spin" /> : <CheckCheck className="size-4" />}
              <span className="hidden sm:inline">
                {isHandover ? dict.studio.finishProject : dict.studio.completeStage}
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile tab bar */}
      <div
        role="tablist"
        aria-label="Studio panels"
        className="sticky top-0 z-20 flex border-b bg-background/95 backdrop-blur md:hidden"
      >
        {(["navigate", "chat", "security"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={mobileTab === tab}
            onClick={() => setMobileTab(tab)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors ${
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
        <aside className={`flex min-h-0 min-w-0 flex-col border-b md:flex md:col-span-2 lg:col-span-3 lg:border-r lg:border-b-0 ${mobileTab !== "navigate" ? "max-md:hidden" : ""}`}>
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
                        <p className="hidden text-[11px] text-muted-foreground md:block short:hidden">{meta.detail}</p>
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
        <section className={`relative flex min-h-0 min-w-0 flex-col md:flex md:col-span-2 lg:col-span-6 ${mobileTab !== "chat" ? "max-md:hidden" : ""}`}>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <button
              type="button"
              onClick={() => setPromptCollapsed((v) => !v)}
              aria-expanded={!promptCollapsed}
              aria-label="AI Prompt Engine"
              title="AI Prompt Engine"
              className="flex items-center gap-2 rounded-md px-1 py-0.5 hover:bg-muted hover:text-foreground"
            >
              <ChevronDown className={`size-4 transition-transform duration-300 ${promptCollapsed ? "-rotate-90" : ""}`} />
              <Bot className="size-4" /> AI Prompt Engine
            </button>
            <div className="flex items-center gap-2">
              {stage.code === "development" && codeArtifacts && Object.keys(codeArtifacts).length > 0 && (
                <Button size="sm" onClick={() => setShowRun(true)}>
                  <Play className="size-3.5" /> {dict.studio.runApp}
                </Button>
              )}
              {stage.code === "development" && (
                <>
                  <Button
                    size="sm"
                    variant={finalizedAt ? "secondary" : "outline"}
                    onClick={toggleFinalize}
                    disabled={dbBusy}
                    title={finalizedAt ? dict.studio.unmarkFixed : dict.studio.markFixed}
                  >
                    <CheckCircle2 className="size-3.5" />
                    {finalizedAt ? dict.studio.fixed : dict.studio.markFixed}
                  </Button>
                  {finalizedAt && !database && (
                    <Button size="sm" onClick={createDatabase} disabled={dbBusy}>
                      {dbBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
                      {dict.studio.createDatabase}
                    </Button>
                  )}
                  {database && (
                    <span className="flex items-center gap-1">
                      <Badge variant="success" title={database.url}>
                        <Database className="size-3" /> {database.service} :{database.hostPort}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={deleteDatabase}
                        disabled={dbBusy}
                        title={dict.studio.deleteDatabase}
                        aria-label={dict.studio.deleteDatabase}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </span>
                  )}
                </>
              )}
              {isDesign && (
                <Button size="sm" variant="outline" onClick={() => setShowDesignCanvas(true)}>
                  <Layout className="size-3.5" /> {dict.studio.designStudioOpen}
                  {designScreens.length > 0 && (
                    <Badge variant="secondary" className="ms-1">{designScreens.length}</Badge>
                  )}
                </Button>
              )}
              {((stage.code === "development" && designScreens.length > 0) ||
                (!isHandover && !isAnalysis && !isDesign && !!codeArtifacts && Object.keys(codeArtifacts).length > 0)) && (
                <div className="relative" ref={moreBtnRef}>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="More actions"
                    aria-haspopup="menu"
                    aria-expanded={moreOpen}
                    title="More actions"
                    onClick={toggleMoreMenu}
                  >
                    <MoreHorizontal className="size-4" />
                  </Button>
                  {moreOpen && morePos && createPortal(
                    <div
                      ref={moreMenuRef}
                      role="menu"
                      style={{ top: morePos.top, right: morePos.right }}
                      className="fixed z-[90] w-64 rounded-md border bg-card p-1 text-xs shadow-lg"
                    >
                      {stage.code === "development" && designScreens.length > 0 && (
                        <button
                          type="button"
                          role="menuitem"
                          disabled={loading}
                          onClick={() => {
                            setMoreOpen(false);
                            void sendPrompt(
                              "Implement the approved Design Studio designs as real pages/routes in the generated source code. Create one page/component per approved screen and match its layout, sections, colors, typography, and visible copy exactly. Return the full structured stage_result JSON with codeArtifacts.",
                              "direct",
                            );
                          }}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start hover:bg-muted disabled:opacity-50"
                        >
                          <Layout className="size-3.5 shrink-0" />
                          <span className="flex-1">{dict.studio.implementDesigns}</span>
                          {designScreens.length > 0 && <Badge variant="secondary">{designScreens.length}</Badge>}
                        </button>
                      )}
                      {!isHandover && !isAnalysis && !isDesign && !!codeArtifacts && Object.keys(codeArtifacts).length > 0 && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setMoreOpen(false);
                            void downloadArtifacts();
                          }}
                          className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start hover:bg-muted"
                        >
                          <Download className="size-3.5 shrink-0" />
                          <span className="flex-1">{dict.studio.downloadArtifacts}</span>
                        </button>
                      )}
                    </div>,
                    document.body,
                  )}
                </div>
              )}
              {project.status === "in_revision" && (
                <Badge variant="warning">
                  <GitPullRequestArrow className="size-3" /> {dict.studio.revisionBadge}
                </Badge>
              )}
            </div>
          </div>

            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
            {!promptCollapsed && (
            <>
            {/* Stage results */}
            {isAnalysis && (
              <div className="space-y-4 border-b p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    <Languages className="size-4 text-primary" /> {dict.studio.outputLanguage}
                  </div>
                  <div className="flex items-center gap-2">
                    <Select name="outputLanguage" value={outputLanguage} onValueChange={changeOutputLanguage} disabled={savingLanguage}>
                      <SelectTrigger id="studioOutputLanguage" aria-label={dict.studio.outputLanguage} className="h-8 w-full max-w-[160px] text-xs">
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
                {designScreens.length > 0 && (
                  <div className="rounded-lg border p-4">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">{dict.studio.designStudioTitle}</h3>
                      <Button size="sm" variant="outline" onClick={() => setShowDesignCanvas(true)}>
                        <Layout className="size-3.5" /> {dict.studio.designStudioOpen}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {designScreens.map((s) => (
                        <div key={s.id} className="overflow-hidden rounded-lg border bg-card">
                          <div className="flex items-center justify-between gap-2 border-b px-2 py-1 text-[11px]">
                            <span className="truncate font-medium">{s.name}</span>
                            <button
                              type="button"
                              aria-label={dict.studio.designStudioOpen}
                              onClick={() => {
                                setDesignFsMax(false);
                                setDesignFullscreen(s);
                              }}
                              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Maximize2 className="size-3.5" />
                            </button>
                          </div>
                          <DesignScreen
                            html={s.html}
                            title={s.name}
                            device={s.device}
                            viewportHeight={180}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                            <tr key={i} className="border-b last:border-0 odd:bg-muted/20">
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

            {((isCodeStage || isHandover) && codeArtifacts) && (
              <div className="flex h-[480px] min-h-0 flex-col border-b">
                {snapshots.length > 0 && (
                  <details className="border-b px-4 py-2">
                    <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">{dict.studio.snapshots} ({snapshots.length})</summary>
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto pr-2">
                      {snapshots.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-3 border-b py-1 text-[11px] last:border-0">
                          <span className="font-mono text-muted-foreground">{s.version}</span>
                          <span className="line-clamp-1 flex-1 text-muted-foreground">{s.diffSummary}</span>
                          <span className="text-muted-foreground">{s.fileCount} {dict.studio.files}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 shrink-0 px-2 text-[11px]"
                            onClick={() => restoreSnapshot(s.id)}
                            disabled={restoringId === s.id}
                          >
                            {restoringId === s.id ? <Loader2 className="size-3 animate-spin" /> : <RotateCcw className="size-3" />}
                            {dict.studio.restore}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
                <div className="min-h-0 flex-1">
                  <CodeWorkspace
                    files={codeArtifacts}
                    activeFile={activeFile}
                    onSelectFile={(f) => {
                      setActiveFile(f);
                      setActiveFix(null);
                    }}
                    dirty={dirtyFiles}
                    onChange={handleFileChange}
                    onSave={(f) => saveFiles([f])}
                    onSaveAll={() => saveFiles([...dirtyFiles])}
                    saving={savingFiles}
                    variant="studio"
                    emptyLabel={dict.studio.emptyFiller}
                    loadingLabel={dict.studio.loadingEditor}
                    editorOverride={
                      activeFix?.suggestedCode && activeFix?.filePath ? (
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
                      ) : undefined
                    }
                    labels={{
                      unsaved: dict.studio.unsavedFiles,
                      save: dict.studio.save,
                      saveAll: dict.studio.saveAll,
                      terminal: dict.studio.terminal,
                      explorer: dict.studio.explorer,
                      preview: dict.studio.preview,
                      saved: dict.studio.allSaved,
                    }}
                  />
                </div>
              </div>
            )}
            </>
            )}

            {/* Chat messages */}
            <div className="min-w-0 space-y-3 p-4">
              {messages.length === 0 && (
                <EmptyState
                  icon={Wand2}
                  description={isAnalysis ? dict.studio.analysisEmpty : isDesign ? dict.studio.designEmpty : isCodeStage ? dict.studio.codeEmpty : dict.studio.handoverEmpty}
                  className="py-8"
                />
              )}
              {messages.map((m) => (
                <div key={m.id} className={`flex min-w-0 gap-2 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <span className="mt-1 flex size-6 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                      <Bot className="size-3.5" />
                    </span>
                  )}
                  <div className={`min-w-0 whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm [overflow-wrap:anywhere] ${m.role === "user" ? "bg-primary text-primary-foreground" : "border bg-card"}`}>
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

          <div className="border-t px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            {/* Mode selector */}
            <div className="mb-1.5 flex items-center gap-2">
              <div className="flex rounded-lg border bg-muted p-0.5">
                <button
                  onClick={() => setChatMode("plan")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chatMode === "plan"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  📋 Plan
                </button>
                <button
                  onClick={() => setChatMode("build")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    chatMode === "build"
                      ? "bg-success text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  🔨 Build
                </button>
              </div>
              {activePlan && chatMode === "build" && (
                <span className="text-[10px] text-success">
                  {activePlan.actions.length} actions ready
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Textarea
                id="chat-input"
                name="chatInput"
                aria-label={dict.studio.chatPlaceholder}
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
                rows={2}
                className="min-h-[3rem] resize-none font-mono text-xs"
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{dict.studio.shortcutHint}</span>
              <Button size="sm" onClick={() => sendPrompt()} disabled={loading || !input.trim()}>
                {loading ? <Loader2 className="animate-spin" /> : <Send className="size-4" />}
                {chatMode === "plan" ? dict.studio.send : "Build"}
              </Button>
            </div>
          </div>
        </section>

        {/* Right: Security & Compliance */}
        <aside className={`flex min-h-0 min-w-0 flex-col border-t md:col-span-2 md:border-l md:border-t-0 lg:col-span-3 ${mobileTab !== "security" ? "max-md:hidden" : ""}`}>
          <div className="flex items-center gap-2 border-b px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ShieldCheck className="size-4" /> Security & Compliance
          </div>

          <div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-4">
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

            {stage.code === "testing" && (
              <SecurityScanPanel
                projectId={project.id}
                hasCode={Object.keys(codeArtifacts ?? {}).length > 0}
                labels={{
                  title: dict.studio.scanTitle,
                  run: dict.studio.scanRun,
                  running: dict.studio.scanRunning,
                  empty: dict.studio.scanEmpty,
                  failed: dict.studio.scanFailed,
                  needCode: dict.studio.scanNeedCode,
                  skipped: dict.studio.scanSkipped,
                }}
              />
            )}

            {(stage.code === "testing" || stage.code === "handover") && (
              <TraceabilityPanel
                projectId={project.id}
                labels={{ title: dict.studio.traceTitle, empty: dict.studio.traceEmpty }}
                onOpenFile={(f) => setActiveFile(f)}
              />
            )}

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

      <Dialog open={activeStepResult !== null} onOpenChange={(open) => { if (!open) { setActiveStepResult(null); setMaximized(false); } }}>
        <DialogContent
          hideClose={fullscreenOpen}
          className={
            maximized
              ? "inset-0 left-0 top-0 h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 p-0 sm:rounded-none"
              : "max-h-[90vh] overflow-y-auto sm:max-w-5xl"
          }
          onEscapeKeyDown={(e) => { if (fullscreenOpen) e.preventDefault(); }}
        >
          {!fullscreenOpen && (
            <DialogHeader>
              <DialogTitle>{activeStepResult ? getStepResultContent(activeStepResult).title : ""}</DialogTitle>
              <DialogDescription>
                {stage.name} — {dict.studio.subSteps}
              </DialogDescription>
            </DialogHeader>
          )}
          <div className={fullscreenOpen ? "h-full min-h-0" : "mt-2"}>
            {activeStepResult && (
              <StepResultDialog
                title={getStepResultContent(activeStepResult).title}
                stageName={stage.name}
                overview={getStepResultContent(activeStepResult).overview}
                visual={getStepResultContent(activeStepResult).visual}
                visualCards={getStepResultContent(activeStepResult).visualCards}
                raw={getStepResultContent(activeStepResult).raw}
                maximized={maximized}
                onToggleMaximize={() => setMaximized((v) => !v)}
                onFullscreenStateChange={handleFullscreenChange}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {showDesignCanvas && (
        <DesignStudioDialog
          projectId={project.id}
          savedScreens={designScreens}
          designPlan={props.designPlan}
          onClose={() => setShowDesignCanvas(false)}
          onSaved={() => router.refresh()}
          labels={{
            title: dict.studio.designStudioTitle,
            promptPlaceholder: dict.studio.designPromptPlaceholder,
            generate: dict.studio.designGenerate,
            generating: dict.studio.designGenerating,
            refine: dict.studio.designRefine,
            refinePlaceholder: dict.studio.designRefinePlaceholder,
            refineHint: dict.studio.designRefineHint,
            refineBusy: dict.studio.designRefineBusy,
            roleLabel: dict.studio.designRole,
            general: dict.studio.designGeneral,
            generateAll: dict.studio.designGenerateAll,
            generateAllBusy: dict.studio.designGenerateAllBusy,
            planTitle: dict.studio.designPlanTitle,
            planEdit: dict.studio.designPlanEdit,
            planDone: dict.studio.designPlanDone,
            planSave: dict.studio.designPlanSave,
            planRegenerate: dict.studio.designPlanRegenerate,
            addRole: dict.studio.designAddRole,
            addPage: dict.studio.designAddPage,
            stale: dict.studio.designStale,
            revise: dict.studio.designRevise,
            keep: dict.studio.designKeep,
            keepAll: dict.studio.designKeepAll,
            discard: dict.studio.designDiscard,
            draft: dict.studio.designDraft,
            empty: dict.studio.designEmpty,
            savedCount: dict.studio.designPages,
            error: dict.studio.designError,
            retry: dict.studio.designRetry,
            confirmDiscard: dict.studio.confirmDiscard,
          }}
        />
      )}

      {designFullscreen && (
        <FullscreenViewer
          key={designFullscreen.id}
          title={designFullscreen.name}
          onClose={() => setDesignFullscreen(null)}
          maximized={designFsMax}
          onToggleMaximize={() => setDesignFsMax((v) => !v)}
        >
          <DesignScreen
            html={designFullscreen.html}
            title={designFullscreen.name}
            device={designFullscreen.device}
            scaleToFit={false}
          />
        </FullscreenViewer>
      )}

      {showRun && codeArtifacts && (
        <RunWorkspace
          projectId={project.id}
          projectName={project.name}
          files={codeArtifacts}
          activeFile={activeFile}
          onSelectFile={(f) => {
            setActiveFile(f);
            setActiveFix(null);
          }}
          dirty={dirtyFiles}
          onChange={handleFileChange}
          onSave={(f) => saveFiles([f])}
          onSaveAll={() => saveFiles([...dirtyFiles])}
          saving={savingFiles}
          onClose={() => setShowRun(false)}
          labels={{
            run: dict.studio.runApp,
            stop: dict.studio.stopApp,
            starting: dict.studio.runStarting,
            running: dict.studio.runRunning,
            error: dict.studio.runError,
            stopped: dict.studio.runStopped,
            notRunning: dict.studio.runNotRunning,
            noLogs: dict.studio.runNoLogs,
            logs: dict.studio.runLogs,
            demoAccount: dict.studio.runDemoAccount,
            terminal: dict.studio.terminal,
            explorer: dict.studio.explorer,
            preview: dict.studio.preview,
            save: dict.studio.save,
            saveAll: dict.studio.saveAll,
            saved: dict.studio.allSaved,
            unsaved: dict.studio.unsavedFiles,
            confirmDiscard: dict.studio.confirmDiscard,
          }}
        />
      )}
      </div>
    );
}
